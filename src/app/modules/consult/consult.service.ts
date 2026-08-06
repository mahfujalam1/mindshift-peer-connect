import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/appError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Consult } from './consult.model';
import { TConsult } from './consult.interface';
import { Conversation } from '../chat';
import { Follow } from '../follow/follow.model';
import User from '../user/user-model';
import { assertUsersCanInteract } from '../user/user-block.utils';
import { sendNotifications, sendNotification } from '../../helper/notificationHelper';

type TPopulatedAuthor = {
    _id?: unknown;
    profession?: string;
};

type TMaskedAuthor = {
    _id: unknown;
    fullName: string;
    profileImage: null;
    profession: string;
};

type TConsultResponse = Omit<TConsult, 'author'> & {
    author: unknown | TMaskedAuthor;
};

const getAuthorId = (author: unknown) => {
    if (!author) {
        return author;
    }

    if (typeof author === 'object' && '_id' in author) {
        return (author as TPopulatedAuthor)._id;
    }

    return author;
};

const maskAuthor = (author: unknown): TMaskedAuthor => {
    const populatedAuthor = typeof author === 'object' && author ? (author as TPopulatedAuthor) : null;

    return {
        _id: getAuthorId(author),
        fullName: 'Anonymous User',
        profileImage: null,
        profession: populatedAuthor?.profession || '',
    };
};

const createConsultIntoDB = async (userId: string, payload: Partial<TConsult>) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    const consultData = {
        ...payload,
        author: userId,
        status: 'Open',
        location: {
            type: user.location?.type || 'Point',
            coordinates: user.location?.coordinates || [0, 0],
        },
    };
    const result = await Consult.create(consultData);

    // Send Push Notification to users in the same location (e.g., within 50km or author's radius)
    const radius = user.location?.radiusInKm || 50;
    const coordinates = user.location?.coordinates;

    if (coordinates && coordinates.length === 2) {
        const [longitude, latitude] = coordinates;

        const nearbyUsers = await User.find({
            _id: { $ne: userId },
            isDeleted: false,
            isVerified: true,
            'location.coordinates': {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radius / 6371],
                },
            },
        }).select('_id');

        const userIds = nearbyUsers.map((u) => u._id.toString());

        if (userIds.length > 0) {
            await sendNotifications(
                userIds,
                '🤝 New Local Consultation Request',
                `A new consultation request regarding "${payload.issue}" has been posted near you. Can you help?`,
                { type: 'consultation', consultId: result._id }
            );
        }
    } else {
        // Fallback: if author has no location, notify all verified users (or skip based on your preference)
        // Here we notify all just in case
        const allUsers = await User.find({
            _id: { $ne: userId },
            isDeleted: false,
            isVerified: true
        }).select('_id');
        const userIds = allUsers.map((user) => user._id.toString());
        if (userIds.length > 0) {
            await sendNotifications(
                userIds,
                '🤝 New Consultation Request',
                `A new consultation request regarding "${payload.issue}" has been posted.`,
                { type: 'consultation', consultId: result._id }
            );
        }
    }

    return result;
};

const getAllConsults = async (userId: string | undefined, query: Record<string, unknown>) => {
    const { isMyPosts, search, ...restQuery } = query;
    const queryForBuilder = {
        ...restQuery,
        ...(search ? { searchTerm: search } : {}),
    };

    // isMyPosts=true দিলে শুধু আমার posts
    if (isMyPosts === 'true' || isMyPosts === true) {
        if (!userId) {
            throw new AppError(httpStatus.UNAUTHORIZED, 'You must be logged in to view your posts');
        }

        const userObjectId = new Types.ObjectId(userId);
        const consultQuery = new QueryBuilder(
            Consult.find({
                $or: [
                    { author: userObjectId },
                    { connectedWith: userObjectId },
                ],
            }).populate(
                'author',
                'fullName profileImage profession licenseNo governingBody'
            ),
            queryForBuilder
        )
            .search(['issue', 'supportNeeded'])
            .filter()
            .paginate()
            .sort();

        const meta = await consultQuery.countTotal();
        const consults = await consultQuery.modelQuery;

        const result = consults.map((consult) => {
            const consultObj = (consult as any).toObject ? (consult as any).toObject() : (consult as any);
            return {
                ...consultObj,
                isMyPost:
                    consultObj.author?._id?.toString() === userId ||
                    consultObj.author?.toString?.() === userId,
            };
        });

        return { meta, result };
    }

    const consultQuery = new QueryBuilder(
        Consult.find().populate('author', 'fullName profileImage profession licenseNo governingBody'),
        queryForBuilder
    )
        .search(['issue', 'supportNeeded'])
        .filter()
        .paginate()
        .sort();

    const meta = await consultQuery.countTotal();
    const consults = await consultQuery.modelQuery;

    const result = consults.map((consult) => {
        const consultObj = (consult as any).toObject ? (consult as any).toObject() : (consult as any);
        const authorId = getAuthorId(consultObj.author)?.toString();
        const isMyPost = userId ? authorId === userId : false;

        if (!isMyPost) {
            consultObj.author = maskAuthor(consultObj.author);
        }

        return {
            ...consultObj,
            isMyPost,
        };
    });

    return { meta, result };
};

const getSingleConsult = async (id: string, userId?: string) => {
    const consult = await Consult.findById(id).populate('author', 'fullName profileImage profession licenseNo governingBody');
    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    const consultObj = (consult as any).toObject ? (consult as any).toObject() : (consult as any);
    const authorId = getAuthorId(consultObj.author)?.toString();
    const isMyPost = userId ? authorId === userId : false;

    if (!isMyPost) {
        consultObj.author = maskAuthor(consultObj.author);
    }

    return {
        ...consultObj,
        isMyPost,
    };
};

const availableToChat = async (userId: string, consultId: string) => {
    const consult = await Consult.findById(consultId);
    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    if (consult.author.toString() === userId) {
        throw new AppError(httpStatus.BAD_REQUEST, 'You cannot apply to your own consult post');
    }

    await assertUsersCanInteract(userId, consult.author.toString());

    // 1. Add to interestedPeople of consult using atomic update to avoid validation issues
    const updatedConsult = await Consult.findByIdAndUpdate(
        consultId,
        { $addToSet: { interestedPeople: new Types.ObjectId(userId) } },
        { new: true }
    );

    await Follow.updateOne({
        follower: new Types.ObjectId(userId),
        following: consult.author,
    }, {
        $setOnInsert: {
            follower: new Types.ObjectId(userId),
            following: consult.author,
        },
    }, {
        upsert: true,
    });

    const interestedUser = await User.findById(userId).select('fullName');

    await sendNotification(
        consult.author.toString(),
        'Someone is interested!',
        `${interestedUser?.fullName || 'A user'} is available to chat about your consultation request.`,
        { type: 'consultation', consultId: consult._id }
    );

    return updatedConsult;
};

const getInterestedList = async (userId: string, consultId: string) => {
    const consult = await Consult.findById(consultId).populate({
        path: 'interestedPeople',
        select: 'fullName email profileImage profession licenseNo governingBody phone bio country city location isPremium'
    });

    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    if (consult.author.toString() !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized to view the interested list for this post');
    }

    const interestedPeople = consult.interestedPeople || [];

    if (interestedPeople.length === 0) {
        return [];
    }

    // interested people র সব _id collect করো
    const interestedIds = interestedPeople.map((person: any) =>
        person._id.toString()
    );

    // এই post author কে কারা follow করে (followers)
    const followers = await Follow.find({
        following: new Types.ObjectId(userId),
        follower: { $in: interestedIds.map((id: string) => new Types.ObjectId(id)) },
    }).select('follower');

    // এই post author কাদের follow করে (following)
    const followings = await Follow.find({
        follower: new Types.ObjectId(userId),
        following: { $in: interestedIds.map((id: string) => new Types.ObjectId(id)) },
    }).select('following');

    // Set বানাও quick lookup এর জন্য
    const followerSet = new Set(
        followers.map((f) => f.follower.toString())
    );
    const followingSet = new Set(
        followings.map((f) => f.following.toString())
    );

    // প্রতিটা interested person এর object এ connected property add করো
    const result = interestedPeople.map((person: any) => {
        const personObj = person.toObject ? person.toObject() : person;
        const personId = personObj._id.toString();

        const isFollower = followerSet.has(personId);
        const isFollowing = followingSet.has(personId);

        return {
            ...personObj,
            connected: isFollower || isFollowing,
        };
    });

    return result;
};

const connectWithInterestedUser = async (userId: string, consultId: string, interestedUserId: string) => {
    const consult = await Consult.findById(consultId);
    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    if (consult.author.toString() !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Only the consult author can connect with interested users');
    }

    if (!consult.interestedPeople.some((personId) => personId.toString() === interestedUserId)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'This user did not click Available to Chat for this post');
    }

    await assertUsersCanInteract(userId, interestedUserId);

    // Use findByIdAndUpdate to avoid validation issues with unrelated fields
    const updatedConsult = await Consult.findByIdAndUpdate(
        consultId,
        {
            connectedWith: new Types.ObjectId(interestedUserId),
            status: 'Active Now'
        },
        { new: true }
    );

    // Find or Create a Conversation between consult.author and interestedUserId
    let conversation = await Conversation.findOne({
        participants: { $all: [userId, interestedUserId] }
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [userId, interestedUserId]
        });
    }

    // Auto-add interestedUser to the consult author's referral network
    await Follow.updateOne(
        {
            follower: new Types.ObjectId(userId),
            following: new Types.ObjectId(interestedUserId),
        },
        {
            $setOnInsert: {
                follower: new Types.ObjectId(userId),
                following: new Types.ObjectId(interestedUserId),
            },
        },
        { upsert: true }
    );

    const authorUser = await User.findById(userId).select('fullName');

    await sendNotification(
        interestedUserId,
        'Consultation Request Accepted',
        `${authorUser?.fullName || 'The author'} has connected with you regarding their consultation request!`,
        { type: 'consultation', consultId: consult._id, conversationId: conversation._id }
    );

    return {
        consult: updatedConsult,
        conversation,
    };
};

const getMyConsults = async (
    userId: string,
    query: Record<string, unknown>
) => {
    return getAllConsults(userId, {
        ...query,
        isMyPosts: true,
    });
};

export const ConsultServices = {
    createConsultIntoDB,
    getAllConsults,
    getSingleConsult,
    availableToChat,
    getInterestedList,
    connectWithInterestedUser,
    getMyConsults,
};
