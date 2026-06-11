import { z } from 'zod';

const createReportValidationSchema = z.object({
  body: z.object({
    reportedUser: z.string({ required_error: 'Reported user ID is required' }),
    title: z.string({ required_error: 'Title is required' }),
    description: z.string({ required_error: 'Description is required' }),
  }),
});

export const ReportValidations = {
  createReportValidationSchema,
};
