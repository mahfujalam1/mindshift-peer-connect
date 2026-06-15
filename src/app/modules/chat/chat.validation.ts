import { z } from 'zod';

const createConversationValidationSchema = z.object({
  body: z.object({
    partnerId: z.string({
      required_error: 'Partner ID is required',
    }),
  }),
});

export const ChatValidations = {
  createConversationValidationSchema,
};
