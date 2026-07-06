import express from "express";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user-constant";
import { DashboardControllers } from "./dashboard.controller";

const router = express.Router();

router.get(
  "/overview",
  auth(USER_ROLE.admin),
  DashboardControllers.getOverviewStats
);

router.get(
  "/therapists",
  auth(USER_ROLE.admin),
  DashboardControllers.getTherapistsList
);

router.patch(
  "/therapists/:id/block",
  auth(USER_ROLE.admin),
  DashboardControllers.updateTherapistBlockStatus
);

router.patch(
  "/therapists/:id/verify",
  auth(USER_ROLE.admin),
  DashboardControllers.verifyTherapist
);

router.get(
  "/events",
  auth(USER_ROLE.admin),
  DashboardControllers.getEventsList
);

router.patch(
  "/events/:id/status",
  auth(USER_ROLE.admin),
  DashboardControllers.updateEventRequestStatus
);

router.delete(
  "/events/:id",
  auth(USER_ROLE.admin),
  DashboardControllers.deleteEventRequest
);

router.get(
  "/reports",
  auth(USER_ROLE.admin),
  DashboardControllers.getReportsList
);

router.patch(
  "/reports/:id/status",
  auth(USER_ROLE.admin),
  DashboardControllers.updateReportStatus
);

router.delete(
  "/reports/:id",
  auth(USER_ROLE.admin),
  DashboardControllers.deleteReport
);

router.get(
  "/chats",
  auth(USER_ROLE.admin),
  DashboardControllers.getChatsList
);

router.patch(
  "/chats/:id/block",
  auth(USER_ROLE.admin),
  DashboardControllers.updateChatBlockStatus
);

export const DashboardRoutes = router;
