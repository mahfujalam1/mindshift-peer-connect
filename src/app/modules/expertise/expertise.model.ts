import mongoose, { Schema, Document, Types } from 'mongoose';
import { TExpertise } from './expertise.interface';

const expertiseSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    icon: { type: String, default: null },
  },
  { timestamps: true }
);

const Expertise = mongoose.model<TExpertise & Document>('Expertise', expertiseSchema);

export default Expertise;
