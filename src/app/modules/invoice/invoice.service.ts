import httpStatus from "http-status";
import AppError from "../../error/appError";
import User from "../user/user-model";
import { Invoice } from "./invoice.model";
import config from "../../config";

const PREMIUM_ENTITLEMENT_ID = "Premium";
const HANDLED_REVENUECAT_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "UNCANCELLATION",
]);

type RevenueCatWebhookBody = {
  event?: {
    id?: string;
    type?: string;
    app_user_id?: string;
    product_id?: string;
    price?: number;
    currency?: string;
    purchased_at_ms?: number;
    expiration_at_ms?: number | null;
    transaction_id?: string;
    entitlement_ids?: string[];
  };
};

// ─── Handle RevenueCat Webhook ────────────────────────────────────────────────
const handleRevenueCatWebhook = async (
  webhookBody: RevenueCatWebhookBody,
  authHeader?: string
) => {
  // If you set an Authorization header in RevenueCat webhook settings, verify it here
  if (config.revenuecat.webhook_secret && authHeader !== config.revenuecat.webhook_secret) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid authorization header");
  }

  const { event } = webhookBody;
  if (!event) return { received: true };

  if (!event.type || !HANDLED_REVENUECAT_EVENTS.has(event.type)) {
    return { received: true, ignored: true };
  }

  if (!event.entitlement_ids?.includes(PREMIUM_ENTITLEMENT_ID)) {
    return { received: true, ignored: true };
  }

  const {
    id: event_id,
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
    if (!event_id) {
      throw new AppError(httpStatus.BAD_REQUEST, "RevenueCat event ID is required");
    }

    // 1. Make user premium
    await User.findByIdAndUpdate(app_user_id, {
      isPremium: true,
    });

    // 2. Atomically create one invoice per RevenueCat event
    const invoiceResult = await Invoice.updateOne(
      { revenueCatEventId: event_id },
      {
        $setOnInsert: {
          user: app_user_id,
          productId: product_id,
          revenueCatEventId: event_id,
          amount: price || 0,
          currency: currency || "usd",
          status: "Paid",
          transactionId: transaction_id,
          subscriptionStartDate: purchased_at_ms ? new Date(purchased_at_ms) : new Date(),
          subscriptionEndDate: expiration_at_ms ? new Date(expiration_at_ms) : null,
        },
      },
      { upsert: true }
    );

    if (invoiceResult.upsertedCount === 0) {
      return { received: true, duplicate: true };
    }
  } else if (type === "UNCANCELLATION") {
    await User.findByIdAndUpdate(app_user_id, {
      isPremium: true,
    });
  } else if (type === "EXPIRATION") {
    // When the subscription expires and is not renewed, remove premium access
    await User.findByIdAndUpdate(app_user_id, {
      isPremium: false,
    });
  } else if (type === "CANCELLATION" || type === "BILLING_ISSUE") {
    // Access remains active until RevenueCat sends an EXPIRATION event.
    return { received: true, accessChanged: false };
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
