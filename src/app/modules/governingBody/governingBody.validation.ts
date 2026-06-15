import { z } from 'zod';

const createGoverningBodyValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
    profession: z.string({
      required_error: 'Profession ID is required',
    }),
  }),
});

const updateGoverningBodyValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    profession: z.string().optional(),
  }),
});

export const GoverningBodyValidations = {
  createGoverningBodyValidationSchema,
  updateGoverningBodyValidationSchema,
};
