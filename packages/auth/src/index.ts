import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { usernameOnly } from "@keeper.sh/auth-plugin-username-only";
import { database } from "@keeper.sh/database";
import * as authSchema from "@keeper.sh/database/auth-schema";
import env from "@keeper.sh/env/auth";
import type { BetterAuthPlugin } from "better-auth";

const plugins: BetterAuthPlugin[] = [];

if (env.NO_EMAIL_REQUIRED) {
  plugins.push(usernameOnly());
}

export const polarClient =
  env.POLAR_ACCESS_TOKEN && env.POLAR_MODE
    ? new Polar({
        accessToken: env.POLAR_ACCESS_TOKEN,
        server: env.POLAR_MODE,
      })
    : null;

if (polarClient) {
  plugins.push(
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          successUrl: "/dashboard/billing?success=true",
        }),
        portal(),
      ],
    }),
  );
}

const socialProviders: Parameters<typeof betterAuth>[0]["socialProviders"] = {};

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    accessType: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(database, {
    provider: "pg",
    schema: authSchema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: !env.NO_EMAIL_REQUIRED,
  },
  socialProviders,
  account: {
    accountLinking: {
      allowDifferentEmails: true,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      afterDelete: async (user) => {
        if (!polarClient) return;

        await polarClient.customers.deleteExternal({
          externalId: user.id,
        });
      },
    },
  },
  plugins,
});
