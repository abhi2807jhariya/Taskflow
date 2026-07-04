"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  Hash,
  KeyRound,
  LoaderCircle,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

interface AdminUser {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phoneNumber?: string | null;
  profileImage?: string | null;
  role?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileApiResponse {
  message?: string;
  user?: AdminUser;

  data?:
    | AdminUser
    | {
        user?: AdminUser;
      };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

function getToken(): string | null {
  return (
    localStorage.getItem("taskflow_token") ||
    sessionStorage.getItem("taskflow_token")
  );
}

function getStoredAdmin(): AdminUser | null {
  const storedAdmin =
    localStorage.getItem("taskflow_user") ||
    sessionStorage.getItem("taskflow_user");

  if (!storedAdmin) {
    return null;
  }

  try {
    return JSON.parse(storedAdmin) as AdminUser;
  } catch {
    return null;
  }
}

function getApiUser(
  responseData: unknown,
): AdminUser | null {
  if (
    typeof responseData !== "object" ||
    responseData === null
  ) {
    return null;
  }

  const data =
    responseData as ProfileApiResponse &
      Partial<AdminUser>;

  if (
    typeof data.user === "object" &&
    data.user !== null
  ) {
    return data.user;
  }

  if (
    typeof data.data === "object" &&
    data.data !== null
  ) {
    if (
      "user" in data.data &&
      typeof data.data.user === "object" &&
      data.data.user !== null
    ) {
      return data.data.user;
    }

    if ("id" in data.data) {
      return data.data as AdminUser;
    }
  }

  if (
    typeof data.id === "string" &&
    typeof data.fullName === "string"
  ) {
    return data as AdminUser;
  }

  return null;
}

async function readResponseData(
  response: Response,
): Promise<unknown> {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      message: responseText,
    };
  }
}

function updateStoredAdmin(
  updatedAdmin: AdminUser,
) {
  const storageKey = "taskflow_user";

  const localAdminText =
    localStorage.getItem(storageKey);

  const sessionAdminText =
    sessionStorage.getItem(storageKey);

  const updateStorage = (
    storage: Storage,
    currentAdminText: string | null,
  ) => {
    let currentAdmin: Record<
      string,
      unknown
    > = {};

    if (currentAdminText) {
      try {
        currentAdmin =
          JSON.parse(currentAdminText);
      } catch {
        currentAdmin = {};
      }
    }

    storage.setItem(
      storageKey,
      JSON.stringify({
        ...currentAdmin,
        ...updatedAdmin,
      }),
    );
  };

  if (localAdminText) {
    updateStorage(
      localStorage,
      localAdminText,
    );
  }

  if (sessionAdminText) {
    updateStorage(
      sessionStorage,
      sessionAdminText,
    );
  }

  if (
    !localAdminText &&
    !sessionAdminText
  ) {
    if (
      localStorage.getItem(
        "taskflow_token",
      )
    ) {
      updateStorage(localStorage, null);
    } else {
      updateStorage(sessionStorage, null);
    }
  }
}

function getProfileImageUrl(
  profileImage?: string | null,
): string | null {
  if (!profileImage) {
    return null;
  }

  if (
    profileImage.startsWith("data:") ||
    profileImage.startsWith("blob:") ||
    profileImage.startsWith("http://") ||
    profileImage.startsWith("https://")
  ) {
    return profileImage;
  }

  return `${API_URL}${
    profileImage.startsWith("/")
      ? ""
      : "/"
  }${profileImage}`;
}

export default function AdminProfileClient() {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [admin, setAdmin] =
    useState<AdminUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [copied, setCopied] =
    useState(false);

  const loadAdminProfile = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setIsLoading(true);
      }

      const storedAdmin =
        getStoredAdmin();

      const token = getToken();

      if (!token) {
        setAdmin(
          storedAdmin || {
            fullName: "Admin",
            role: "admin",
          },
        );

        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/auth/profile`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            cache: "no-store",
          },
        );

        const responseData =
          await readResponseData(response);

        if (!response.ok) {
          throw new Error(
            "Unable to load admin profile.",
          );
        }

        const latestAdmin =
          getApiUser(responseData);

        if (!latestAdmin) {
          throw new Error(
            "Admin profile was not returned.",
          );
        }

        setAdmin(latestAdmin);
        updateStoredAdmin(latestAdmin);
      } catch {
        setAdmin(
          storedAdmin || {
            fullName: "Admin",
            role: "admin",
          },
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadAdminProfile();

    const handleProfileUpdated = () => {
      void loadAdminProfile(false);
    };

    window.addEventListener(
      "taskflow-profile-updated",
      handleProfileUpdated,
    );

    return () => {
      window.removeEventListener(
        "taskflow-profile-updated",
        handleProfileUpdated,
      );
    };
  }, [loadAdminProfile]);

  const adminName =
    admin?.fullName ||
    admin?.name ||
    "Admin";

  const displayProfileImage =
    getProfileImageUrl(
      admin?.profileImage,
    );


  const copyAccountId = async () => {
    if (!admin?.id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        admin.id,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="relative z-50 shrink-0">
        <Header
          userName={adminName}
          profileImage={
            displayProfileImage
          }
          setSidebarOpen={
            setSidebarOpen
          }
        />
      </div>

      {/* Sidebar and workspace */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}

        {/* Admin sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 h-full w-64 shrink-0
            transform bg-white pt-16
            transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0 md:pt-0
            ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full"
            }
          `}
        >
          <Sidebar />
        </aside>

        {/* Main workspace */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <LoadingState />
            ) : (
              <div className="mx-auto w-full max-w-6xl">
                {/* Page heading */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 md:text-2xl">
                      Admin Profile
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                      View your personal and account
                      information.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                  {/* Left profile section */}
                  <div className="space-y-6">
                    {/* Admin profile summary */}
                    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                      <div className="h-28 bg-gradient-to-br from-[#0B2F7A] via-[#0D8CFF] to-[#10C9A7]" />

                      <div className="-mt-14 px-5 pb-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-100 to-emerald-100 text-3xl font-extrabold text-blue-700 shadow-lg">
                            {displayProfileImage ? (
                              <img
                                src={
                                  displayProfileImage
                                }
                                alt={adminName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(
                                adminName,
                              )
                            )}
                          </div>

                          <h2 className="mt-4 text-xl font-extrabold text-slate-900">
                            {adminName}
                          </h2>

                          <p className="mt-1 break-all text-sm text-slate-500">
                            {admin?.email ||
                              "Email not available"}
                          </p>

                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">
                              <ShieldCheck className="h-3.5 w-3.5" />

                              {admin?.role ||
                                "admin"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                          <Link
                            href="/admin/settings/profile/edit"
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Profile
                          </Link>

                          <Link
                            href="/admin/settings/change-password"
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <KeyRound className="h-4 w-4" />
                            Change Password
                          </Link>
                        </div>
                      </div>
                    </section>

                    {/* Admin account ID */}
                    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2F7A] via-[#0D8CFF] to-[#10C9A7] p-5 text-white shadow-lg">
                      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />

                      <div className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/10" />

                      <div className="relative z-10 flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                            <Hash className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                              Admin ID
                            </p>

                            <p className="mt-1 break-all text-sm font-bold">
                              {admin?.id ||
                                "Not available"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={
                            copyAccountId
                          }
                          disabled={!admin?.id}
                          title="Copy Admin ID"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </section>
                  </div>

                  {/* Right details section */}
                  <div className="space-y-6">
                    {/* Personal information */}
                    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div>
                            <h2 className="font-bold text-slate-900">
                              Personal Information
                            </h2>

                            <p className="text-sm text-slate-500">
                              Your basic contact and
                              profile details.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7">
                        <DetailCard
                          label="Full Name"
                          value={adminName}
                          icon={
                            <UserRound className="h-5 w-5" />
                          }
                        />

                        <DetailCard
                          label="Role"
                          value={capitalize(
                            admin?.role ||
                              "admin",
                          )}
                          icon={
                            <ShieldCheck className="h-5 w-5" />
                          }
                        />

                        <DetailCard
                          label="Email Address"
                          value={
                            admin?.email ||
                            "Not available"
                          }
                          icon={
                            <Mail className="h-5 w-5" />
                          }
                        />

                        <DetailCard
                          label="Mobile Number"
                          value={
                            admin?.phoneNumber ||
                            "Not available"
                          }
                          icon={
                            <Phone className="h-5 w-5" />
                          }
                        />
                      </div>
                    </section>

                    {/* Account information */}
                    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                        <h2 className="font-bold text-slate-900">
                          Account Information
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Account status and activity
                          details.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3 sm:p-7">
                        <DetailCard
                          label="Account Status"
                          value={capitalize(
                            admin?.status ||
                              "active",
                          )}
                          icon={
                            <ShieldCheck className="h-5 w-5" />
                          }
                        />

                        <DetailCard
                          label="Created On"
                          value={formatDate(
                            admin?.createdAt,
                          )}
                          icon={
                            <CalendarDays className="h-5 w-5" />
                          }
                        />

                        <DetailCard
                          label="Last Updated"
                          value={formatDate(
                            admin?.updatedAt,
                          )}
                          icon={
                            <Clock3 className="h-5 w-5" />
                          }
                        />
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Footer */}
          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-violet-600" />

        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading admin profile...
        </p>
      </div>
    </div>
  );
}

function DetailCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-bold text-slate-800">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function getInitials(
  fullName: string,
): string {
  const names = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (names.length === 0) {
    return "A";
  }

  if (names.length === 1) {
    return names[0]
      .charAt(0)
      .toUpperCase();
  }

  return `${names[0].charAt(0)}${names[
    names.length - 1
  ].charAt(0)}`.toUpperCase();
}

function formatDate(
  dateValue?: string,
): string {
  if (!dateValue) {
    return "Not available";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function capitalize(
  value: string,
): string {
  if (!value) {
    return "Not available";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}
