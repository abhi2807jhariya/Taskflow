"use client";

import axios from "axios";
import {
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const initialForm: ChangePasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ChangePasswordClient() {
  const router = useRouter();

  const [formData, setFormData] = useState<ChangePasswordForm>(initialForm);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return "Please fill in all password fields";
    }

    if (newPassword.length < 8) {
      return "New password must be at least 8 characters long";
    }

    if (!/[A-Z]/.test(newPassword)) {
      return "New password must contain at least one uppercase letter";
    }

    if (!/[a-z]/.test(newPassword)) {
      return "New password must contain at least one lowercase letter";
    }

    if (!/[0-9]/.test(newPassword)) {
      return "New password must contain at least one number";
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return "New password must contain at least one special character";
    }

    if (newPassword !== confirmPassword) {
      return "New password and confirm password do not match";
    }

    if (currentPassword === newPassword) {
      return "New password must be different from current password";
    }

    return "";
  };

  const getAccessToken = () => {
    return (
      localStorage.getItem("taskflow_token") ||
      sessionStorage.getItem("taskflow_token")
    );
  };

  const clearLoginData = () => {
    localStorage.removeItem("taskflow_token");
    localStorage.removeItem("taskflow_user");

    sessionStorage.removeItem("taskflow_token");
    sessionStorage.removeItem("taskflow_user");
  };

  const handleLogout = () => {
    clearLoginData();
    router.replace("/login");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      setError("Login session not found. Please log in again.");

      setTimeout(() => {
        router.replace("/login");
      }, 1000);

      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/auth/change-password`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      setSuccess(response.data?.message || "Password changed successfully");

      setFormData(initialForm);

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError)) {
        const statusCode = requestError.response?.status;

        const message = requestError.response?.data?.message;

        if (statusCode === 401) {
          setError("Your session has expired. Please log in again.");

          clearLoginData();

          setTimeout(() => {
            router.replace("/login");
          }, 1200);

          return;
        }

        if (Array.isArray(message)) {
          setError(message[0] || "Unable to change password");
          return;
        }

        if (typeof message === "string") {
          setError(message);
          return;
        }
      }

      setError("Unable to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      {success && (
        <div className="fixed right-4 top-20 z-[9999] w-[calc(100%-2rem)] max-w-sm animate-[toastIn_0.3s_ease-out] rounded-xl border border-emerald-200 bg-white p-4 shadow-xl sm:right-6 sm:w-full">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Success</p>

              <p className="mt-1 text-sm text-slate-600">{success}</p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close notification"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <Header handleLogout={handleLogout} />

      {/* Sidebar + Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-slate-100">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl">
              {/* Page Heading */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-2xl">
                  Change Password
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Update your admin account password securely.
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                {/* Change Password Form */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-5 sm:px-7">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                        <KeyRound size={24} />
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-white">
                          Password Security
                        </h2>

                        <p className="mt-1 text-sm text-blue-100">
                          Enter your current password and choose a secure new
                          password.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5 p-5 sm:p-7"
                  >
                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                      </div>
                    )}

                    {/* {success && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                        {success}. Redirecting to login...
                      </div>
                    )} */}

                    <PasswordInput
                      id="currentPassword"
                      name="currentPassword"
                      label="Current Password"
                      placeholder="Enter current password"
                      value={formData.currentPassword}
                      showPassword={showCurrentPassword}
                      disabled={loading}
                      onChange={handleChange}
                      onToggle={() =>
                        setShowCurrentPassword((previous) => !previous)
                      }
                    />

                    <PasswordInput
                      id="newPassword"
                      name="newPassword"
                      label="New Password"
                      placeholder="Enter new password"
                      value={formData.newPassword}
                      showPassword={showNewPassword}
                      disabled={loading}
                      onChange={handleChange}
                      onToggle={() =>
                        setShowNewPassword((previous) => !previous)
                      }
                    />

                    <PasswordInput
                      id="confirmPassword"
                      name="confirmPassword"
                      label="Confirm New Password"
                      placeholder="Enter new password again"
                      value={formData.confirmPassword}
                      showPassword={showConfirmPassword}
                      disabled={loading}
                      onChange={handleChange}
                      onToggle={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                    />

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        disabled={loading}
                        className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={loading || Boolean(success)}
                        className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <LockKeyhole size={18} />
                            Change Password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Password Requirements */}
                <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShieldCheck size={21} />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">
                        Password Requirements
                      </h3>

                      <p className="text-xs text-slate-500">
                        Keep your account secure
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-slate-600">
                    <Requirement text="At least 8 characters" />
                    <Requirement text="One uppercase letter" />
                    <Requirement text="One lowercase letter" />
                    <Requirement text="One number" />
                    <Requirement text="One special character" />
                    <Requirement text="Different from current password" />
                  </div>

                  <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs leading-5 text-blue-700">
                      After changing your password, you will be logged out
                      automatically and redirected to the login page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

interface PasswordInputProps {
  id: string;
  name: keyof ChangePasswordForm;
  label: string;
  placeholder: string;
  value: string;
  showPassword: boolean;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}

function PasswordInput({
  id,
  name,
  label,
  placeholder,
  value,
  showPassword,
  disabled,
  onChange,
  onToggle,
}: PasswordInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <LockKeyhole
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          id={id}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={
            name === "currentPassword" ? "current-password" : "new-password"
          }
          disabled={disabled}
          className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed"
        >
          {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </div>
  );
}

function Requirement({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
        ✓
      </span>

      <span>{text}</span>
    </div>
  );
}
