import { Router } from 'express';
import { uploadAnyFiles } from '../../helper/multer-s3-uploader';
import { UploadControllers } from './upload.controller';

const router = Router();

// Route for image upload (supports single and multiple images under any field name)
router.post('/', uploadAnyFiles(), UploadControllers.uploadImage);
router.post('/image', uploadAnyFiles(), UploadControllers.uploadImage);

export const UploadRoutes = router;
