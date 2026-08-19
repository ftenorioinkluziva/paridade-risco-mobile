"use client";

import { useState, type FormEvent } from "react";

import { InlineAlert } from "@/components/InlineAlert";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

import { authClient } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const isValid = email.length > 0;

  async function handleResetPassword() {
    if (!isValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await authClient.$fetch("/forget-password", {
        method: "POST",
        body: {
          email,
          redirectTo: "/reset-password/confirm",
        },
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      setIsSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o email. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleWebSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleResetPassword();
  }

  return (
    <Screen title="Recuperar Senha" subtitle="Informe seu email para receber o link de recuperação.">
      <form onSubmit={handleWebSubmit} style={styles.form}>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// RECUPERAR SENHA</div>

          {isSuccess ? (
            <InlineAlert
              title="Email enviado"
              message="Verifique sua caixa de entrada e clique no link para redefinir sua senha."
              tone="success"
            />
          ) : submitError ? (
            <InlineAlert
              title="Erro ao enviar email"
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

          <PrimaryButton
            label={isSubmitting ? "Enviando…" : "Enviar Link"}
            onPress={handleResetPassword}
            disabled={isSubmitting}
          />

          <div style={styles.links}>
            <a href="/login" style={styles.link}>Voltar para o login</a>
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
