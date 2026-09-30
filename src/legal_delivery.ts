import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const legalEventSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("matter.intake.completed"),
    event_id: z.string().uuid(),
    matter_id: z.string().min(1),
    client_name: z.string().min(1),
  }),
  z.object({
    kind: z.literal("document.signed"),
    event_id: z.string().uuid(),
    matter_id: z.string().min(1),
    document_id: z.string().min(1),
    signer_name: z.string().min(1),
  }),
  z.object({
    kind: z.literal("deadline.follow_up"),
    event_id: z.string().uuid(),
    matter_id: z.string().min(1),
    due_at: z.string().datetime(),
    owner_email: z.string().email(),
  }),
]);

export type LegalEvent = z.infer<typeof legalEventSchema>;

export type DeliveryDecision = {
  eventId: string;
  matterId: string;
  action: "open_matter" | "release_signed_document" | "schedule_deadline_follow_up";
};

export function decideDelivery(event: LegalEvent): DeliveryDecision {
  const action = event.kind === "matter.intake.completed"
    ? "open_matter"
    : event.kind === "document.signed"
      ? "release_signed_document"
      : "schedule_deadline_follow_up";
  return { eventId: event.event_id, matterId: event.matter_id, action };
}

export function signPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function hasValidSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(signPayload(rawBody, secret), "hex");
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
