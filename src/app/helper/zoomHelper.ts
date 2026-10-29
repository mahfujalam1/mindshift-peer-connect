import axios from 'axios';
import config from '../config';

let cachedAccessToken: string | null = null;
let accessTokenExpiresAt = 0;
let accessTokenRequest: Promise<string> | null = null;

const getZoomAccessToken = async () => {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt) {
    return cachedAccessToken;
  }

  if (accessTokenRequest) {
    return accessTokenRequest;
  }

  accessTokenRequest = (async () => {
    const { zoom_account_id, zoom_client_id, zoom_client_secret } = config;

    const auth = Buffer.from(
      `${zoom_client_id}:${zoom_client_secret}`
    ).toString('base64');

    try {
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        null,
        {
          params: {
            grant_type: 'account_credentials',
            account_id: zoom_account_id,
          },
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      cachedAccessToken = response.data.access_token;
      const expiresInSeconds = Number(response.data.expires_in) || 3600;
      accessTokenExpiresAt = Date.now() + Math.max(expiresInSeconds - 60, 60) * 1000;

      return cachedAccessToken as string;
    } catch (err: any) {
      const reason = err?.response?.data?.reason || err?.response?.data?.message || err?.response?.data?.error || err.message;
      throw new Error(`Zoom Auth Error: ${reason}`);
    }
  })();

  try {
    return await accessTokenRequest;
  } finally {
    accessTokenRequest = null;
  }
};

export const createZoomMeeting = async (
  title: string,
  startTime: string,  // Local datetime string: "YYYY-MM-DDTHH:mm:ss" (NO timezone offset)
  duration: number,
  timezone: string    // IANA timezone, e.g. "America/Toronto"
) => {
  const accessToken = await getZoomAccessToken();

  try {
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: title,
        type: 2, // Scheduled meeting
        start_time: startTime, // Local time in the specified timezone (no Z suffix)
        duration: duration,    // in minutes
        timezone: timezone,    // IANA timezone — Zoom uses this to interpret start_time correctly
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: false,
          waiting_room: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      id: response.data.id,
      password: response.data.password,
      join_url: response.data.join_url,
      start_url: response.data.start_url,
    };
  } catch (err: any) {
    const reason = err?.response?.data?.message || err?.response?.data?.reason || err.message;
    throw new Error(`Zoom Meeting Creation Error: ${reason}`);
  }
};
