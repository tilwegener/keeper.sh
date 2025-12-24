import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { polar, checkout, portal } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { Resend } from "resend";
import { usernameOnly } from "@keeper.sh/auth-plugin-username-only";
import { database } from "@keeper.sh/database";
import * as authSchema from "@keeper.sh/database/auth-schema";
import env from "@keeper.sh/env/auth";
import type { BetterAuthPlugin } from "better-auth";

interface EmailUser {
  email: string;
  name: string;
}

interface SendEmailParams {
  user: EmailUser;
  url: string;
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const plugins: BetterAuthPlugin[] = [];

if (env.USERNAME_ONLY_MODE) {
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

if (!env.USERNAME_ONLY_MODE && env.PASSKEY_RP_ID && env.PASSKEY_ORIGIN) {
  plugins.push(
    passkey({
      rpID: env.PASSKEY_RP_ID,
      rpName: env.PASSKEY_RP_NAME ?? "Keeper",
      origin: env.PASSKEY_ORIGIN,
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
    enabled: !env.USERNAME_ONLY_MODE,
    requireEmailVerification: !env.USERNAME_ONLY_MODE,
    sendVerificationEmail: async ({ user, url }: SendEmailParams) => {
      if (!resend) return;
      await resend.emails.send({
        to: user.email,
        template: {
          id: "email-verification",
          variables: { url, name: user.name },
        },
      });
    },
    sendResetPassword: async ({ user, url }: SendEmailParams) => {
      if (!resend) return;
      await resend.emails.send({
        to: user.email,
        template: {
          id: "password-reset",
          variables: { url, name: user.name },
        },
      });
    },
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
