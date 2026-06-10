// src/app/modules/expertise/expertise.controller.ts
import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import * as ExpertiseService from './expertise.service';

export const ExpertiseController = {
  // POST /expertise
  create: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user.id;
    const { name } = req.body;
    const data = await ExpertiseService.createExpertise(userId, name);
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Expertise created',
      data,
    });
  }),

  // GET /expertise
  list: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user.id;
    const data = await ExpertiseService.getAllExpertise(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Expertise list',
      data,
    });
  }),

  // GET /expertise/:id
  getById: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
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
  update: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
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
  remove: catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    await ExpertiseService.deleteExpertise(id);
    sendResponse(res, {
      statusCode: httpStatus.NO_CONTENT,
      success: true,
      message: 'Expertise deleted',
    });
  }),
};
