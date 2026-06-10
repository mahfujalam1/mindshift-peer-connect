import httpStatus from "http-status";
import AppError from "../../error/appError";
import User from "../user/user-model";
import { Invoice } from "./invoice.model";

// ─── Handle RevenueCat Webhook ────────────────────────────────────────────────
const handleRevenueCatWebhook = async (webhookBody: any, authHeader?: string) => {
  // If you set an Authorization header in RevenueCat webhook settings, verify it here
  // if (config.revenuecat_webhook_secret && authHeader !== config.revenuecat_webhook_secret) {
  //   throw new AppError(httpStatus.UNAUTHORIZED, "Invalid authorization header");
  // }

  const { event } = webhookBody;
  if (!event) return { received: true };

  const {
    type,
    app_user_id,
    product_id,
    price,
    currency,
    purchased_at_ms,
    expiration_at_ms,
    transaction_id,
  } = event;

  // INITIAL_PURCHASE or RENEWAL means the user successfully paid
  if (type === "INITIAL_PURCHASE" || type === "RENEWAL") {
    // 1. Make user premium
    await User.findByIdAndUpdate(app_user_id, {
      isPremium: true,
    });

    // 2. Create an invoice record
    await Invoice.create({
      user: app_user_id,
      productId: product_id,
      amount: price || 0,
      currency: currency || "usd",
      status: "Paid",
      transactionId: transaction_id,
      subscriptionStartDate: purchased_at_ms ? new Date(purchased_at_ms) : new Date(),
      subscriptionEndDate: expiration_at_ms ? new Date(expiration_at_ms) : null,
    });
  } else if (type === "EXPIRATION") {
    // When the subscription expires and is not renewed, remove premium access
    await User.findByIdAndUpdate(app_user_id, {
      isPremium: false,
    });
  }

  return { received: true };
};

// ─── Get all invoices for the logged-in user ──────────────────────────────────
const getMyInvoices = async (userId: string) => {
  return await Invoice.find({ user: userId })
    .sort({ createdAt: -1 });
};

// ─── Get a single invoice (user can only see their own) ───────────────────────
const getSingleInvoice = async (invoiceId: string, userId: string) => {
  const invoice = await Invoice.findOne({ _id: invoiceId, user: userId })
    .populate("user", "name email");

  if (!invoice)
    throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");

  return invoice;
};

// ─── Admin: get all invoices ──────────────────────────────────────────────────
const getAllInvoices = async () => {
  return await Invoice.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
};

// ─── Cancel a pending invoice ─────────────────────────────────────────────────
const cancelInvoice = async (invoiceId: string) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice)
    throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");

  if (invoice.status === "Paid")
    throw new AppError(httpStatus.BAD_REQUEST, "Cannot cancel a paid invoice");

  invoice.status = "Cancelled";
  await invoice.save();
  return invoice;
};

export const InvoiceService = {
  handleRevenueCatWebhook,
  getMyInvoices,
  getSingleInvoice,
  getAllInvoices,
  cancelInvoice,
};
