import { Schema, model } from 'mongoose';
import { TProfession } from './profession.interface';

const professionSchema = new Schema<TProfession>(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const Profession = model<TProfession>('Profession', professionSchema);
