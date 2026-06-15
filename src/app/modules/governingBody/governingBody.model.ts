import { Schema, model } from 'mongoose';
import { TGoverningBody } from './governingBody.interface';

const governingBodySchema = new Schema<TGoverningBody>(
  {
    name: { type: String, required: true, trim: true },
    profession: { type: Schema.Types.ObjectId, ref: 'Profession', required: true },
  },
  { timestamps: true }
);

export const GoverningBody = model<TGoverningBody>('GoverningBody', governingBodySchema);
