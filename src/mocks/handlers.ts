import { authHandlers } from "./handlers/auth";
import { predictionHandlers } from "./handlers/predictions";
import { referenceHandlers } from "./handlers/reference";
import { notificationHandlers } from "./handlers/notifications";
import { dashboardHandlers } from "./handlers/dashboard";
import { objectHandlers } from "./handlers/objects";
import { channelHandlers } from "./handlers/channels";

export const handlers = [
  ...authHandlers,
  ...predictionHandlers,
  ...referenceHandlers,
  ...notificationHandlers,
  ...dashboardHandlers,
  ...objectHandlers,
  ...channelHandlers,
];
