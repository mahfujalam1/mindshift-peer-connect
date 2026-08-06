// src/app/modules/expertise/expertise.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { getUploadedFileUrl } from '../../helper/multer-s3-uploader';
import * as ExpertiseService from './expertise.service';

export const ExpertiseController = {
  // POST /expertise
  create: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { files } = req as any;

    let iconUrl;
    if (files && !Array.isArray(files)) {
      const icon = files.icon?.[0];
      iconUrl = getUploadedFileUrl(icon);
    }

    const payload = { ...req.body };
    if (iconUrl) {
      payload.icon = iconUrl;
    }

    const data = await ExpertiseService.createExpertise(userId, payload);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Expertise created successfully',
      data,
    });
  }),

  // GET /expertise
  list: catchAsync(async (req: Request, res: Response) => {
    const data = await ExpertiseService.getAllExpertise();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expertise list',
      data,
    });
  }),

  // GET /expertise/admin-expertise
  getAdminExpertise: catchAsync(async (req: Request, res: Response) => {
    const data = await ExpertiseService.getAdminExpertise();
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Admin expertise filters retrieved successfully',
      data,
    });
  }),

  // GET /expertise/my-expertise
  getMyExpertise: catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.id;
    const data = await ExpertiseService.getMyExpertise(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'My expertise list',
      data,
    });
  }),

  // GET /expertise/:id
  getById: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await ExpertiseService.getExpertiseById(id);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expertise details',
      data,
    });
  }),

  // PATCH /expertise/:id
  update: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    const data = await ExpertiseService.updateExpertise(id, name);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expertise updated',
      data,
    });
  }),

  // DELETE /expertise/:id
  remove: catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await ExpertiseService.deleteExpertise(id);
    sendResponse(res, {
      statusCode: httpStatus.NO_CONTENT,
      success: true,
      message: 'Expertise deleted',
    });
  }),
};
