import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin } from "better-auth/plugins";

import { db } from "@/db/client";
import { ac, admin, user } from "@/lib/permissions";

export const auth = betterAuth({
  appName: "Paridade Risco",
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
