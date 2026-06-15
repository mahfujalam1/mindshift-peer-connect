import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { GoverningBodyServices } from './governingBody.service';

const createGoverningBody = catchAsync(async (req, res) => {
  const result = await GoverningBodyServices.createGoverningBody(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Governing Body created successfully',
    data: result,
  });
});

const getAllGoverningBodies = catchAsync(async (req, res) => {
  const result = await GoverningBodyServices.getAllGoverningBodies(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Governing Bodies retrieved successfully',
    data: result,
  });
});

const getSingleGoverningBody = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await GoverningBodyServices.getSingleGoverningBody(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Governing Body retrieved successfully',
    data: result,
  });
});

const getGoverningBodiesByProfession = catchAsync(async (req, res) => {
  const { professionId } = req.params;
  const result = await GoverningBodyServices.getGoverningBodiesByProfession(professionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Governing Bodies retrieved successfully by profession',
    data: result,
  });
});

const updateGoverningBody = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await GoverningBodyServices.updateGoverningBody(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Governing Body updated successfully',
    data: result,
  });
});

const deleteGoverningBody = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await GoverningBodyServices.deleteGoverningBody(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Governing Body deleted successfully',
    data: result,
  });
});

export const GoverningBodyControllers = {
  createGoverningBody,
  getAllGoverningBodies,
  getSingleGoverningBody,
  getGoverningBodiesByProfession,
  updateGoverningBody,
  deleteGoverningBody,
};
