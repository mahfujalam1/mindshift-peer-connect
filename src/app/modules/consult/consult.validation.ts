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

export const ConsultValidations = {
  createConsultValidationSchema,
};
