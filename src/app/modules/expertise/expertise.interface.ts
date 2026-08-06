// src/app/modules/expertise/expertise.interface.ts
export type TExpertise = {
  _id?: string;
  name: string;
  user: string; // reference to User _id
  icon?: string;
};
