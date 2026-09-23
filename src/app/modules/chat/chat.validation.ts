import { z } from 'zod';
import { ALLOWED_MESSAGE_EMOJIS } from './chat.constants';

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

const reactToMessageValidationSchema = z.object({
  body: z.object({
    emoji: z
      .string({ required_error: 'Emoji is required' })
      .refine((value) => (ALLOWED_MESSAGE_EMOJIS as readonly string[]).includes(value), {
        message: `Invalid emoji. Allowed: ${ALLOWED_MESSAGE_EMOJIS.join(' ')}`,
      }),
  }),
});

const messagesAroundValidationSchema = z.object({
  params: z.object({
    conversationId: z.string({ required_error: 'conversationId is required' }),
    messageId: z.string({ required_error: 'messageId is required' }),
  }),
  query: z.object({
    before: z.string().optional(),
    after: z.string().optional(),
  }),
});

const updateChatSettingValidationSchema = z.object({
  body: z
    .object({
      feature: z.enum(['reply', 'reaction']),
      status: z.boolean(),
    })
    .strict(),
});

export const ChatValidations = {
  createConversationValidationSchema,
  updateMessageValidationSchema,
  reactToMessageValidationSchema,
  messagesAroundValidationSchema,
  updateChatSettingValidationSchema,
};
