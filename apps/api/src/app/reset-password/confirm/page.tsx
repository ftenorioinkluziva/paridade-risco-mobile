"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { InlineAlert } from "@/components/InlineAlert";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

import { authClient } from "@/lib/auth-client";

function ResetPasswordConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const isValid = password.length >= 8 && password === confirmPassword;

  useEffect(() => {
    if (isSuccess) {
      const timeout = setTimeout(() => router.push("/login"), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isSuccess, router]);

  async function handleResetPassword() {
    if (!isValid || !token || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      setIsSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível redefinir a senha. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleWebSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleResetPassword();
  }

  if (!token) {
    return (
      <Screen width="narrow" title="Token Inválido" subtitle="O link de recuperação é inválido ou expirou.">
        <div style={styles.section}>
          <InlineAlert
            title="Link inválido"
            message="Solicite um novo link de recuperação de senha."
            tone="danger"
          />
          <div style={styles.links}>
            <a href="/reset-password" style={styles.link}>Solicitar novo link</a>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen width="narrow" title="Redefinir Senha" subtitle="Informe sua nova senha.">
      <form onSubmit={handleWebSubmit} style={styles.form}>
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// REDEFINIR SENHA</div>

          {isSuccess ? (
            <InlineAlert
              title="Senha redefinida"
              message="Sua senha foi alterada com sucesso. Redirecionando para o login..."
              tone="success"
            />
          ) : submitError ? (
            <InlineAlert
              title="Erro ao redefinir senha"
              message={submitError}
              tone="danger"
            />
          ) : null}

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>Nova Senha</label>
            <InputField
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
            />
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>Confirmar Nova Senha</label>
            <InputField
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              placeholder="••••••••"
            />
          </div>

          <PrimaryButton
            label={isSubmitting ? "Redefinindo…" : "Redefinir Senha"}
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

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetPasswordConfirmContent />
    </Suspense>
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
