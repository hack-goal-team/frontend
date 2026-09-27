import { authHandlers } from "./handlers/auth";
import { predictionHandlers } from "./handlers/predictions";
import { decisionHandlers } from "./handlers/decisions";
import { referenceHandlers } from "./handlers/reference";
import { notificationHandlers } from "./handlers/notifications";
import { dashboardHandlers } from "./handlers/dashboard";
import { objectHandlers } from "./handlers/objects";
import { channelHandlers } from "./handlers/channels";
import { importHandlers } from "./handlers/import";
import { settingsHandlers } from "./handlers/settings";

export const handlers = [
  ...authHandlers,
  ...predictionHandlers,
  ...decisionHandlers,
  ...referenceHandlers,
  ...notificationHandlers,
  ...dashboardHandlers,
  ...objectHandlers,
  ...channelHandlers,
  ...importHandlers,
  ...settingsHandlers,
];
