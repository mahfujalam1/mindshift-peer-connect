import { Types } from "mongoose";

export type TInvoiceStatus = "Pending" | "Paid" | "Failed" | "Cancelled";

export type TInvoice = {
  user: Types.ObjectId;
  productId: string;
  amount?: number;
  currency?: string;                    // "usd", "bdt" etc.
  status: TInvoiceStatus;
  transactionId?: string;               // RevenueCat Transaction ID
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date | null;    // Premium = calculated
  createdAt?: Date;
  updatedAt?: Date;
};
