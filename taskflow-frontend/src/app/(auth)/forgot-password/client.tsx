"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

interface ForgotPasswordResponse {
  message?: string;
  otp?: string;
}

interface VerifyOtpResponse {
  message?: string;
  resetToken?: string;
}

async function readJsonResponse<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {
      message: text,
    } as T;
  }
}

export default function ForgotPasswordForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");
    setDevOtp("");

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await readJsonResponse<ForgotPasswordResponse>(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to send OTP.");
      }

      setOtpSent(true);
      setMessage(data.message || "If this email exists, an OTP has been sent.");

      if (data.otp) {
        setDevOtp(data.otp);
        setOtp(data.otp);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send OTP.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setVerifying(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/verify-reset-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await readJsonResponse<VerifyOtpResponse>(response);

      if (!response.ok || !data.resetToken) {
        throw new Error(data.message || "Unable to verify OTP.");
      }

      router.push(`/reset-password?token=${encodeURIComponent(data.resetToken)}`);
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to verify OTP.",
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col justify-between p-8 lg:w-1/2 lg:p-12">
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
            Forgot Password?
          </h2>

          <p className="mt-3 text-slate-500">
            Enter your registered email address. We will send an OTP to verify
            your reset request.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setOtpSent(false);
                    setOtp("");
                    setDevOtp("");
                    setMessage("");
                    setError("");
                  }}
                  placeholder="you@example.com"
                  required
                  className="h-14 w-full rounded-xl border border-slate-200 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {otpSent && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Enter OTP
                </label>

                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="6 digit OTP"
                    maxLength={6}
                    className="h-14 w-full rounded-xl border border-slate-200 pl-12 pr-4 tracking-[0.35em] outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )}

            {message && (
              <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">{message}</p>
                  {devOtp && (
                    <p className="mt-1 text-xs font-bold">
                      Local OTP: {devOtp}
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!otpSent ? (
              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-xl bg-green-600 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleVerifyOtp()}
                disabled={verifying || otp.trim().length !== 6}
                className="h-14 w-full rounded-xl bg-green-600 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {verifying ? "Verifying..." : "Verify OTP"}
              </button>
            )}

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 font-medium text-green-600 hover:text-green-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </form>
        </div>

        <div className="text-sm text-slate-400">
          (c) 2026 TaskFlow. All rights reserved.
        </div>
      </div>

      <div className="hidden w-1/2 items-center justify-center border-l border-slate-100 bg-green-50 lg:flex">
        <div className="relative h-[500px] w-[600px]">
          <Image
            src="/assets/images/login-right.png"
            alt="Forgot Password"
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
