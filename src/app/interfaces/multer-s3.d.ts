declare module 'multer-s3' {
  import { StorageEngine } from 'multer';

  type TMulterS3Options = {
    s3: unknown;
    bucket: string;
    contentType?: unknown;
    key: (
      req: Express.Request,
      file: Express.Multer.File,
      callback: (error: Error | null, key?: string) => void
    ) => void;
  };

  type TMulterS3 = {
    (options: TMulterS3Options): StorageEngine;
    AUTO_CONTENT_TYPE: unknown;
  };

  const multerS3: TMulterS3;
  export default multerS3;
}
