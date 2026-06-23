// src/app/modules/call/call.controller.ts
import { Request, Response, NextFunction } from 'express';
import { generateLiveKitToken } from './call.service';
import sendResponse from '../../utilities/sendResponse';
import httpStatus from 'http-status';

export const CallController = {
  /**
   * POST /token
   * Body: { roomName: string }
   * Returns a LiveKit access token for the authenticated user.
   */
  async getToken(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id; // auth middleware attaches user
      const { roomName } = req.body;
      const callType = req.body.callType || 'video';
      console.log(roomName)
      if (!roomName) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          statusCode: httpStatus.BAD_REQUEST,
          message: 'roomName is required',
        });
      }
      const { token, serverUrl, callType: generatedCallType } = await generateLiveKitToken(userId, roomName, callType);
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'LiveKit token generated',
        data: { token, serverUrl, callType: generatedCallType },
      });
    } catch (err) {
      next(err);
    }
  },
};
