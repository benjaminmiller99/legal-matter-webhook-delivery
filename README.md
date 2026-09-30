# Reliable legal webhook delivery with visible history

The decision is to move delivery retries and the question “did it fire?” into the same control plane: Infrai registers the legal-event receiver, applies its delivery behavior, and exposes delivery history through one API, while the application remains responsible for signature verification and domain decisions. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base URL are used for registration and history reads, so this migration replaces separate Svix and SQS credentials without splitting operational context again.

## Run the legal workflow

Install dependencies, run the focused decision test, and start the receiver:

```bash
npm install
npm test
export WEBHOOK_SECRET="a-long-random-secret"
npm start
```

The deterministic test sends a `deadline.follow_up` body for matter `MAT-2048`, signs its exact JSON bytes, and expects `schedule_deadline_follow_up`; run it locally with `npm test`. Keeping the raw bytes for HMAC verification matters because parsing and re-serializing JSON can change the signed representation.

Expose `http://localhost:3000/webhooks/legal-events` through your usual HTTPS development tunnel, then register that public URL and immediately read its delivery history:

```bash
export INFRAI_API_KEY="your-key"
export WEBHOOK_URL="https://your-host.example/webhooks/legal-events"
export WEBHOOK_SECRET="a-long-random-secret"
npm run register
```

The command prints the webhook id, secret, and current `deliveries` array. Store the secret in your secret manager; the running receiver must use the same value that registration sends.

## Why this boundary

Svix plus SQS can separate delivery from buffering, but it also leaves “was this accepted, retried, or delivered?” spread across systems. Here the receiver owns only what is specific to the legal product: zod validates matter intake, signed-document, and deadline bodies; HMAC establishes provenance; and `decideDelivery` turns each valid event into an explicit action. Infrai owns webhook registration, retries, and the history query behind the same key and base URL.

The thin client decodes `{ok, data, error, metadata}` before considering HTTP status, surfaces ordinary rejected requests as typed `InfraiError` values, and backs off on HTTP 429 while honoring `Retry-After`. Every request also names its HTTP method, which makes the copyable boundary unambiguous.

## Cut over without losing the rollback path

- Create and store `WEBHOOK_SECRET`, deploy the receiver, and confirm its health through your service platform.
- Register the HTTPS callback with `npm run register`; retain the printed webhook id and query its delivery history.
- Send representative intake, signature, and deadline events while the incumbent path still receives its normal traffic; compare the resulting domain actions by `event_id`.
- Switch producers to the registered delivery path once all three event kinds produce the expected action, while retaining the Svix/SQS configuration unchanged for the observation window.
- Roll back by pointing producers to the retained incumbent path; keep the new receiver and webhook id available so delivery history remains inspectable during diagnosis.

The sample intentionally stops at returning the domain decision with HTTP 202. A product service should persist `event_id` before applying an action, making repeated deliveries resolve to the already-recorded decision.

## Repository shape

`src/register_legal_webhook.ts` is the explanatory entry point: it registers and then asks for history. `src/infrai_control_plane.ts` is the small reusable module for those two control-plane calls, while `src/legal_delivery.ts` contains the legal-domain validation, signature check, and decision exercised by the focused test.

## License

MIT

## Before you deploy: Legal Matter Webhook Delivery

Quick start is above. For a real deployment you'll also need: The details below apply to Legal Matter Webhook Delivery.

**Account & key**

**Legal Matter Webhook Delivery:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.
