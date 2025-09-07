import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Stripe webhook endpoint
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("stripe-signature") ?? "";
    const body = await req.text();
    try {
      await ctx.runAction(api.stripeActions.handleStripeWebhook, {
        body,
        signature,
      });
      return new Response(null, { status: 200 });
    } catch (e) {
      return new Response("Webhook error", { status: 400 });
    }
  }),
});

export default http;
