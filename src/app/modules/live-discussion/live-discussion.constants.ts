/** Shared populate paths for live discussion messages */
export const LIVE_MESSAGE_POPULATE = [
  { path: 'sender', select: 'fullName email profileImage' },
  {
    path: 'replyTo',
    select: 'text file sender createdAt',
    populate: { path: 'sender', select: 'fullName profileImage' },
  },
  { path: 'reactions.user', select: 'fullName profileImage' },
] as const;
