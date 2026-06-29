// src/app/modules/call/call.service.ts

import { AccessToken } from 'livekit-server-sdk';
import { TrackSource } from '@livekit/protocol';
import config from '../../config';
import httpStatus from 'http-status';
import AppError from '../../error/appError';
import User from '../user/user-model';

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
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to generate LiveKit token'
    );
  }
};