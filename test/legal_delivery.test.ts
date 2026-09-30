import { describe, expect, it } from "vitest";
import { decideDelivery, hasValidSignature, legalEventSchema, signPayload } from "../src/legal_delivery.js";

describe("legal delivery decision", () => {
  it("accepts a signed deadline event and schedules the follow-up", () => {
    const secret = "local-test-secret";
    const rawBody = JSON.stringify({
      kind: "deadline.follow_up",
      event_id: "157d7708-d918-4d21-ae78-51dd2f9b10d0",
      matter_id: "MAT-2048",
      due_at: "2026-10-15T09:00:00.000Z",
      owner_email: "counsel@example.com",
    });

    expect(hasValidSignature(rawBody, signPayload(rawBody, secret), secret)).toBe(true);
    expect(decideDelivery(legalEventSchema.parse(JSON.parse(rawBody)))).toEqual({
      eventId: "157d7708-d918-4d21-ae78-51dd2f9b10d0",
      matterId: "MAT-2048",
      action: "schedule_deadline_follow_up",
    });
  });
});
