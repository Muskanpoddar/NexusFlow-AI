
import { useState } from "react";

import AuthLayout from "../features/auth/AuthLayout";
import ForgotPassword from "../features/auth/ForgotPassword";
import Login from "../features/auth/Login";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "forgot">("login");

  return (
    <AuthLayout
      title={mode === "login" ? "Welcome back" : "Reset your password"}
      subtitle={
        mode === "login"
          ? "Sign in to pick up where your team left off."
          : "Enter your email and we will send you a reset link."
      }
    >
      {mode === "login" ? (
        <Login
          onSwitchToRegister={onSwitchToRegister}
          onForgotPassword={() => setMode("forgot")}
        />
      ) : (
        <ForgotPassword onBackToLogin={() => setMode("login")} />
      )}
    </AuthLayout>
  );
}

export default LoginPage;
