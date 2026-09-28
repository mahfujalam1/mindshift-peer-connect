import { z } from 'zod';

const updateLiveMessageValidationSchema = z.object({
  body: z.object({
    text: z.string({ required_error: 'Message text is required' })
      .trim().min(1, 'Message text cannot be empty'),
  }),
});

const reactToLiveMessageValidationSchema = z.object({
  body: z.object({
    emoji: z
      .string({ required_error: 'Emoji is required' })
      .refine((value) => value.trim().length > 0, {
        message: 'Emoji cannot be empty',
      }),
  }),
});

const messagesAroundValidationSchema = z.object({
  params: z.object({
    roomId: z.string({ required_error: 'roomId is required' }),
    messageId: z.string({ required_error: 'messageId is required' }),
  }),
  query: z.object({
    before: z.string().optional(),
    after: z.string().optional(),
  }),
});

export const LiveDiscussionValidations = {
  updateLiveMessageValidationSchema,
  reactToLiveMessageValidationSchema,
  messagesAroundValidationSchema,
};
