const MINIMUM_AUTH_SECRET_LENGTH = 32;

export function requireAuthSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = env.BETTER_AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET or NEXTAUTH_SECRET must be configured");
  }

  if (secret.length < MINIMUM_AUTH_SECRET_LENGTH) {
    throw new Error(`Authentication secret must have at least ${MINIMUM_AUTH_SECRET_LENGTH} characters`);
  }

  return secret;
}
