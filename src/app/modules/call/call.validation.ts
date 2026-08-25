import { z } from 'zod';

const updateCallSettingSchema = z.object({
  body: z
    .object({
      callType: z.enum(['audio', 'video']),
      status: z.boolean(),
    })
    .strict(),
});

const generateTokenSchema = z.object({
  body: z
    .object({
      roomName: z.string().trim().min(1, 'roomName is required'),
      callType: z.enum(['audio', 'video']).default('video'),
    })
    .strict(),
});

export const CallValidations = {
  updateCallSettingSchema,
  generateTokenSchema,
};
