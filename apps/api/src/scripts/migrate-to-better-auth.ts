import crypto from "crypto";

import { db } from "@/db/client";
import { users as legacyUsers } from "@/db/schema";

function generateRandomPassword(): string {
  // Generate a secure random password with uppercase, lowercase, numbers, and symbols
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

async function migrateToBetterAuth() {
  console.log("Starting migration from legacy users to Better Auth...");
  console.log("IMPORTANT: Each user will receive a random password that must be changed on first login.");

  const allUsers = await db.select().from(legacyUsers);
  console.log(`Found ${allUsers.length} users to migrate`);

  let successCount = 0;
  let errorCount = 0;
  const userPasswords: Array<{ email: string; password: string }> = [];

  for (const legacyUser of allUsers) {
    try {
      console.log(`Migrating user: ${legacyUser.email} (${legacyUser.id})`);

      const temporaryPassword = generateRandomPassword();
      userPasswords.push({ email: legacyUser.email, password: temporaryPassword });

      const response = await fetch("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: legacyUser.email,
          password: temporaryPassword,
          name: legacyUser.name,
          phone: legacyUser.phone,
          telegramChatId: legacyUser.telegramChatId,
          role: legacyUser.role?.toLowerCase() || "user",
          birthDate: legacyUser.birthDate?.toISOString() || null,
          isActive: legacyUser.isActive,
          selectedBasketId: legacyUser.selectedBasketId,
        }),
      });

      if (response.ok) {
        console.log(`  ✓ Migrated: ${legacyUser.email}`);
        successCount++;
      } else {
        const error = await response.text();
        console.error(`  ✗ Failed to migrate ${legacyUser.email}: ${error}`);
        errorCount++;
      }
    } catch (error) {
      console.error(`  ✗ Error migrating ${legacyUser.email}:`, error);
      errorCount++;
    }
  }

  console.log("\nMigration complete:");
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${allUsers.length}`);

  if (userPasswords.length > 0) {
    console.log("\n=== USER CREDENTIALS ===");
    console.log("Distribute these passwords securely to users:");
    console.log("Each user MUST change their password on first login.");
    console.log("========================\n");
    for (const { email, password } of userPasswords) {
      console.log(`${email}: ${password}`);
    }
    console.log("========================\n");
  }
}

migrateToBetterAuth().catch(console.error);
