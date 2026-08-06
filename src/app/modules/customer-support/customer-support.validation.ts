import { z } from 'zod';

const createCustomerSupportSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).trim().min(1),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(1),
  }),
});

const updateCustomerSupportSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).optional(),
      description: z.string().trim().min(1).optional(),
    })
    .refine((body) => body.title || body.description, {
      message: 'Title or description is required',
    }),
});

const replyCustomerSupportSchema = z.object({
  body: z.object({
    reply: z.string({ required_error: 'Reply is required' }).trim().min(1),
  }),
});

export const CustomerSupportValidations = {
  createCustomerSupportSchema,
  updateCustomerSupportSchema,
  replyCustomerSupportSchema,
};
