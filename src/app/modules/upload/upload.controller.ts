/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import catchAsync from '../../utilities/catchAsync';
import sendResponse from '../../utilities/sendResponse';
import { getUploadedFileUrl, getUploadedFilesUrl } from '../../helper/multer-s3-uploader';
import AppError from '../../error/appError';

const uploadImage = catchAsync(async (req, res) => {
  const hasFiles = req.files && (Array.isArray(req.files) ? req.files.length > 0 : Object.keys(req.files).length > 0);
  const hasSingleFile = Boolean(req.file);

  if (!hasFiles && !hasSingleFile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please select at least one image or file to upload');
  }

  let urls: string[] = [];
  let rawFileList: Express.Multer.File[] = [];

  if (hasFiles) {
    urls = getUploadedFilesUrl(req.files as any);
    if (Array.isArray(req.files)) {
      rawFileList = req.files;
    } else if (typeof req.files === 'object') {
      Object.values(req.files).forEach((fileArr) => {
        if (Array.isArray(fileArr)) {
          rawFileList.push(...fileArr);
        }
      });
    }
  } else if (req.file) {
    const url = getUploadedFileUrl(req.file);
    if (url) {
      urls.push(url);
      rawFileList.push(req.file);
    }
  }

  if (urls.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to process uploaded file(s)');
  }

  const fileDetails = rawFileList.map((file) => ({
    name: file.originalname,
    fieldname: file.fieldname,
    url: getUploadedFileUrl(file),
  }));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: urls.length > 1 ? 'Images uploaded successfully' : 'Image uploaded successfully',
    data: {
      url: urls[0],
      urls: urls,
      files: fileDetails,
    },
  });
});

export const UploadControllers = {
  uploadImage,
};
