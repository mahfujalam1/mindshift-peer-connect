import express, { Router } from "express";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user-constant";
import { InvoiceController } from "./invoice.controller";

const router = Router();

// RevenueCat webhook — uses standard JSON body parsing
router.post(
  "/webhook",
  express.json(),
  InvoiceController.revenueCatWebhook
);

// Get the logged-in user's own invoices
router.get(
  "/my-invoices",
  auth(USER_ROLE.user, USER_ROLE.admin),
  InvoiceController.getMyInvoices
);

// Admin: get all invoices
router.get(
  "/all",
  auth(USER_ROLE.admin),
  InvoiceController.getAllInvoices
);

// Get a single invoice by ID
router.get(
  "/:id",
  auth(USER_ROLE.user, USER_ROLE.admin),
  InvoiceController.getSingleInvoice
);

// Cancel a pending invoice
router.patch(
  "/:id/cancel",
  auth(USER_ROLE.user, USER_ROLE.admin),
  InvoiceController.cancelInvoice
);

export const InvoiceRoutes = router;
