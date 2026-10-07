import httpStatus from 'http-status';
import { PipelineStage, Types } from 'mongoose';
import AppError from '../../error/appError';
import { Consult } from './consult.model';
import { TConsult } from './consult.interface';
import { Conversation } from '../chat';
import { Follow } from '../follow/follow.model';
import User from '../user/user-model';
import { assertUsersCanInteract } from '../user/user-block.utils';
import { sendNotifications, sendNotification } from '../../helper/notificationHelper';
import {
    CONSULT_LOCATION_SCOPES,
    DEFAULT_CONSULT_LOCATION_SCOPE,
    TConsultLocationScope,
} from './consult.constants';

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

const exactMatchRegex = (value: string) =>
    new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

const hasValidCoordinates = (
    coordinates: number[] | undefined | null
): coordinates is [number, number] => {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return false;
    }

    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);

    return (
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        !(lng === 0 && lat === 0)
    );
};

const createConsultIntoDB = async (userId: string, payload: Partial<TConsult>) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    const city = (payload.city?.trim() || user.city?.trim() || 'Unknown');
    const country = (payload.country?.trim() || user.country?.trim() || 'Canada');
    const province = (payload.province?.trim() || user.province?.trim() || null);

    const userCoords = payload.location?.coordinates || user.location?.coordinates;
    const coordinates = hasValidCoordinates(userCoords)
        ? ([
              Number(userCoords[0]),
              Number(userCoords[1]),
          ] as [number, number])
        : ([0, 0] as [number, number]);

    const result = await Consult.create({
        issue: payload.issue,
        supportNeeded: payload.supportNeeded,
        urgency: payload.urgency || 'Normal',
        author: userId,
        status: 'Open',
        city,
        province,
        country,
        location: {
            type: 'Point',
            coordinates,
        },
    });

    // Send Push Notification to nearby / same city users
    const radiusInKm = Number(user.location?.radiusInKm);

    if (hasValidCoordinates(coordinates) && radiusInKm > 0) {
        const [longitude, latitude] = coordinates;

        const nearbyUsers = await User.find({
            _id: { $ne: userId },
            isDeleted: false,
            isVerified: true,
            'location.coordinates': {
                $geoWithin: {
                    $centerSphere: [[longitude, latitude], radiusInKm / 6371],
                },
            },
        }).select('_id');

        const userIds = nearbyUsers.map((u) => u._id.toString());

        if (userIds.length > 0) {
            await sendNotifications(
                userIds,
                'New Local Consultation Request',
                `A new consultation request regarding "${payload.issue}" has been posted near you. Can you help?`,
                { type: 'consultation', consultId: result._id }
            );
        }
    } else {
        const cityCountryUsers = await User.find({
            _id: { $ne: userId },
            isDeleted: false,
            isVerified: true,
            city: exactMatchRegex(city),
            country: exactMatchRegex(country),
        }).select('_id');

        const userIds = cityCountryUsers.map((u) => u._id.toString());
        if (userIds.length > 0) {
            await sendNotifications(
                userIds,
                'New Local Consultation Request',
                `A new consultation request regarding "${payload.issue}" has been posted in ${city}, ${country}. Can you help?`,
                { type: 'consultation', consultId: result._id }
            );
        }
    }

    return result;
};

const AUTHOR_LOOKUP_PIPELINE = [
    {
        $project: {
            fullName: 1,
            profileImage: 1,
            profession: 1,
            licenseNo: 1,
            governingBody: 1,
            city: 1,
            province: 1,
            country: 1,
            location: 1,
        },
    },
];

const formatConsultListItem = (consult: Record<string, any>, userId?: string) => {
    const authorId = getAuthorId(consult.author)?.toString();
    const isMyPost = userId ? authorId === userId : false;
    const authorObj = typeof consult.author === 'object' && consult.author ? (consult.author as Record<string, any>) : {};

    return {
        ...consult,
        city: authorObj.city || consult.city,
        province: authorObj.province || consult.province,
        country: authorObj.country || consult.country,
        author: isMyPost ? consult.author : maskAuthor(consult.author),
        isMyPost,
    };
};

/**
 * isMyPosts=true  → posts where author === request user
 * isMyPosts=false → other users' posts only, filtered by `scope`:
 *   canada   → same country as the viewer
 *   province → same province + country (default; never a radius)
 *   city     → viewer coordinates + radius; falls back to same city + country
 *              when the viewer has no coordinates
 */
const getAllConsults = async (userId: string | undefined, query: Record<string, unknown>) => {
    const {
        isMyPosts,
        search,
        status,
        urgency,
        page: pageQuery,
        limit: limitQuery,
        sort,
        scope: scopeQuery,
        radiusInKm: radiusQuery,
    } = query;

    if (!userId) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You must be logged in to view consultations');
    }

    const page = Number(pageQuery) || 1;
    const limit = Number(limitQuery) || 10;
    const skip = (page - 1) * limit;
    const userObjectId = new Types.ObjectId(userId);

    const wantsMyPosts =
        isMyPosts === true ||
        isMyPosts === 'true' ||
        String(isMyPosts).toLowerCase() === 'true';

    // ========== isMyPosts=true → only my authored posts ==========
    if (wantsMyPosts) {
        const matchFilter: Record<string, unknown> = {
            author: userObjectId,
        };

        if (status) matchFilter.status = status;
        if (urgency) matchFilter.urgency = urgency;
        if (search && String(search).trim()) {
            const searchRegex = new RegExp(String(search).trim(), 'i');
            matchFilter.$or = [{ issue: searchRegex }, { supportNeeded: searchRegex }];
        }

        let sortStage: Record<string, 1 | -1> = { createdAt: -1 };
        if (typeof sort === 'string' && sort.trim()) {
            const order = sort.startsWith('-') ? -1 : 1;
            sortStage = { [sort.replace(/^-/, '')]: order };
        }

        const pipeline: PipelineStage[] = [
            { $match: matchFilter },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'author',
                    pipeline: AUTHOR_LOOKUP_PIPELINE,
                },
            },
            { $unwind: '$author' },
            { $sort: sortStage },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [{ $skip: skip }, { $limit: limit }],
                },
            },
        ];

        const [aggregateResult] = await Consult.aggregate(pipeline);
        const total = aggregateResult?.metadata?.[0]?.total || 0;
        const consults = aggregateResult?.data || [];

        return {
            meta: {
                page,
                limit,
                total,
                totalPage: Math.ceil(total / limit) || 0,
            },
            result: consults.map((consult: Record<string, any>) => ({
                ...consult,
                isMyPost: true,
            })),
        };
    }

    // ========== general feed or others-only posts (all locations) ==========
    const userExists = await User.findById(userId).select('_id').lean();
    if (!userExists) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    const wantsOthersOnly =
        isMyPosts === false ||
        isMyPosts === 'false' ||
        String(isMyPosts).toLowerCase() === 'false';

    const pipeline: PipelineStage[] = [
        {
            $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'author',
                pipeline: AUTHOR_LOOKUP_PIPELINE,
            },
        },
        { $unwind: '$author' },
    ];

    const matchFilter: Record<string, unknown> = {};

    // Only exclude request user's own posts if explicitly requested (isMyPosts=false)
    if (wantsOthersOnly) {
        matchFilter['author._id'] = { $ne: userObjectId };
    }

    if (status) {
        matchFilter.status = status;
    }
    if (urgency) {
        matchFilter.urgency = urgency;
    }
    if (search && String(search).trim()) {
        const searchRegex = new RegExp(String(search).trim(), 'i');
        matchFilter.$or = [{ issue: searchRegex }, { supportNeeded: searchRegex }];
    }

    if (Object.keys(matchFilter).length > 0) {
        pipeline.push({ $match: matchFilter });
    }

    let sortStage: Record<string, 1 | -1> = { createdAt: -1 };
    if (typeof sort === 'string' && sort.trim()) {
        const order = sort.startsWith('-') ? -1 : 1;
        sortStage = { [sort.replace(/^-/, '')]: order };
    }

    pipeline.push(
        { $sort: sortStage },
        {
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [{ $skip: skip }, { $limit: limit }],
            },
        }
    );

    const [aggregateResult] = await Consult.aggregate(pipeline);
    const total = aggregateResult?.metadata?.[0]?.total || 0;
    const consults = aggregateResult?.data || [];

    return {
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit) || 0,
            scope: (scopeQuery as TConsultLocationScope) || 'all',
        },
        result: consults.map((consult: Record<string, any>) =>
            formatConsultListItem(consult, userId)
        ),
    };
};

const getSingleConsult = async (id: string, userId?: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid consult ID');
    }

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
    if (!Types.ObjectId.isValid(consultId)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid consult ID');
    }

    const consult = await Consult.findById(consultId);
    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    if (consult.author.toString() === userId) {
        throw new AppError(httpStatus.BAD_REQUEST, 'You cannot apply to your own consult post');
    }

    await assertUsersCanInteract(userId, consult.author.toString());

    // Showing interest now also connects both users and starts their conversation.
    const updatedConsult = await Consult.findByIdAndUpdate(
        consultId,
        {
            $addToSet: { interestedPeople: new Types.ObjectId(userId) },
            $set: {
                connectedWith: new Types.ObjectId(userId),
                status: 'Active Now',
            },
        },
        { new: true }
    );

    let conversation = await Conversation.findOne({
        participants: { $all: [userId, consult.author.toString()] },
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [userId, consult.author],
        });
    }

    await Promise.all([
        Follow.updateOne({
            follower: new Types.ObjectId(userId),
            following: consult.author,
        }, {
            $setOnInsert: {
                follower: new Types.ObjectId(userId),
                following: consult.author,
            },
        }, {
            upsert: true,
        }),
        Follow.updateOne({
            follower: consult.author,
            following: new Types.ObjectId(userId),
        }, {
            $setOnInsert: {
                follower: consult.author,
                following: new Types.ObjectId(userId),
            },
        }, {
            upsert: true,
        }),
    ]);

    const interestedUser = await User.findById(userId).select('fullName');

    await sendNotification(
        consult.author.toString(),
        'Someone is interested!',
        `${interestedUser?.fullName || 'A user'} is available to chat about your consultation request.`,
        {
            type: 'consultation',
            consultId: consult._id,
            conversationId: conversation._id,
        },
    );

    return {
        consult: updatedConsult,
        conversation,
    };
};

const getInterestedList = async (userId: string, consultId: string) => {
    if (!Types.ObjectId.isValid(consultId)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid consult ID');
    }

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

const updateConsultIntoDB = async (
    userId: string,
    consultId: string,
    payload: Pick<Partial<TConsult>, 'issue' | 'supportNeeded' | 'urgency'>
) => {
    if (!Types.ObjectId.isValid(consultId)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid consult ID');
    }

    const consult = await Consult.findById(consultId);
    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    if (consult.author.toString() !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Only the consult author can update this post');
    }

    return Consult.findByIdAndUpdate(
        consultId,
        payload,
        { new: true, runValidators: true }
    );
};

const deleteConsultFromDB = async (userId: string, consultId: string) => {
    if (!Types.ObjectId.isValid(consultId)) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid consult ID');
    }

    const consult = await Consult.findById(consultId);
    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    if (consult.author.toString() !== userId) {
        throw new AppError(httpStatus.FORBIDDEN, 'Only the consult author can delete this post');
    }

    return Consult.findByIdAndDelete(consultId);
};

const getMyConsults = async () => {
    const result = await Consult.find()
        .sort({ createdAt: -1 })
        .limit(3);

    return { result };
};

export const ConsultServices = {
    createConsultIntoDB,
    getAllConsults,
    getSingleConsult,
    availableToChat,
    getInterestedList,
    updateConsultIntoDB,
    deleteConsultFromDB,
    getMyConsults,
};
