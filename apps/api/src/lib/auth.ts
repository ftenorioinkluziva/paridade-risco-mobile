import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins";

import { db } from "@/db/client";
import { ac, admin, user } from "@/lib/permissions";

export const auth = betterAuth({
  appName: "Paridade Risco",
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || "paridade-risco-better-auth-secret-key-32ch",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3001",
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((s) => s.trim()) : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXTAUTH_URL ? [process.env.NEXTAUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
    ...(process.env.NEXT_PUBLIC_API_URL ? [process.env.NEXT_PUBLIC_API_URL] : []),
  ].filter(Boolean),
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      telegramChatId: {
        type: "string",
        required: false,
        input: true,
      },
      birthDate: {
        type: "date",
        required: false,
        input: true,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: true,
      },
      selectedBasketId: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      console.log(`Password reset for ${user.email}: ${url}`);
    },
    resetPasswordTokenExpiresIn: 3600,
  },
  plugins: [
    adminPlugin({
      ac,
      roles: { admin, user },
    }),
    nextCookies(),
  ],
});
