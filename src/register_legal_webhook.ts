import { randomBytes } from "node:crypto";
import { infraiFromEnvironment } from "./infrai_control_plane.js";

const callbackUrl = process.env.WEBHOOK_URL;
if (!callbackUrl) throw new Error("Set WEBHOOK_URL to the public legal-events endpoint");

const secret = process.env.WEBHOOK_SECRET ?? randomBytes(32).toString("hex");
const infrai = infraiFromEnvironment();

const registered = await infrai.account.webhooks.register({
  url: callbackUrl,
  events: ["*"],
  description: "Matter intake, signed documents, and deadline follow-up",
  secret,
});
const history = await infrai.account.webhooks.deliveries(registered.webhook_id);

console.log(JSON.stringify({ webhookId: registered.webhook_id, secret, deliveries: history.items }, null, 2));
