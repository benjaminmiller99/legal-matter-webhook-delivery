import express from "express";
import { ZodError } from "zod";
import { decideDelivery, hasValidSignature, legalEventSchema } from "./legal_delivery.js";

const secret = process.env.WEBHOOK_SECRET;
if (!secret) throw new Error("Set WEBHOOK_SECRET before starting the service");

const app = express();
app.use(express.text({ type: "application/json", limit: "64kb" }));

app.post("/webhooks/legal-events", (request, response) => {
  const rawBody = request.body as string;
  const signature = request.header("x-webhook-signature") ?? "";
  if (!hasValidSignature(rawBody, signature, secret)) {
    response.status(401).json({ accepted: false, reason: "invalid_signature" });
    return;
  }

  try {
    const event = legalEventSchema.parse(JSON.parse(rawBody));
    response.status(202).json({ accepted: true, decision: decideDelivery(event) });
  } catch (error) {
    const detail = error instanceof ZodError ? error.flatten() : { formErrors: ["Invalid JSON"] };
    response.status(400).json({ accepted: false, detail });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Legal webhook receiver listening on http://localhost:${port}`));
