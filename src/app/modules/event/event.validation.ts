import { z } from 'zod';

const createEventRequestValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    description: z.string({ required_error: 'Description is required' }),
    image: z.string({ required_error: 'Image is required' }),
    date: z.string({ required_error: 'Date is required' }),
    startTime: z.string({ required_error: 'Start time is required' }),
    endTime: z.string({ required_error: 'End time is required' }),
    eventType: z.enum(['SocialEvent', 'CoffeeConnect', 'LunchAndLearn'], {
      required_error: 'Event type is required',
    }),
    maxParticipants: z.number({ required_error: 'Max participants is required' }),
    entryRequirements: z.array(z.string()).optional(),
    isOnline: z.boolean({ required_error: 'isOnline is required' }),
  }),
});

const acceptEventRequestValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    date: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    eventType: z.enum(['SocialEvent', 'CoffeeConnect', 'LunchAndLearn']).optional(),
    isOnline: z.boolean().optional(),
    location: z.string().optional(),
    entryRequirements: z.array(z.string()).optional(),
    maxParticipants: z.number().optional(),
  }),
});

export const EventValidations = {
  createEventRequestValidationSchema,
  acceptEventRequestValidationSchema,
};
