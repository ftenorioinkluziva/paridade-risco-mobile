"use client";

import type { LoginInput } from "@paridade-risco/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { InlineAlert } from "@/components/InlineAlert";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const input: LoginInput = { email: email.trim(), password };
  const isValid = input.email.length > 0 && input.password.length > 0;

  async function handleLogin() {
    if (!isValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await signIn(input);
      router.push("/");
    } catch {
      setSubmitError(
        "Confira email e senha. Se estiverem corretos, tente novamente em alguns segundos."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleWebSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleLogin();
  }

  return (
    <Screen title="Acesso" subtitle="Entre para ver somente a sua carteira.">
      <form onSubmit={handleWebSubmit} style={styles.form}>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// ACESSO</div>

          {submitError ? (
            <InlineAlert
              title="Não foi possível entrar"
              message={submitError}
              tone="danger"
            />
          ) : null}

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>Email</label>
            <InputField
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="seu@email.com"
            />
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>Senha</label>
            <InputField
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
            />
          </div>

          <PrimaryButton
            label={isSubmitting ? "Entrando…" : "Entrar"}
            onPress={handleLogin}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Screen>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    width: "100%",
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 16,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
  },
};