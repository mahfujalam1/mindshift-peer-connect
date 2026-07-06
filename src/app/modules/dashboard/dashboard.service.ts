import httpStatus from "http-status";
import { Types } from "mongoose";
import AppError from "../../error/appError";
import User from "../user/user-model";
import { Invoice } from "../invoice/invoice.model";
import { EventRequest } from "../event/event.model";
import { Consult } from "../consult/consult.model";
import { Report } from "../report/report.model";
import { Conversation } from "../chat/chat.model";
import { TChartItem, TOverviewStats } from "./dashboard.interface";

const getOverviewStats = async (year: number): Promise<TOverviewStats> => {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  // 1. Core Counts
  const totalTherapist = await User.countDocuments({ role: "user", isDeleted: false });

  const totalEarningsResult = await Invoice.aggregate([
    { $match: { status: "Paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalEarning = totalEarningsResult.length > 0 ? totalEarningsResult[0].total : 0;

  const totalEvent = await EventRequest.countDocuments();

  const totalConsultations = await Consult.countDocuments();

  // 2. Earnings Monthly Overview
  const earningsByMonth = await Invoice.aggregate([
    {
      $match: {
        status: "Paid",
        createdAt: { $gte: startOfYear, $lt: endOfYear }
      }
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        total: { $sum: "$amount" }
      }
    }
  ]);

  // 3. User Signups Growth Overview
  const signupsByMonth = await User.aggregate([
    {
      $match: {
        role: "user",
        isDeleted: false,
        createdAt: { $gte: startOfYear, $lt: endOfYear }
      }
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        total: { $sum: 1 }
      }
    }
  ]);

  const months: Array<'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec'> = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const totalEarningOverview: TChartItem[] = Array.from({ length: 12 }, (_, index) => {
    const dbMonth = index + 1;
    const match = earningsByMonth.find(item => item._id === dbMonth);
    return {
      month: months[index],
      earning: match ? match.total : 0
    };
  });

  const usersGrowthMatrix: TChartItem[] = Array.from({ length: 12 }, (_, index) => {
    const dbMonth = index + 1;
    const match = signupsByMonth.find(item => item._id === dbMonth);
    return {
      month: months[index],
      totalUsers: match ? match.total : 0
    };
  });

  return {
    totalTherapist,
    totalEarning,
    totalEvent,
    totalConsultation: {
      count: totalConsultations,
      growthPercentage: "1.5%"
    },
    totalEarningOverview,
    usersGrowthMatrix
  };
};

const getTherapistsList = async (query: {
  status?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}) => {
  const { status = "All", searchTerm = "", page = 1, limit = 10 } = query;

  // Calculate quick stats cards
  const totalTherapists = await User.countDocuments({ role: "user", isDeleted: false });
  const pendingTherapists = await User.countDocuments({ role: "user", isDeleted: false, isVerified: false });
  const activeTherapists = await User.countDocuments({ role: "user", isDeleted: false, isVerified: true, isBlocked: false });
  const blockedTherapists = await User.countDocuments({ role: "user", isDeleted: false, isBlocked: true });

  const filter: Record<string, any> = {
    role: "user",
    isDeleted: false
  };

  if (status === "Pending") {
    filter.isVerified = false;
  } else if (status === "Active") {
    filter.isVerified = true;
    filter.isBlocked = false;
  } else if (status === "Blocked") {
    filter.isBlocked = true;
  }

  if (searchTerm) {
    filter.$or = [
      { fullName: { $regex: searchTerm, $options: "i" } },
      { email: { $regex: searchTerm, $options: "i" } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await User.countDocuments(filter);

  const therapists = await User.find(filter)
    .populate("profession", "name")
    .populate("governingBody", "name")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const therapistsWithPosts = await Promise.all(
    therapists.map(async (therapist: any) => {
      const eventCount = await EventRequest.countDocuments({ user: therapist._id });
      const consultCount = await Consult.countDocuments({ author: therapist._id });
      
      const joinedDate = therapist.createdAt
        ? new Date(therapist.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : null;

      const therapistObj = therapist.toObject();
      delete therapistObj.password;
      delete therapistObj.verifyCode;
      delete therapistObj.resetCode;
      delete therapistObj.isResetVerified;
      delete therapistObj.codeExpireIn;
      delete therapistObj.isActive;
      delete therapistObj.isDeleted;
      delete therapistObj.playerIds;
      delete therapistObj.createdAt;
      delete therapistObj.updatedAt;

      return {
        ...therapistObj,
        totalPost: eventCount + consultCount,
        joined: joinedDate
      };
    })
  );

  return {
    stats: {
      totalTherapists,
      pendingTherapists,
      activeTherapists,
      blockedTherapists
    },
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPage: Math.ceil(total / Number(limit))
    },
    result: therapistsWithPosts
  };
};

const updateTherapistBlockStatus = async (userId: string, isBlocked: boolean) => {
  const result = await User.findOneAndUpdate(
    { _id: userId, role: "user", isDeleted: false },
    { isBlocked },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Therapist not found");
  }

  return result;
};

const verifyTherapist = async (userId: string) => {
  const result = await User.findOneAndUpdate(
    { _id: userId, role: "user", isDeleted: false },
    { isVerified: true, isActive: true },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Therapist not found");
  }

  return result;
};

const getEventsList = async (query: {
  status?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}) => {
  const { status = "All", searchTerm = "", page = 1, limit = 10 } = query;

  // Event category counts
  const coffeeConnectEvents = await EventRequest.countDocuments({ eventType: "CoffeeConnect" });
  const socialEvents = await EventRequest.countDocuments({ eventType: "SocialEvent" });
  const lunchAndLearnEvents = await EventRequest.countDocuments({ eventType: "LunchAndLearn" });

  const filter: Record<string, any> = {};

  if (status !== "All") {
    filter.status = status;
  }

  if (searchTerm) {
    filter.title = { $regex: searchTerm, $options: "i" };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await EventRequest.countDocuments(filter);

  const events = await EventRequest.find(filter)
    .populate("user", "fullName email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  return {
    stats: {
      coffeeConnectEvents,
      socialEvents,
      lunchAndLearnEvents
    },
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPage: Math.ceil(total / Number(limit))
    },
    result: events
  };
};

const updateEventRequestStatus = async (eventId: string, status: "Accepted" | "Rejected") => {
  const result = await EventRequest.findByIdAndUpdate(
    eventId,
    { status },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Event request not found");
  }

  return result;
};

const deleteEventRequest = async (eventId: string) => {
  const result = await EventRequest.findByIdAndDelete(eventId);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Event request not found");
  }
  return result;
};

const getReportsList = async (query: {
  status?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}) => {
  const { status = "All", searchTerm = "", page = 1, limit = 10 } = query;

  // Report counts
  const totalReports = await Report.countDocuments();
  const pendingReports = await Report.countDocuments({ status: "Pending" });
  const resolvedReports = await Report.countDocuments({ status: "Resolved" });
  const rejectedReports = await Report.countDocuments({ status: "Rejected" });

  const filter: Record<string, any> = {};

  if (status !== "All") {
    filter.status = status;
  }

  if (searchTerm) {
    filter.$or = [
      { title: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
      { reportType: { $regex: searchTerm, $options: "i" } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Report.countDocuments(filter);

  const reports = await Report.find(filter)
    .populate("reporter", "fullName email profileImage")
    .populate("reportedUser", "fullName email profileImage")
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  return {
    stats: {
      totalReports,
      pendingReports,
      resolvedReports,
      rejectedReports
    },
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPage: Math.ceil(total / Number(limit))
    },
    result: reports
  };
};

const updateReportStatus = async (reportId: string, status: "Resolved" | "Rejected") => {
  const isResolved = status === "Resolved";
  const result = await Report.findByIdAndUpdate(
    reportId,
    { status, isResolved },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Report not found");
  }

  return result;
};

const deleteReport = async (reportId: string) => {
  const result = await Report.findByIdAndDelete(reportId);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Report not found");
  }
  return result;
};

const getChatsList = async (query: {
  status?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
}) => {
  const { status = "All", searchTerm = "", page = 1, limit = 10 } = query;

  // Chat/group metrics
  const totalRooms = await Conversation.countDocuments({ isGroup: false });
  const totalGroups = await Conversation.countDocuments({ isGroup: true });
  const blockedRooms = await Conversation.countDocuments({ isBlocked: true });

  const filter: Record<string, any> = {};

  if (status === "Active") {
    filter.isBlocked = false;
  } else if (status === "Blocked") {
    filter.isBlocked = true;
  }

  if (searchTerm) {
    // Look up users that match the name
    const matchedUsers = await User.find({
      fullName: { $regex: searchTerm, $options: "i" }
    }).select("_id");
    const matchedUserIds = matchedUsers.map(u => u._id);

    filter.$or = [
      { participants: { $in: matchedUserIds } },
      { groupName: { $regex: searchTerm, $options: "i" } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Conversation.countDocuments(filter);

  const rooms = await Conversation.find(filter)
    .populate("participants", "fullName email profileImage profession")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "fullName"
      }
    })
    .skip(skip)
    .limit(Number(limit))
    .sort({ updatedAt: -1 });

  return {
    stats: {
      totalRooms,
      totalGroups,
      blockedRooms
    },
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPage: Math.ceil(total / Number(limit))
    },
    result: rooms
  };
};

const updateChatBlockStatus = async (conversationId: string, isBlocked: boolean) => {
  const result = await Conversation.findByIdAndUpdate(
    conversationId,
    { isBlocked },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Conversation room not found");
  }

  return result;
};

export const DashboardServices = {
  getOverviewStats,
  getTherapistsList,
  updateTherapistBlockStatus,
  verifyTherapist,
  getEventsList,
  updateEventRequestStatus,
  deleteEventRequest,
  getReportsList,
  updateReportStatus,
  deleteReport,
  getChatsList,
  updateChatBlockStatus
};
