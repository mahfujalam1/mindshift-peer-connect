import { z } from 'zod';

const createConversationValidationSchema = z.object({
  body: z.object({
    partnerId: z.string({
      required_error: 'Partner ID is required',
    }),
  }),
});

const updateMessageValidationSchema = z.object({
  body: z.object({
    text: z
      .string({ required_error: 'Message text is required' })
      .trim()
      .min(1, { message: 'Message text cannot be empty' }),
  }),
});

export const ChatValidations = {
  createConversationValidationSchema,
  updateMessageValidationSchema,
};
