import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../error/appError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Consult } from './consult.model';
import { TConsult } from './consult.interface';
import { Conversation } from '../chat';
import { Follow } from '../follow/follow.model';

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
    const consultData = {
        ...payload,
        author: userId,
        status: 'Open',
    };
    const result = await Consult.create(consultData);
    return result;
};

const getAllConsults = async (query: Record<string, unknown>) => {
    const consultQuery = new QueryBuilder(
        Consult.find().populate('author', 'fullName profileImage profession licenseNo governingBody'),
        query
    )
        .search(['issue', 'supportNeeded'])
        .filter()
        .paginate()
        .sort();

    const meta = await consultQuery.countTotal();
    const consults = await consultQuery.modelQuery;

    const result = consults.map((consult) => {
        const consultObj = consult.toObject() as TConsultResponse;
        consultObj.author = maskAuthor(consultObj.author);
        return consultObj;
    });

    return {
        meta,
        result,
    };
};

const getSingleConsult = async (id: string) => {
    const consult = await Consult.findById(id).populate('author', 'fullName profileImage profession licenseNo governingBody');
    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    const consultObj = consult.toObject() as TConsultResponse;
    consultObj.author = maskAuthor(consultObj.author);
    return consultObj;
};

const availableToChat = async (userId: string, consultId: string) => {
    const consult = await Consult.findById(consultId);
    if (!consult) {
        throw new AppError(httpStatus.NOT_FOUND, 'Consult post not found');
    }

    if (consult.author.toString() === userId) {
        throw new AppError(httpStatus.BAD_REQUEST, 'You cannot apply to your own consult post');
    }

    // 1. Add to interestedPeople of consult
    if (!consult.interestedPeople.some((personId) => personId.toString() === userId)) {
        consult.interestedPeople.push(new Types.ObjectId(userId));
        await consult.save();
    }

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

    return consult;
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

    return consult.interestedPeople || [];
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

    consult.connectedWith = new Types.ObjectId(interestedUserId);
    consult.status = 'Active Now';
    await consult.save();

    // Find or Create a Conversation between consult.author and interestedUserId
    let conversation = await Conversation.findOne({
        participants: { $all: [userId, interestedUserId] }
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [userId, interestedUserId]
        });
    }

    return {
        consult,
        conversation,
    };
};

export const ConsultServices = {
    createConsultIntoDB,
    getAllConsults,
    getSingleConsult,
    availableToChat,
    getInterestedList,
    connectWithInterestedUser,
};
