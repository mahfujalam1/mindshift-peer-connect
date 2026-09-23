/** Allowed reaction emojis for chat messages */
export const ALLOWED_MESSAGE_EMOJIS = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '🙏',
  '🔥',
  '👏',
] as const;

export type TAllowedMessageEmoji = (typeof ALLOWED_MESSAGE_EMOJIS)[number];

export const isAllowedMessageEmoji = (emoji: string): emoji is TAllowedMessageEmoji =>
  (ALLOWED_MESSAGE_EMOJIS as readonly string[]).includes(emoji);

export const MESSAGE_POPULATE = [
  { path: 'sender', select: 'fullName email profileImage' },
  { path: 'receiver', select: 'fullName email profileImage' },
  { path: 'asset' },
  {
    path: 'replyTo',
    select: 'text file sender createdAt',
    populate: { path: 'sender', select: 'fullName profileImage' },
  },
  { path: 'reactions.user', select: 'fullName profileImage' },
] as const;
