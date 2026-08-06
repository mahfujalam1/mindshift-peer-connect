import { Types } from 'mongoose';

export type TCustomerSupportStatus = 'Pending' | 'Replied' | 'Closed';

export type TCustomerSupport = {
  user: Types.ObjectId;
  requesterName: string;
  requesterEmail: string;
  title: string;
  description: string;
  reply?: string;
  repliedBy?: Types.ObjectId;
  repliedAt?: Date;
  status: TCustomerSupportStatus;
};
