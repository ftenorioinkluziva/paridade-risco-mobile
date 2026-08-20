import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";

import { db } from "@/db/client";
import { requireAuthSecret } from "@/lib/auth-config";
import { ac, admin, user } from "@/lib/permissions";

export const MCP_API_KEY_CONFIG_ID = "mcp";
export const MCP_API_KEY_PERMISSIONS = { mcp: ["read", "sync", "mapping"] } as const;
const MCP_API_KEY_EXPIRATION_SECONDS = 60 * 60 * 24 * 90;
export const AUTH_TRUSTED_ORIGINS = [
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
].filter(Boolean);

export const auth = betterAuth({
  appName: "Paridade Risco",
  secret: requireAuthSecret(),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
  trustedOrigins: AUTH_TRUSTED_ORIGINS,
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
    apiKey([{
      configId: MCP_API_KEY_CONFIG_ID,
      defaultPrefix: "pr_mcp_",
      requireName: true,
      keyExpiration: {
        defaultExpiresIn: MCP_API_KEY_EXPIRATION_SECONDS,
        disableCustomExpiresTime: true,
      },
      rateLimit: {
        enabled: true,
        timeWindow: 60_000,
        maxRequests: 120,
      },
      permissions: {
        defaultPermissions: MCP_API_KEY_PERMISSIONS,
      },
    }]),
    nextCookies(),
  ],
});
