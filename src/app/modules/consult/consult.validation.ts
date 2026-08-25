import { z } from 'zod';

const createConsultValidationSchema = z.object({
  body: z.object({
    issue: z.string({
      required_error: 'Issue / Topic is required',
    }),
    supportNeeded: z.string({
      required_error: 'Support needed details is required',
    }),
    urgency: z.enum(['Normal', 'Urgent']).optional(),
  }),
});

const updateConsultValidationSchema = z.object({
  body: z
    .object({
      issue: z.string().min(1).optional(),
      supportNeeded: z.string().min(1).optional(),
      urgency: z.enum(['Normal', 'Urgent']).optional(),
    })
    .strict(),
});

export const ConsultValidations = {
  createConsultValidationSchema,
  updateConsultValidationSchema,
};
