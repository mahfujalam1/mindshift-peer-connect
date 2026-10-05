import { z } from 'zod';
import {
  CONSULT_LOCATION_SCOPES,
  CONSULT_RADIUS_OPTIONS_KM,
} from './consult.constants';

const createConsultValidationSchema = z.object({
  body: z
    .object({
      issue: z.string({
        required_error: 'Issue / Topic is required',
      }),
      supportNeeded: z.string({
        required_error: 'Support needed details is required',
      }),
      urgency: z.enum(['Normal', 'Urgent']).optional(),
      city: z.string().trim().optional(),
      province: z.string().trim().optional(),
      country: z.string().trim().optional(),
      location: z
        .object({
          type: z.literal('Point').optional(),
          coordinates: z.array(z.number()).length(2).optional(),
        })
        .optional(),
    })
    .passthrough(),
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

const getAllConsultsValidationSchema = z.object({
  query: z
    .object({
      scope: z.enum(CONSULT_LOCATION_SCOPES).optional(),
      radiusInKm: z
        .string()
        .optional()
        .refine(
          (value) =>
            value === undefined ||
            (CONSULT_RADIUS_OPTIONS_KM as readonly number[]).includes(Number(value)),
          {
            message: `radiusInKm must be one of: ${CONSULT_RADIUS_OPTIONS_KM.join(', ')}`,
          }
        ),
    })
    .passthrough(),
});

export const ConsultValidations = {
  createConsultValidationSchema,
  updateConsultValidationSchema,
  getAllConsultsValidationSchema,
};
