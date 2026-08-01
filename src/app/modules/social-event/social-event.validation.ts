import { z } from 'zod';

const createSocialEventValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    description: z.string({ required_error: 'Description is required' }),
    image: z.string().optional(),
    date: z.string({ required_error: 'Date is required' }),
    location: z.string({ required_error: 'Location is required' }),
    entryRequirements: z.array(z.string()).optional(),
    startTime: z.string({ required_error: 'Start time is required' }),
    endTime: z.string({ required_error: 'End time is required' }),
    timezone: z.string({ required_error: 'Timezone is required' }),
    maxParticipants: z.number().optional(),
  }),
});

const updateSocialEventValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    date: z.string().optional(),
    location: z.string().optional(),
    entryRequirements: z.array(z.string()).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    timezone: z.string().optional(),
    maxParticipants: z.number().optional(),
  }),
});

export const SocialEventValidations = {
  createSocialEventValidationSchema,
  updateSocialEventValidationSchema,
};
