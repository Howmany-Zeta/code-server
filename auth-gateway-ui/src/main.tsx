/*---------------------------------------------------------------------------------------------
 *  Copyright (c) IRETBL Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react";
import { createRoot } from "react-dom/client";

import { Alert, AlertDescription } from "@startu/auth-ui-shared";
import { Button } from "@startu/auth-ui-shared";
import { Input } from "@startu/auth-ui-shared";
import { Label } from "@startu/auth-ui-shared";
import {
  LoginForm,
  type LoginFormSubmitPayload,
  LoginMarketingPanel,
  StartuLogo,
  STARTU_LOGIN_MARKETING_TITLE,
} from "@startu/auth-ui-shared";
import loginHeroUrl from "./assets/login-hero.svg?url";
import { apiRequest } from "@startu/auth-chatbot-shared/apiClient";

import "./index.css";

interface AuthGatewayOptions {
  base: string;
  csStaticBase: string;
  codeServerVersion: string;
  gatewayUrl: string;
  appName: string;
  to: string;
  welcomeText?: string;
  loginError?: string;
}

function readOptions(): AuthGatewayOptions {
  const el = document.getElementById("coder-options");
  const raw = el?.getAttribute("data-settings");
  if (!raw) {
    return {
      base: ".",
      csStaticBase: "./_static",
      codeServerVersion: "",
      gatewayUrl: "http://localhost:3001",
      appName: "Startu",
      to: "/",
    };
  }
  try {
    const o = JSON.parse(raw) as AuthGatewayOptions;
    return {
      ...o,
      gatewayUrl: o.gatewayUrl || "http://localhost:3001",
      to: o.to || "/",
      loginError: o.loginError,
    };
  } catch {
    return {
      base: ".",
      csStaticBase: "./_static",
      codeServerVersion: "",
      gatewayUrl: "http://localhost:3001",
      appName: "Startu",
      to: "/",
    };
  }
}

function postTokenToSession(token: string, to: string): void {
  const form = document.createElement("form");
  form.method = "POST";
  const qs = new URLSearchParams(window.location.search);
  qs.set("to", to);
  form.action = `${window.location.pathname}?${qs.toString()}`;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "token";
  input.value = token;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

function parseHashToken(): string | undefined {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    return undefined;
  }
  const params = new URLSearchParams(hash);
  return params.get("access_token") || undefined;
}

function googleOAuthUrl(gatewayUrl: string, returnTo: string): string {
  const base = gatewayUrl.replace(/\/$/, "");
  const u = new URL(`${base}/auth/google/start`);
  u.searchParams.set("redirect", "docen");
  u.searchParams.set("return_to", returnTo);
  return u.toString();
}

type Screen = "login" | "register";

function RegisterForm({
  gatewayUrl,
  onBack,
  onRegistered,
}: {
  gatewayUrl: string;
  onBack: () => void;
  onRegistered: (token: string) => void;
}): React.ReactElement {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiRequest<{ token: string }>(
        "/auth/register",
        "POST",
        { baseURL: gatewayUrl.replace(/\/$/, "") },
        {
          email: email.trim(),
          password,
          username: email.split("@")[0] || "user",
        },
      );
      if (!data.token) {
        throw new Error("No token in response");
      }
      onRegistered(data.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md gap-4 flex flex-col p-2">
      <div className="px-4 sm:px-16 flex flex-col gap-1">
        <StartuLogo />
        <h2 className="text-3xl md:text-4xl font-bold mt-4 dark:text-white">Create account</h2>
        <p className="text-muted-foreground dark:text-gray-400 mt-1">Sign up with email and password</p>
      </div>
      {error ? (
        <div className="px-4 sm:px-16">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      <form onSubmit={submit} className="flex flex-col gap-4 px-4 sm:px-16">
        <div className="space-y-1">
          <Label htmlFor="reg-email" className="dark:text-gray-300">
            Email
          </Label>
          <Input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 bg-gray-200/50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reg-password" className="dark:text-gray-300">
            Password
          </Label>
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 bg-gray-200/50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reg-confirm" className="dark:text-gray-300">
            Confirm password
          </Label>
          <Input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-10 bg-gray-200/50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-10">
          {loading ? "Creating account..." : "Create account"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground dark:text-gray-400 bg-transparent border-none cursor-pointer"
          onClick={onBack}
        >
          Back to sign in
        </button>
      </form>
    </div>
  );
}

function App(): React.ReactElement {
  const opts = React.useMemo(() => readOptions(), []);
  const [screen, setScreen] = React.useState<Screen>("login");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(opts.loginError || "");
  const [hashHandled, setHashHandled] = React.useState(false);

  const base = opts.gatewayUrl.replace(/\/$/, "");

  const handleLoginSubmit = async (payload: LoginFormSubmitPayload) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await apiRequest<{ token: string }>(
        "/auth/login",
        "POST",
        { baseURL: base },
        { email: payload.email, password: payload.password },
      );
      if (!data.token) {
        throw new Error("No token in response");
      }
      postTokenToSession(data.token, opts.to);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = () => {
    const returnTo = window.location.href.split(/#|\?/)[0] || window.location.href;
    window.location.assign(googleOAuthUrl(opts.gatewayUrl, returnTo));
  };

  React.useEffect(() => {
    if (hashHandled) {
      return;
    }
    const token = parseHashToken();
    if (token) {
      setHashHandled(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      postTokenToSession(token, opts.to);
    }
  }, [hashHandled, opts.to]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background dark:bg-gray-950">
      <LoginMarketingPanel
        imageUrls={{ hero: loginHeroUrl }}
        title={opts.welcomeText || STARTU_LOGIN_MARKETING_TITLE}
        className="md:w-1/2"
      />
      <div className="flex flex-1 items-center justify-center py-8 px-4 bg-background dark:bg-gray-900">
        {screen === "login" ? (
          <LoginForm
            onSubmit={handleLoginSubmit}
            onGoogleLogin={onGoogle}
            isLoading={loading}
            error={error}
            onNavigateToRegister={() => {
              setScreen("register");
              setError("");
            }}
          />
        ) : (
          <RegisterForm
            gatewayUrl={opts.gatewayUrl}
            onBack={() => {
              setScreen("login");
              setError("");
            }}
            onRegistered={(token) => postTokenToSession(token, opts.to)}
          />
        )}
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
