import httpStatus from 'http-status';
import { FilterQuery } from 'mongoose';
import AppError from '../../error/appError';
import { getPublicFileUrl, getUploadedFileUrl } from '../../helper/multer-s3-uploader';
import { ChatAsset } from './chat-asset.model';
import { TChatAsset, TChatAssetType } from './chat-asset.interface';

type TCreateChatAssetPayload = {
  label?: string;
  tags?: string[] | string;
};

type TChatAssetDocument = {
  toObject: () => TChatAsset & { _id?: unknown };
};

const formatChatAssetUrl = (asset: TChatAssetDocument) => {
  const assetObj = asset.toObject();
  return {
    ...assetObj,
    url: getPublicFileUrl(assetObj.url) || assetObj.url,
  };
};

const normalizeTags = (tags: string[] | string | undefined): string[] => {
  if (!tags) {
    return [];
  }

  if (typeof tags === 'string' && tags.trim().startsWith('[')) {
    try {
      const parsedTags = JSON.parse(tags) as unknown;
      if (Array.isArray(parsedTags)) {
        return normalizeTags(parsedTags.map((tag) => String(tag)));
      }
    } catch {
      return [];
    }
  }

  const tagList = Array.isArray(tags)
    ? tags
    : tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

  return Array.from(
    new Set(
      tagList
        .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
        .filter(Boolean)
    )
  );
};

const getAssetType = (mimetype: string): TChatAssetType => {
  return mimetype === 'image/gif' ? 'gif' : 'image';
};

const createChatAssetIntoDB = async (
  payload: TCreateChatAssetPayload,
  file: Express.Multer.File | undefined
) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Chat asset file is required');
  }

  if (!payload.label?.trim()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Label is required');
  }

  const url = getUploadedFileUrl(file);
  if (!url) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Uploaded chat asset URL not found');
  }

  const result = await ChatAsset.create({
    label: payload.label.trim(),
    url,
    type: getAssetType(file.mimetype),
    tags: normalizeTags(payload.tags),
  });

  return formatChatAssetUrl(result);
};

const getAllChatAssetsFromDB = async (query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter: FilterQuery<TChatAsset> = {
    isActive: true,
  };

  if (query.type === 'gif' || query.type === 'image') {
    filter.type = query.type;
  }

  if (typeof query.tag === 'string' && query.tag.trim()) {
    filter.tags = query.tag.trim().replace(/^#/, '').toLowerCase();
  }

  if (typeof query.searchTerm === 'string' && query.searchTerm.trim()) {
    const searchTerm = query.searchTerm.trim();
    filter.$or = [
      { label: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm.replace(/^#/, ''), $options: 'i' } },
    ];
  }

  const [total, result, gifCount, imageCount, tags] = await Promise.all([
    ChatAsset.countDocuments(filter),
    ChatAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChatAsset.countDocuments({ isActive: true, type: 'gif' }),
    ChatAsset.countDocuments({ isActive: true, type: 'image' }),
    ChatAsset.distinct('tags', { isActive: true }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    counts: {
      all: gifCount + imageCount,
      gif: gifCount,
      image: imageCount,
    },
    tags,
    result: result.map((asset) => formatChatAssetUrl(asset)),
  };
};

const getSingleChatAssetFromDB = async (id: string) => {
  const result = await ChatAsset.findOne({ _id: id, isActive: true });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chat asset not found');
  }

  return formatChatAssetUrl(result);
};


const deleteChatAssetFromDB = async (id: string) => {
  const result = await ChatAsset.findOneAndUpdate(
    { _id: id, isActive: true },
    { isActive: false },
    { new: true }
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Chat asset not found');
  }

  return formatChatAssetUrl(result);
};

export const ChatAssetServices = {
  createChatAssetIntoDB,
  getAllChatAssetsFromDB,
  getSingleChatAssetFromDB,
  deleteChatAssetFromDB,
};
