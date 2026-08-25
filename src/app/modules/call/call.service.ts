// src/app/modules/call/call.service.ts

import { AccessToken } from 'livekit-server-sdk';
import { TrackSource } from '@livekit/protocol';
import config from '../../config';
import httpStatus from 'http-status';
import AppError from '../../error/appError';
import User from '../user/user-model';
import CallSetting from './call-setting.model';
import { TCallType } from './call-setting.interface';

const defaultSettings = [
  { callType: 'audio' as const, status: true },
  { callType: 'video' as const, status: true },
];

export const getCallSettings = async () => {
  const savedSettings = await CallSetting.find({}).lean();
  const settings = defaultSettings.map((defaultSetting) =>
    savedSettings.find((item) => item.callType === defaultSetting.callType) ||
    defaultSetting,
  );

  return {
    audio: settings.find((item) => item.callType === 'audio')!.status,
    video: settings.find((item) => item.callType === 'video')!.status,
  };
};

export const updateCallSetting = async (
  callType: TCallType,
  status: boolean,
) =>
  CallSetting.findOneAndUpdate(
    { callType },
    { $set: { status } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

export const generateLiveKitToken = async (
  userId: string,
  roomName: string,
  callType: 'audio' | 'video' = 'video'
) => {
  try {
    if (!userId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'userId is required');
    }

    if (!roomName) {
      throw new AppError(httpStatus.BAD_REQUEST, 'roomName is required');
    }

    const callSettings = await getCallSettings();
    if (!callSettings[callType]) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `${callType} call is currently disabled`,
      );
    }

    const user = await User.findById(userId).select('fullName name profileImage');

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    const publishSources =
      callType === 'audio'
        ? [TrackSource.MICROPHONE]
        : [TrackSource.CAMERA, TrackSource.MICROPHONE];

    const accessToken = new AccessToken(
      config.livekit_api_key!,
      config.livekit_api_secret!,
      {
        identity: String(userId),
        name:
          (user as any).fullName ||
          (user as any).name ||
          'Unknown User',
        metadata: JSON.stringify({
          userId: String(userId),
          profileImage: (user as any).profileImage || '',
        }),
        ttl: '6h',
      }
    );

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canSubscribe: true,
      canPublishSources: publishSources,
      canPublishData: true,
    });

    const token = await accessToken.toJwt();

    return {
      token,
      serverUrl: config.livekit_url,
      callType,
    };
  } catch (error) {
    console.error('LiveKit Error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to generate LiveKit token'
    );
  }
};
