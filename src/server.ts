import mongoose from "mongoose";
import { Server } from "http";
import config from "./app/config";
import app from "./app";
import { initializeSocket } from "./app/socket/socket";
import { startCronJobs } from "./app/modules/cron";
import { LiveDiscussionServices } from "./app/modules/live-discussion/live-discussion.service";
let server: Server | null = null;

async function main() {
  try {
    await mongoose.connect(config.database_url as string);
    server = app.listen(config.port, () => {
      console.log(`Mindshift Peer Connect app is listening on port ${config.port}`);
    });
    initializeSocket(server);
    startCronJobs();
    await LiveDiscussionServices.createInitialRooms();
  } catch (err) {
    console.log(err);
  }
}

main();

process.on("unhandledRejection", () => {
  console.log(`unhandledRejection on is detected, shutting down server`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

process.on("uncaughtException", () => {
  console.log(`uncaughtException on is detected, shutting down server`);
  process.exit(1);
});
