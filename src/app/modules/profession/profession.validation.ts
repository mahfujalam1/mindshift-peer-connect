import { z } from 'zod';

const createProfessionValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
  }),
});

const updateProfessionValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const ProfessionValidations = {
  createProfessionValidationSchema,
  updateProfessionValidationSchema,
};
