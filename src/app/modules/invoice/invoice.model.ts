import mongoose, { Schema } from "mongoose";
import { TInvoice } from "./invoice.interface";

const invoiceSchema = new Schema<TInvoice>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Cancelled"],
      default: "Paid",
    },
    transactionId: {
      type: String,
      default: null,
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model<TInvoice>("Invoice", invoiceSchema);
