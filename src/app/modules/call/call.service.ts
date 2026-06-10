// src/app/modules/call/call.service.ts
import { AccessToken } from 'livekit-server-sdk';
import config from '../../config';
import httpStatus from 'http-status';
import AppError from '../../error/appError';

/**
 * Generate a LiveKit access token for a user to join a specific room.
 * @param userId - The ID of the user (will be used as the token's identity).
 * @param roomName - The name of the LiveKit room (e.g., conversationId).
 */
export const generateLiveKitToken = async (userId: string, roomName: string) => {
  try {
    const apiKey = config.livekit_api_key;
    const apiSecret = config.livekit_api_secret;
    const serverUrl = config.livekit_url;

    if (!apiKey || !apiSecret || !serverUrl) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'LiveKit configuration missing');
    }

    // AccessToken from livekit-server-sdk expects the apiKey, apiSecret and optionally serverUrl for validation.
    const at = new AccessToken(apiKey, apiSecret, {
      // token expires in a reasonable duration (seconds). Convert milliseconds from config to seconds.
      ttl: config.jwt_access_expires_in ? `${Math.floor(config.jwt_access_expires_in / 1000)}s` : '6h',
      // Optional: set region or other metadata
      // metadata can contain custom data, we’ll store the userId again
      metadata: JSON.stringify({ userId }),
    });
    // Log token creation steps for debugging

    // Grant permission to join the requested room for both publishing and subscribing.
    const grant = at.addGrant({
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      // Optional: enable screen sharing, etc.
      // canPublishData: true,
    });
    console.log(grant)

    // Set the identity of this token to the userId (unique per participant)
    at.identity = userId;

    const token = await at.toJwt();
    return { token, serverUrl };
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate video call token');
  }
};
