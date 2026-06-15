import { Types } from 'mongoose';
import { TProfession } from '../profession/profession.interface';

export type TGoverningBody = {
  _id?: string;
  name: string;
  profession: Types.ObjectId | TProfession;
};
