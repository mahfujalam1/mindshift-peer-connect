import httpStatus from 'http-status';
import MetaService from './meta.service';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';

const getDashboardMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.getDashboardMetaData();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard meta data retrieved successfully',
    data: result,
  });
});

const getUserChartData = catchAsync(async (req, res) => {
  const result = await MetaService.getUserChartData(Number(req?.query.year));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User chart data retrieved successfully',
    data: result,
  });
});

const MetaController = {
  getDashboardMetaData,
  getUserChartData,
};

export default MetaController;
