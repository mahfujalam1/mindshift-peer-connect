import { z } from 'zod';

const deleteManyNotificationSchema = z.object({
    body: z
        .object({
            ids: z
                .array(z.string().trim().min(1, 'notification id cannot be empty'))
                .min(1, 'at least one notification id is required')
                .max(100, 'at most 100 notifications can be deleted at once'),
        })
        .strict(),
});

export const NotificationValidations = {
    deleteManyNotificationSchema,
};
