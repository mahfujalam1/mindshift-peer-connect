import httpStatus from 'http-status';
import AppError from '../../error/appError';
import { TEventRequest } from './event.interface';
import { EventRequest } from './event.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { CoffeeConnectServices } from '../coffee-connect/coffee-connect.service';
import { LunchAndLearnServices } from '../lunch-and-learn/lunch-and-learn.service';
import { SocialEventServices } from '../social-event/social-event.service';
import { CoffeeConnect } from '../coffee-connect/coffee-connect.model';
import { LunchAndLearn } from '../lunch-and-learn/lunch-and-learn.model';
import { SocialEvent } from '../social-event/social-event.model';
import { Types } from 'mongoose';

const createEventRequestIntoDB = async (userId: string, payload: TEventRequest) => {
  const result = await EventRequest.create({
    ...payload,
    user: userId,
  });
  return result;
};

const getAllEventRequestsFromDB = async (query: Record<string, unknown>) => {
  const requestQuery = new QueryBuilder(
    EventRequest.find().populate('user'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await requestQuery.modelQuery;
  const meta = await requestQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getSingleEventRequestFromDB = async (id: string) => {
  const result = await EventRequest.findById(id).populate('user');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  }
  return result;
};

const acceptEventRequestInDB = async (requestId: string) => {
  const request = await EventRequest.findById(requestId);
  if (!request) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  }

  if (request.status !== 'Pending') {
    throw new AppError(httpStatus.BAD_REQUEST, `Request is already ${request.status}`);
  }

  // Build event payload from the request
  const eventPayload: any = {
    title: request.title,
    description: request.description,
    image: request.image,
    date: request.date,
    startTime: request.startTime,
    endTime: request.endTime,
    isOnline: request.isOnline,
    maxParticipants: request.maxParticipants,
    ...(request.entryRequirements ? { entryRequirements: request.entryRequirements } : {}),
  };

  if (request.eventType === 'SocialEvent') {
    eventPayload.location = (request as any).location || 'TBA';
  }

  // Delegate to the dedicated module's create function based on eventType
  let event: any;
  if (request.eventType === 'CoffeeConnect') {
    event = await CoffeeConnectServices.createCoffeeConnectIntoDB(eventPayload);
  } else if (request.eventType === 'LunchAndLearn') {
    event = await LunchAndLearnServices.createLunchAndLearnIntoDB(eventPayload);
  } else if (request.eventType === 'SocialEvent') {
    event = await SocialEventServices.createSocialEventIntoDB(eventPayload);
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid event type: ${request.eventType}`);
  }

  // Mark the request as accepted
  await EventRequest.findByIdAndUpdate(requestId, { status: 'Accepted' });

  return event;
};

const rejectEventRequestInDB = async (requestId: string) => {
  const result = await EventRequest.findByIdAndUpdate(requestId, { status: 'Rejected' }, { new: true });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event request not found');
  }
  return result;
};

// Join event — delegates to the specific module's join function based on eventType
const joinEvent = async (eventId: string, userId: string, eventType: string) => {
  if (eventType === 'CoffeeConnect') {
    return await CoffeeConnectServices.joinCoffeeConnectEvent(eventId, userId);
  } else if (eventType === 'LunchAndLearn') {
    return await LunchAndLearnServices.joinLunchAndLearnEvent(eventId, userId);
  } else if (eventType === 'SocialEvent') {
    return await SocialEventServices.joinSocialEvent(eventId, userId);
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid event type: ${eventType}`);
  }
};

// Leave event — delegates to the specific module's leave function based on eventType
const leaveEvent = async (eventId: string, userId: string, eventType: string) => {
  let Model: any;
  if (eventType === 'CoffeeConnect') {
    Model = CoffeeConnect;
  } else if (eventType === 'LunchAndLearn') {
    Model = LunchAndLearn;
  } else if (eventType === 'SocialEvent') {
    Model = SocialEvent;
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid event type: ${eventType}`);
  }

  const event = await Model.findById(eventId);
  if (!event || event.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  const result = await Model.findByIdAndUpdate(
    eventId,
    { $pull: { participants: userId } },
    { new: true }
  );

  return result;
};

// Get my joined events — searches participants array across all 3 models
const getMyJoinedEventsFromDB = async (userId: string, query: Record<string, unknown>) => {
  const userObjectId = new Types.ObjectId(userId);

  // 1. Get counts across all categories (regardless of current filters)
  const [coffeeJoined, lunchJoined, socialJoined] = await Promise.all([
    CoffeeConnect.countDocuments({ participants: userObjectId, isDeleted: false }),
    LunchAndLearn.countDocuments({ participants: userObjectId, isDeleted: false }),
    SocialEvent.countDocuments({ participants: userObjectId, isDeleted: false }),
  ]);

  const counts = {
    CoffeeConnect: coffeeJoined,
    LunchAndLearn: lunchJoined,
    SocialEvent: socialJoined,
    total: coffeeJoined + lunchJoined + socialJoined,
  };

  // 2. Prepare filter condition
  const filterCond: Record<string, unknown> = {
    participants: userObjectId,
    isDeleted: false,
  };

  // available filter: true = not expired (date not past), false = expired
  if (query.available !== undefined) {
    if (query.available === 'true') {
      filterCond.isExpired = false;
    } else if (query.available === 'false') {
      filterCond.isExpired = true;
    }
  }

  // 3. Determine which eventType(s) to query
  let targetType: string | undefined = undefined;
  if (typeof query.eventType === 'string') {
    const val = query.eventType.toLowerCase().replace(/[^a-z]/g, '');
    if (val === 'coffeeconnect' || val === 'coffee') {
      targetType = 'CoffeeConnect';
    } else if (val === 'lunchandlearn' || val === 'lunch') {
      targetType = 'LunchAndLearn';
    } else if (val === 'socialevent' || val === 'social') {
      targetType = 'SocialEvent';
    }
  }

  // 4. Fetch from appropriate collections
  let mergedResults: any[] = [];
  const fetchPromises: Promise<any[]>[] = [];

  if (!targetType || targetType === 'CoffeeConnect') {
    fetchPromises.push(
      CoffeeConnect.find(filterCond)
        .populate('participants')
        .then((docs) => docs.map((doc) => ({ ...doc.toObject(), eventType: 'CoffeeConnect' })))
    );
  }

  if (!targetType || targetType === 'LunchAndLearn') {
    fetchPromises.push(
      LunchAndLearn.find(filterCond)
        .populate('participants')
        .then((docs) => docs.map((doc) => ({ ...doc.toObject(), eventType: 'LunchAndLearn' })))
    );
  }

  if (!targetType || targetType === 'SocialEvent') {
    fetchPromises.push(
      SocialEvent.find(filterCond)
        .populate('participants')
        .then((docs) => docs.map((doc) => ({ ...doc.toObject(), eventType: 'SocialEvent' })))
    );
  }

  const resultsArray = await Promise.all(fetchPromises);
  resultsArray.forEach((arr) => {
    mergedResults = mergedResults.concat(arr);
  });

  // 5. Sort by date / createdAt (newest first)
  mergedResults.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date).getTime();
    const timeB = new Date(b.createdAt || b.date).getTime();
    return timeB - timeA;
  });

  // 6. Pagination
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const paginatedResult = mergedResults.slice(skip, skip + limit);
  const total = mergedResults.length;
  const totalPage = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    counts,
    result: paginatedResult,
  };
};

export const EventServices = {
  createEventRequestIntoDB,
  getAllEventRequestsFromDB,
  getSingleEventRequestFromDB,
  acceptEventRequestInDB,
  rejectEventRequestInDB,
  joinEvent,
  leaveEvent,
  getMyJoinedEventsFromDB,
};
