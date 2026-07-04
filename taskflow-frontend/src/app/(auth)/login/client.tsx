"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import type { Metadata } from "next";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface LoggedInUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  phoneNumber?: string | null;
  profileImage?: string | null;
}
export const metadata: Metadata = {
  title: {
    default: "TaskFlow Login",
    template: "%s | TaskFlow",
  },
};

export default function LoginPageClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const checkLoginPage = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/auth/setup-status`,
        );

        if (!response.data.isSetupDone) {
          router.replace("/setup");
          return;
        }

        const localToken =
          localStorage.getItem("taskflow_token");

        const sessionToken =
          sessionStorage.getItem("taskflow_token");

        const token = localToken || sessionToken;

        const storedUser =
          localStorage.getItem("taskflow_user") ||
          sessionStorage.getItem("taskflow_user");

        if (token && storedUser) {
          try {
            const user: LoggedInUser = JSON.parse(storedUser);

            if (user.role === "admin") {
              router.replace("/admin/dashboard");
            } else {
              router.replace("/user/dashboard");
            }

            return;
          } catch (error) {
            console.error("Invalid stored user data:", error);

            localStorage.removeItem("taskflow_token");
            localStorage.removeItem("taskflow_user");

            sessionStorage.removeItem("taskflow_token");
            sessionStorage.removeItem("taskflow_user");
          }
        }

        setCheckingSetup(false);
      } catch (error) {
        console.error("Setup status check failed:", error);

        setApiError(
          "Backend server se connection nahi ho pa raha hai.",
        );

        setCheckingSetup(false);
      }
    };

    checkLoginPage();
  }, [router]);

  const clearStoredLoginData = () => {
    localStorage.removeItem("taskflow_token");
    localStorage.removeItem("taskflow_user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    sessionStorage.removeItem("taskflow_token");
    sessionStorage.removeItem("taskflow_user");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
  };

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setApiError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email: email.trim(),
          password,
          rememberMe,
        },
      );

      const accessToken: string | undefined =
        response.data?.accessToken;

      const loggedInUser: LoggedInUser | undefined =
        response.data?.user;

      if (!accessToken || !loggedInUser) {
        throw new Error(
          "Login response me token ya user data nahi mila.",
        );
      }

      clearStoredLoginData();

      if (rememberMe) {
        localStorage.setItem(
          "taskflow_token",
          accessToken,
        );

        localStorage.setItem(
          "taskflow_user",
          JSON.stringify(loggedInUser),
        );
      } else {
        sessionStorage.setItem(
          "taskflow_token",
          accessToken,
        );

        sessionStorage.setItem(
          "taskflow_user",
          JSON.stringify(loggedInUser),
        );
      }

      if (loggedInUser.role === "admin") {
        window.location.replace("/admin/dashboard");
      } else {
        window.location.replace("/user/dashboard");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        if (Array.isArray(message)) {
          setApiError(
            message[0] || "Login failed. Please try again.",
          );
        } else if (typeof message === "string") {
          setApiError(message);
        } else {
          setApiError("Login failed. Please try again.");
        }
      } else if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />

          <p className="mt-4 text-slate-500">
            Checking system status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Section */}
      <div className="flex w-full flex-col justify-between p-8 lg:w-1/2">
        <div>
          <div className="flex items-center justify-center gap-3">
            <Image
              src="/assets/logos/taskflow-log.png"
              alt="TaskFlow Logo"
              width={180}
              height={44}
              priority
              style={{
                width: "180px",
                height: "auto",
              }}
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome Back
          </h2>

          <p className="mt-2 text-slate-500">
            Login to continue your work
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);

                    if (apiError) {
                      setApiError("");
                    }
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="h-14 w-full rounded-xl border border-slate-200 pl-12 pr-4 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);

                    if (apiError) {
                      setApiError("");
                    }
                  }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="h-14 w-full rounded-xl border border-slate-200 pl-12 pr-12 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous,
                    )
                  }
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember and Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(event.target.checked)
                  }
                  disabled={loading}
                  className="h-4 w-4 accent-green-600"
                />

                <span className="text-sm text-slate-600">
                  Remember me
                </span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm font-medium text-green-600 hover:text-green-700"
              >
                Forgot Password?
              </Link>
            </div>

            {/* API Error */}
            {apiError && (
              <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-center text-sm font-medium text-red-500">
                {apiError}
              </p>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-xl bg-green-600 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="text-center text-sm text-slate-500">
              Need help accessing your account?{" "}
              <span className="font-semibold text-green-600">
                Contact your administrator.
              </span>
            </div>
          </form>
        </div>

        <div className="text-center text-sm text-slate-400">
          © 2026 TaskFlow. All rights reserved.
        </div>
      </div>

      {/* Right Section */}
      <div className="hidden w-1/2 items-center justify-center border-l border-slate-100 bg-green-50 lg:flex">
        <div className="relative h-[500px] w-[600px]">
          <Image
            src="/assets/images/login-right.png"
            alt="Login Illustration"
            fill
            sizes="50vw"
            priority
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
