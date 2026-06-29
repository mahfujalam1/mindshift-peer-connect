import { z } from 'zod';

const createGoverningBodyValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
    parentId: z.string({
      required_error: 'Profession ID (parentId) is required',
    }),
  }),
});

const updateGoverningBodyValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    parentId: z.string().optional(),
  }),
});

export const GoverningBodyValidations = {
  createGoverningBodyValidationSchema,
  updateGoverningBodyValidationSchema,
};
