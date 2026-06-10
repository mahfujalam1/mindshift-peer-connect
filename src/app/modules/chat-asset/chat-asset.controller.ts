import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { ChatAssetServices } from './chat-asset.service';

type TChatAssetFiles = {
  chat_asset?: Express.Multer.File[];
  asset_image?: Express.Multer.File[];
};

const createChatAsset = catchAsync(async (req, res) => {
  const files = req.files as TChatAssetFiles | undefined;
  const file = files?.chat_asset?.[0] || files?.asset_image?.[0];
  const result = await ChatAssetServices.createChatAssetIntoDB(req.body, file);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Chat asset created successfully',
    data: result,
  });
});

const getAllChatAssets = catchAsync(async (req, res) => {
  const result = await ChatAssetServices.getAllChatAssetsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Chat assets retrieved successfully',
    data: result,
  });
});

const getSingleChatAsset = catchAsync(async (req, res) => {
  const result = await ChatAssetServices.getSingleChatAssetFromDB(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Chat asset retrieved successfully',
    data: result,
  });
});

export const ChatAssetControllers = {
  createChatAsset,
  getAllChatAssets,
  getSingleChatAsset,
};
