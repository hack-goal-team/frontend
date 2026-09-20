import { authHandlers } from "./handlers/auth";
import { predictionHandlers } from "./handlers/predictions";
import { referenceHandlers } from "./handlers/reference";
import { notificationHandlers } from "./handlers/notifications";

export const handlers = [...authHandlers, ...predictionHandlers, ...referenceHandlers, ...notificationHandlers];
