import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  default_password: process.env.DEFAULT_PASSWORD,
  jwt_access_screet: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: Number(process.env.EXPIREIN),
  signeture_key: process.env.SINGNETURE_KEY,
  smtp: {
    smtp_host: process.env.SMTP_HOST,
    smtp_port: process.env.SMTP_PORT,
    smtp_service: process.env.SMTP_SERVICE,
    smtp_mail: process.env.SMTP_MAIL,
    smtp_pass: process.env.SMTP_PASS,
    name: process.env.SMTP_NAME,
  },
  stripe: {
    secret_key: process.env.STRIPE_SECRET_KEY,
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    success_url: process.env.STRIPE_SUCCESS_URL,
    cancel_url: process.env.STRIPE_CANCEL_URL,
  },
  // LiveKit configuration
  livekit_api_key: process.env.LIVEKIT_API_KEY,
  livekit_api_secret: process.env.LIVEKIT_API_SECRET,
  livekit_url: process.env.LIVEKIT_URL,
  // Zoom configuration
  zoom_account_id: process.env.ZOOM_ACCOUNT_ID,
  zoom_client_id: process.env.ZOOM_CLIENT_ID,
  zoom_client_secret: process.env.ZOOM_CLIENT_SECRET,
};