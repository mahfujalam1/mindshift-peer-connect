import { z } from 'zod';
import { ALLOWED_MESSAGE_EMOJIS } from '../chat/chat.constants';

const reactToLiveMessageValidationSchema = z.object({
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
    roomId: z.string({ required_error: 'roomId is required' }),
    messageId: z.string({ required_error: 'messageId is required' }),
  }),
  query: z.object({
    before: z.string().optional(),
    after: z.string().optional(),
  }),
});

export const LiveDiscussionValidations = {
  reactToLiveMessageValidationSchema,
  messagesAroundValidationSchema,
};
