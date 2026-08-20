"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { InlineAlert } from "@/components/InlineAlert";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";
import { useAuth } from "@/context/AuthContext";

import { authClient } from "@/lib/auth-client";

export default function SignupPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isValid =
    name.length > 0 &&
    email.length > 0 &&
    password.length >= 8 &&
    password === confirmPassword;

  async function handleSignup() {
    if (!isValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      router.push("/");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleWebSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSignup();
  }

  return (
    <Screen title="Criar Conta" subtitle="Preencha seus dados para começar.">
      <form onSubmit={handleWebSubmit} style={styles.form}>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// CADASTRO</div>

          {submitError ? (
            <InlineAlert
              title="Não foi possível criar a conta"
              message={submitError}
              tone="danger"
            />
          ) : null}

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>Nome</label>
            <InputField
              value={name}
              onChange={setName}
              type="text"
              placeholder="Seu nome completo"
            />
          </div>

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

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>Confirmar Senha</label>
            <InputField
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              placeholder="••••••••"
            />
          </div>

          <PrimaryButton
            label={isSubmitting ? "Criando conta…" : "Criar Conta"}
            onPress={handleSignup}
            disabled={isSubmitting}
          />

          <div style={styles.links}>
            <a href="/login" style={styles.link}>Já tem conta? Entrar</a>
          </div>
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
  links: {
    display: "flex",
    justifyContent: "center",
    marginTop: 8,
  },
  link: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 11,
    textDecoration: "none",
  },
};
