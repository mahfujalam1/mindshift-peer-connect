import httpStatus from "http-status";
import { TUser, TUserRole } from "./user-interface";
import AppError from "../../error/appError";
import User from "./user-model";
import sendEmail from "../../utilities/sendEmail";
import registrationSuccessEmailBody from "../../mailTemplate/registerSucessEmail";
import { JwtPayload } from "jsonwebtoken";
import { PipelineStage, Types } from "mongoose";
import { createToken } from "./user.utils";
import config from "../../config";
import QueryBuilder from "../../builder/QueryBuilder";
import { Follow } from "../follow/follow.model";
import { Profession } from "../profession/profession.model";
import { GoverningBodyServices } from "../governingBody/governingBody.service";
import { GoverningBody } from "../governingBody/governingBody.model";
import { assertUsersCanInteract } from "./user-block.utils";

const referralUserProjection = {
  _id: "$user._id",
  fullName: "$user.fullName",
  email: "$user.email",
  profileImage: "$user.profileImage",
  profession: "$user.profession",
  licenseNo: "$user.licenseNo",
  governingBody: "$user.governingBody",
  phone: "$user.phone",
  bio: "$user.bio",
  country: "$user.country",
  city: "$user.city",
  location: "$user.location",
  isPremium: "$user.isPremium",
};

const generateVerifyCode = (): number => {
  return Math.floor(100000 + Math.random() * 900000);
};

const createUserIntoDB = async (payload: TUser & { playerId?: string }) => {
  const emailExist = await User.findOne({ email: payload.email });
  if (emailExist) {
    throw new AppError(httpStatus.BAD_REQUEST, "This email already exists");
  }

  const profession = await Profession.findById(payload.profession);
  if (!profession) {
    throw new AppError(httpStatus.NOT_FOUND, "Profession not found");
  }

  await GoverningBodyServices.validateGoverningBodyInProfession(
    String(payload.governingBody),
    String(payload.profession)
  );

  const verifyCode = generateVerifyCode();

  const userDataPayload: Partial<TUser> = {
    email: payload.email,
    fullName: payload.fullName,
    password: payload.password,
    profession: payload.profession,
    licenseNo: payload.licenseNo,
    governingBody: payload.governingBody,
    country: payload.country,
    city: payload.city,
    verifyCode,
    codeExpireIn: new Date(Date.now() + 5 * 60000),
    ...(payload.role === "admin" ? { isVerified: true, isActive: true } : {}),
  };

  // Add playerId to the payload if provided
  if (payload.playerId) {
    userDataPayload.playerIds = [payload.playerId];
  }

  sendEmail({
    email: payload.email,
    subject: "Activate Your Account",
    html: registrationSuccessEmailBody(payload.fullName, verifyCode),
  });

  const user = await User.create(userDataPayload);

  return user;
};

const verifyCode = async (email: string, verifyCode: number) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  if (user.codeExpireIn < new Date(Date.now())) {
    throw new AppError(httpStatus.BAD_REQUEST, "Verify code is expired");
  }
  if (verifyCode !== user.verifyCode) {
    throw new AppError(httpStatus.BAD_REQUEST, "Code doesn't match");
  }
  const result = await User.findOneAndUpdate(
    { email: email },
    { isVerified: true, isActive: true },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Server temporary unable please try again letter"
    );
  }

  const jwtPayload = {
    id: String(user!._id),
    email: user!.email,
    role: user!.role as TUserRole,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_screet as string,
    config.jwt_access_expires_in
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_access_screet as string,
    config.jwt_access_expires_in
  );

  return {
    accessToken,
    refreshToken,
  };
};

const resendVerifyCode = async (email: string) => {
  const user = await User.findOne({ email: email });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  const verifyCode = generateVerifyCode();
  const updateUser = await User.findOneAndUpdate(
    { email: email },
    {
      verifyCode: verifyCode,
      codeExpireIn: new Date(Date.now() + 5 * 60000),
    },
    { new: true, runValidators: true }
  );
  if (!updateUser) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Something went wrong . Please again resend the code after a few second"
    );
  }
  sendEmail({
    email: user.email,
    subject: "Activate Your Account",
    html: registrationSuccessEmailBody("Dear", updateUser.verifyCode),
  });
  return null;
};

const getMyProfile = async (userData: JwtPayload) => {
  const result = await User.findOne({ email: userData.email }).select(
    "-password +blockedUsers"
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return result;
};

type TUpdateProfilePayload = Omit<
  Partial<TUser>,
  'profession' | 'governingBody'
> & {
  profession?: string;
  governingBody?: string;
};

const updateProfile = async (
  id: string,
  imageUrl: string | undefined,
  payload: TUpdateProfilePayload
) => {
  // lean() avoids hydrating legacy string values in fields that are now
  // ObjectIds. Those unrelated values must not block a partial profile update.
  const user = await User.findById(id)
    .select('profession governingBody location')
    .lean();
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const professionId = String(payload.profession ?? user.profession);
  const governingBodyId = String(payload.governingBody ?? user.governingBody);

  if (payload.profession) {
    const profession = await Profession.findById(payload.profession);
    if (!profession) {
      throw new AppError(httpStatus.NOT_FOUND, "Profession not found");
    }
  }

  if (payload.profession || payload.governingBody) {
    await GoverningBodyServices.validateGoverningBodyInProfession(
      governingBodyId,
      professionId
    );
  }

  const updateData: Record<string, unknown> = {};

  const allowedFields = [
    'fullName',
    'profession',
    'licenseNo',
    'governingBody',
    'phone',
    'bio',
    'country',
    'city',
  ] as const;

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      updateData[field] = payload[field];
    }
  }

  // Use dot notation so a partial location update does not replace the other
  // nested location values.
  if (payload.location) {
    if (payload.location.address !== undefined) {
      updateData['location.address'] = payload.location.address;
    }
    if (payload.location.coordinates !== undefined) {
      updateData['location.coordinates'] = payload.location.coordinates;
    }
    if (payload.location.radiusInKm !== undefined) {
      updateData['location.radiusInKm'] = payload.location.radiusInKm;
    }
  }

  if (imageUrl) {
    updateData.profileImage = imageUrl;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No profile data provided');
  }

  const result = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .select('-password')
    .lean();

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return result;
};

const blockUser = async (
  currentUserId: string,
  targetUserId: string,
  currentUserRole: TUserRole
) => {
  if (!Types.ObjectId.isValid(targetUserId)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid user ID. Send the user's _id in the URL."
    );
  }

  if (currentUserId === targetUserId) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot block yourself");
  }

  const targetUser = await User.exists({ _id: targetUserId, isDeleted: false });
  if (!targetUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  if (currentUserRole === 'admin') {
    const updatedTarget = await User.findOneAndUpdate(
      { _id: targetUserId, isDeleted: false },
      [{ $set: { isBlocked: { $not: ['$isBlocked'] } } }],
      { new: true }
    ).select('_id isBlocked');

    if (!updatedTarget) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found!");
    }

    return {
      userId: targetUserId,
      blocked: updatedTarget.isBlocked,
      blockType: 'account' as const,
    };
  }

  const currentUser = await User.findById(currentUserId).select('+blockedUsers');
  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const blocked = (currentUser.blockedUsers || []).some(
    (blockedUserId) => blockedUserId.toString() === targetUserId
  );

  await User.findByIdAndUpdate(
    currentUserId,
    blocked
      ? { $pull: { blockedUsers: new Types.ObjectId(targetUserId) } }
      : { $addToSet: { blockedUsers: new Types.ObjectId(targetUserId) } }
  );

  return {
    userId: targetUserId,
    blocked: !blocked,
    blockType: 'user-to-user' as const,
  };
};

const getSingleUser = async (id: string, currentUserId: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid user ID");
  }

  const [user, currentUser] = await Promise.all([
    User.findById(id)
      .select('-password -blockedUsers')
      .lean(),
    User.findById(currentUserId).select('+blockedUsers').lean(),
  ]);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const blocked = (currentUser?.blockedUsers || []).some(
    (blockedUserId) => blockedUserId.toString() === id
  );

  // Some legacy users store names (for example "Doctor") in fields that are
  // now ObjectId references. Populate only valid IDs so those profiles remain
  // readable while preserving their legacy string values.
  const professionId = String(user.profession || '');
  const governingBodyId = String(user.governingBody || '');
  const [profession, governingBody] = await Promise.all([
    Types.ObjectId.isValid(professionId)
      ? Profession.findById(professionId).select('_id name').lean()
      : null,
    Types.ObjectId.isValid(governingBodyId)
      ? GoverningBody.findById(governingBodyId).select('_id name').lean()
      : null,
  ]);

  return {
    ...user,
    profession: Types.ObjectId.isValid(professionId) ? profession : user.profession,
    governingBody: Types.ObjectId.isValid(governingBodyId)
      ? governingBody
      : user.governingBody,
    blocked,
  };
};

const getAllUser = async (query: Record<string, unknown>) => {
  const normalUserQuery = new QueryBuilder(User.find(), query)
    .search(["fullName"])
    .fields()
    .filter()
    .paginate()
    .sort();

  const meta = await normalUserQuery.countTotal();
  const users = await normalUserQuery.modelQuery;

  const result = await Promise.all(
    users.map(async (user: TUser) => {
      return user;
    })
  );

  return {
    meta,
    result,
  };
};

const getReferralUsers = async (
  userId: string,
  matchField: "follower" | "following",
  lookupField: "follower" | "following",
  professionName?: string
) => {
  const user = await User.exists({ _id: userId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        [matchField]: new Types.ObjectId(userId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: lookupField,
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $lookup: {
        from: "professions",
        localField: "user.profession",
        foreignField: "_id",
        as: "professionDetails",
      },
    },
  ];

  const normalizedProfession = professionName?.trim();
  if (
    normalizedProfession &&
    normalizedProfession.toLowerCase() !== "all"
  ) {
    const escapedProfession = normalizedProfession.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    pipeline.push({
      $match: {
        $or: [
          {
            "professionDetails.name": {
              $regex: `^${escapedProfession}$`,
              $options: "i",
            },
          },
          {
            "user.profession": {
              $regex: `^${escapedProfession}$`,
              $options: "i",
            },
          },
        ],
      },
    });
  }

  pipeline.push(
    {
      $project: referralUserProjection,
    },
  );

  return Follow.aggregate(pipeline);
};

const getMyReferralNetwork = async (
  userId: string,
  query: Record<string, unknown>
) => {
  const professionName =
    typeof query.profession === "string" ? query.profession : undefined;

  return getReferralUsers(
    userId,
    "follower",
    "following",
    professionName
  );
};

const getAddedMeToReferralNetwork = async (userId: string) => {
  return getReferralUsers(userId, "following", "follower");
};

const addToReferralNetwork = async (userId: string, targetUserId: string) => {
  if (userId === targetUserId) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot add yourself to your referral network");
  }

  const targetUser = await User.exists({ _id: targetUserId, isDeleted: false });
  if (!targetUser) {
    throw new AppError(httpStatus.NOT_FOUND, "Target user not found");
  }

  await assertUsersCanInteract(userId, targetUserId);

  // Upsert: insert only if not already exists
  await Follow.updateOne(
    {
      follower: new Types.ObjectId(userId),
      following: new Types.ObjectId(targetUserId),
    },
    {
      $setOnInsert: {
        follower: new Types.ObjectId(userId),
        following: new Types.ObjectId(targetUserId),
      },
    },
    { upsert: true }
  );

  return { message: "User added to your referral network successfully" };
};

const removeFromMyReferralNetwork = async (
  userId: string,
  targetUserId: string
) => {
  if (!Types.ObjectId.isValid(targetUserId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid target user ID");
  }

  const result = await Follow.deleteOne({
    follower: new Types.ObjectId(userId),
    following: new Types.ObjectId(targetUserId),
  });

  if (!result.deletedCount) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "User is not in your referral network"
    );
  }

  return { userId: targetUserId, removed: true };
};

const getBrowsableUsersForReferral = async (
  userId: string,
  query: Record<string, unknown>
) => {
  const { search, profession, page = 1, limit = 20 } = query;

  const filter: Record<string, unknown> = {
    _id: { $ne: new Types.ObjectId(userId) },
    isDeleted: false,
    isVerified: true,
    isActive: true,
  };

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
      { country: { $regex: search, $options: 'i' } },
    ];
  }

  if (profession) {
    filter.profession = { $regex: profession, $options: 'i' };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await User.countDocuments(filter);

  const users = await User.find(filter)
    .select('fullName profileImage profession licenseNo governingBody bio city country isPremium')
    .skip(skip)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  return {
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPage: Math.ceil(total / Number(limit)),
    },
    result: users,
  };
};

export const UserServices = {
  createUserIntoDB,
  getMyProfile,
  resendVerifyCode,
  verifyCode,
  updateProfile,
  blockUser,
  getSingleUser,
  getAllUser,
  getMyReferralNetwork,
  getAddedMeToReferralNetwork,
  addToReferralNetwork,
  removeFromMyReferralNetwork,
  getBrowsableUsersForReferral,
};
