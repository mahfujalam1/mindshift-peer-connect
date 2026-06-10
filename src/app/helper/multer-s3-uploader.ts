/* eslint-disable @typescript-eslint/no-explicit-any */
import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { Request } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';

dotenv.config();

type TS3File = Express.Multer.File & {
    bucket?: string;
    key?: string;
    location?: string;
};

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
});

const getNormalizedCloudFrontUrl = () => {
    const cloudFrontUrl = process.env.CLOUDFRONT_URL?.trim();
    if (!cloudFrontUrl) {
        return undefined;
    }

    const urlWithProtocol = /^https?:\/\//i.test(cloudFrontUrl)
        ? cloudFrontUrl
        : `https://${cloudFrontUrl}`;

    return urlWithProtocol.replace(/\/$/, '');
};

const getS3KeyFromUrl = (fileUrl: string) => {
    const trimmedUrl = fileUrl.trim();

    if (!/^https?:\/\//i.test(trimmedUrl)) {
        return trimmedUrl.replace(/^\/+/, '');
    }

    try {
        const parsedUrl = new URL(trimmedUrl);
        const cloudFrontUrl = getNormalizedCloudFrontUrl();
        const cloudFrontHost = cloudFrontUrl ? new URL(cloudFrontUrl).hostname : '';
        const bucketName = process.env.AWS_S3_BUCKET_NAME;

        if (parsedUrl.hostname === cloudFrontHost) {
            return parsedUrl.pathname.replace(/^\/+/, '');
        }

        const isConfiguredBucketUrl =
            bucketName &&
            (
                parsedUrl.hostname === `${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com` ||
                parsedUrl.hostname === `${bucketName}.s3.amazonaws.com`
            );

        if (isConfiguredBucketUrl) {
            return parsedUrl.pathname.replace(/^\/+/, '');
        }
    } catch {
        return undefined;
    }

    return undefined;
};

export const getPublicFileUrl = (fileUrl: string | null | undefined) => {
    if (!fileUrl) {
        return fileUrl;
    }

    const cloudFrontUrl = getNormalizedCloudFrontUrl();
    if (!cloudFrontUrl) {
        return fileUrl;
    }

    const s3Key = getS3KeyFromUrl(fileUrl);
    return s3Key ? `${cloudFrontUrl}/${s3Key}` : fileUrl;
};

const allowedFieldnames = [
    'profileImage',
    'chat_asset',
    'asset_image',
    'chat_file',
    'file',
];

const imageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
];

const chatFileMimeTypes = [
    ...imageMimeTypes,
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain',
    'text/csv',
    'video/mp4',
    'video/quicktime',
    'video/mpeg',
    'video/ogg',
    'video/webm',
    'video/x-msvideo',
    'video/x-matroska',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
];

const getUploadFolder = (fieldname: string) => {
    if (fieldname === 'profileImage' || fieldname === 'profileImage') {
        return 'uploads/images/profile';
    }

    if (fieldname === 'chat_asset' || fieldname === 'asset_image') {
        return 'uploads/images/chat_assets';
    }

    if (fieldname === 'chat_file' || fieldname === 'file') {
        return 'uploads/chat/files';
    }

    return 'uploads';
};

const sanitizeFileName = (fileName: string) => {
    return fileName
        .replace(/\s+/g, '_')
        .replace(/[^\w.-]+/g, '');
};

const isAllowedFile = (file: Express.Multer.File) => {
    if (!allowedFieldnames.includes(file.fieldname)) {
        return false;
    }

    if (file.fieldname === 'chat_file' || file.fieldname === 'file') {
        return chatFileMimeTypes.includes(file.mimetype);
    }

    return imageMimeTypes.includes(file.mimetype);
};

const fileFilter = (req: Request, file: any, cb: any) => {
    if (isAllowedFile(file)) {
        cb(null, true);
        return;
    }

    cb(new Error('Invalid file type or fieldname'));
};

const storage = multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_NAME || 'your-bucket-name',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
        const uploadFolder = getUploadFolder(file.fieldname);
        const sanitizedOriginalName = sanitizeFileName(file.originalname);
        const fileName = `${Date.now()}-${sanitizedOriginalName}`;

        cb(null, `${uploadFolder}/${fileName}`);
    },
});

export const uploadFile = () => {
    return multer({
        storage,
        fileFilter,
        limits: {
            fileSize: 50 * 1024 * 1024,
        },
    }).fields([
        { name: 'profileImage', maxCount: 1 },
        { name: 'chat_asset', maxCount: 1 },
        { name: 'asset_image', maxCount: 1 },
        { name: 'chat_file', maxCount: 1 },
        { name: 'file', maxCount: 1 },
    ]);
};

export const getUploadedFileUrl = (file: Express.Multer.File | undefined) => {
    const s3File = file as TS3File | undefined;

    if (!s3File) {
        return undefined;
    }

    const cloudFrontUrl = getNormalizedCloudFrontUrl();
    if (cloudFrontUrl && s3File.key) {
        return `${cloudFrontUrl}/${s3File.key}`;
    }

    if (process.env.AWS_S3_BUCKET_NAME && process.env.AWS_REGION && s3File.key) {
        return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3File.key}`;
    }

    if (s3File.location) {
        return s3File.location;
    }

    return undefined;
};

export const getUploadedFileKey = (file: Express.Multer.File | undefined) => {
    return (file as TS3File | undefined)?.key;
};

export const getCloudFrontUrl = (s3FilePath: string): string => {
    const cloudFrontUrl = getNormalizedCloudFrontUrl();
    return `${cloudFrontUrl}/${s3FilePath}`;
};
