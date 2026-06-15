import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { ProfessionServices } from './profession.service';

const createProfession = catchAsync(async (req, res) => {
  const result = await ProfessionServices.createProfession(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Profession created successfully',
    data: result,
  });
});

const getAllProfessions = catchAsync(async (req, res) => {
  const result = await ProfessionServices.getAllProfessions(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Professions retrieved successfully',
    data: result,
  });
});

const getSingleProfession = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ProfessionServices.getSingleProfession(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profession retrieved successfully',
    data: result,
  });
});

const updateProfession = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ProfessionServices.updateProfession(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profession updated successfully',
    data: result,
  });
});

const deleteProfession = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ProfessionServices.deleteProfession(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profession deleted successfully',
    data: result,
  });
});

export const ProfessionControllers = {
  createProfession,
  getAllProfessions,
  getSingleProfession,
  updateProfession,
  deleteProfession,
};
