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
