"use client";

import {
  type ElementType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import toast, {
  Toaster,
} from "react-hot-toast";

import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Copy,
  Hash,
  KeyRound,
  LoaderCircle,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StoredUser {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;

  phoneNumber?: string | number | null;
  phone?: string | number | null;
  mobile?: string | number | null;
  mobileNo?: string | number | null;
  mobileNumber?: string | number | null;

  role?: string;
  status?: string;
  isActive?: boolean;

  profileImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileApiResponse {
  message?: string;
  user?: StoredUser;

  data?:
    | StoredUser
    | {
        user?: StoredUser;
      };
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const emptyUser: UserProfile = {
  id: "",
  fullName: "User",
  email: "",
  phoneNumber: "",
  role: "user",
  status: "active",
  profileImage: null,
  createdAt: "",
  updatedAt: "",
};

function getToken(): string | null {
  return (
    localStorage.getItem(
      "taskflow_token",
    ) ||
    sessionStorage.getItem(
      "taskflow_token",
    )
  );
}

function getStoredUser(): StoredUser | null {
  const storedUserText =
    localStorage.getItem(
      "taskflow_user",
    ) ||
    sessionStorage.getItem(
      "taskflow_user",
    );

  if (!storedUserText) {
    return null;
  }

  try {
    return JSON.parse(
      storedUserText,
    ) as StoredUser;
  } catch {
    return null;
  }
}

function normalizeUser(
  user: StoredUser,
): UserProfile {
  const mobileValue =
    user.phoneNumber ??
    user.phone ??
    user.mobile ??
    user.mobileNo ??
    user.mobileNumber;

  return {
    id: user.id || "",

    fullName:
      user.fullName ||
      user.name ||
      "User",

    email: user.email || "",

    phoneNumber:
      mobileValue === null ||
      mobileValue === undefined
        ? ""
        : String(mobileValue),

    role: user.role || "user",

    status:
      user.status ||
      (user.isActive === false
        ? "inactive"
        : "active"),

    profileImage:
      user.profileImage ?? null,

    createdAt:
      user.createdAt || "",

    updatedAt:
      user.updatedAt || "",
  };
}

function getApiUser(
  responseData: unknown,
): StoredUser | null {
  if (
    typeof responseData !== "object" ||
    responseData === null
  ) {
    return null;
  }

  const data =
    responseData as ProfileApiResponse &
      StoredUser;

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
      typeof data.data.user ===
        "object" &&
      data.data.user !== null
    ) {
      return data.data.user;
    }

    if ("id" in data.data) {
      return data.data as StoredUser;
    }
  }

  if (
    typeof data.id === "string"
  ) {
    return data;
  }

  return null;
}

async function readResponseData(
  response: Response,
): Promise<unknown> {
  const responseText =
    await response.text();

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

function getErrorMessage(
  responseData: unknown,
  fallbackMessage: string,
): string {
  if (
    typeof responseData !== "object" ||
    responseData === null
  ) {
    return fallbackMessage;
  }

  const message = (
    responseData as {
      message?: string | string[];
    }
  ).message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  if (typeof message === "string") {
    return message;
  }

  return fallbackMessage;
}

function updateStoredUser(
  updatedUser: UserProfile,
) {
  const storageKey =
    "taskflow_user";

  const localUserText =
    localStorage.getItem(storageKey);

  const sessionUserText =
    sessionStorage.getItem(
      storageKey,
    );

  const updateStorage = (
    storage: Storage,
    currentUserText: string | null,
  ) => {
    let currentUser: Record<
      string,
      unknown
    > = {};

    if (currentUserText) {
      try {
        currentUser =
          JSON.parse(currentUserText);
      } catch {
        currentUser = {};
      }
    }

    storage.setItem(
      storageKey,
      JSON.stringify({
        ...currentUser,
        ...updatedUser,
      }),
    );
  };

  if (localUserText) {
    updateStorage(
      localStorage,
      localUserText,
    );
  }

  if (sessionUserText) {
    updateStorage(
      sessionStorage,
      sessionUserText,
    );
  }

  if (
    !localUserText &&
    !sessionUserText
  ) {
    if (
      localStorage.getItem(
        "taskflow_token",
      )
    ) {
      updateStorage(
        localStorage,
        null,
      );
    } else {
      updateStorage(
        sessionStorage,
        null,
      );
    }
  }
}

function getProfileImageUrl(
  profileImage?: string | null,
  updatedAt?: string,
): string | null {
  if (!profileImage) {
    return null;
  }

  if (
    profileImage.startsWith(
      "data:",
    ) ||
    profileImage.startsWith(
      "blob:",
    )
  ) {
    return profileImage;
  }

  const version = updatedAt
    ? encodeURIComponent(updatedAt)
    : "";

  if (
    profileImage.startsWith(
      "http://",
    ) ||
    profileImage.startsWith(
      "https://",
    )
  ) {
    if (!version) {
      return profileImage;
    }

    return `${profileImage}${
      profileImage.includes("?")
        ? "&"
        : "?"
    }v=${version}`;
  }

  const resolvedUrl = `${API_URL}${
    profileImage.startsWith("/")
      ? ""
      : "/"
  }${profileImage}`;

  return version
    ? `${resolvedUrl}?v=${version}`
    : resolvedUrl;
}

export default function UserProfilePage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UserProfile>(
      emptyUser,
    );

  const [loading, setLoading] =
    useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [copied, setCopied] =
    useState(false);

  const [
    imageFailed,
    setImageFailed,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(
    null,
  );

  const loadProfile = useCallback(
    async (
      showFullLoader = true,
    ) => {
      const token = getToken();

      if (!token) {
        toast.error(
          "Login session not found. Please login again.",
        );

        setLoading(false);
        router.replace("/login");
        return;
      }

      const storedUser =
        getStoredUser();

      if (
        showFullLoader &&
        storedUser
      ) {
        setUser(
          normalizeUser(storedUser),
        );
      }

      try {
        if (showFullLoader) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }

        setLoadError(null);

        const response = await fetch(
          `${API_URL}/auth/profile?_t=${Date.now()}`,
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
          await readResponseData(
            response,
          );

        if (!response.ok) {
          if (
            response.status === 401
          ) {
            throw new Error(
              "Your login session has expired. Please login again.",
            );
          }

          if (
            response.status === 403
          ) {
            throw new Error(
              "You do not have permission to view this profile.",
            );
          }

          throw new Error(
            getErrorMessage(
              responseData,
              "Unable to load profile.",
            ),
          );
        }

        const apiUser =
          getApiUser(responseData);

        if (!apiUser) {
          throw new Error(
            "Profile information was not returned by the server.",
          );
        }

        const latestUser =
          normalizeUser(apiUser);

        setUser(latestUser);
        setImageFailed(false);

        updateStoredUser(
          latestUser,
        );

        window.dispatchEvent(
          new CustomEvent(
            "taskflow-profile-updated",
            {
              detail: {
                ...latestUser,

                profileImage:
                  latestUser.profileImage,
              },
            },
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load profile.";

        setLoadError(message);

        if (!storedUser) {
          toast.error(message);
        }

        if (
          message
            .toLowerCase()
            .includes("session")
        ) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadProfile]);

  useEffect(() => {
    const handleProfileUpdated =
      () => {
        void loadProfile(false);
      };

    const handleWindowFocus = () => {
      void loadProfile(false);
    };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadProfile(false);
        }
      };

    window.addEventListener(
      "taskflow-profile-updated",
      handleProfileUpdated,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener(
        "taskflow-profile-updated",
        handleProfileUpdated,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [loadProfile]);

  const initials = useMemo(() => {
    const names =
      user.fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (names.length === 0) {
      return "U";
    }

    if (names.length === 1) {
      return names[0]
        .charAt(0)
        .toUpperCase();
    }

    return `${names[0].charAt(
      0,
    )}${names[
      names.length - 1
    ].charAt(0)}`.toUpperCase();
  }, [user.fullName]);

  const isActive =
    user.status
      .trim()
      .toLowerCase() === "active";

  const profileImageUrl =
    getProfileImageUrl(
      user.profileImage,
      user.updatedAt,
    );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setImageFailed(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [profileImageUrl]);

  const copyAccountId =
    async () => {
      if (!user.id) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          user.id,
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch {
        toast.error(
          "Unable to copy Account ID.",
        );
      }
    };

  if (loading) {
    return (
      <>
        <Toaster
          position="top-right"
        />

        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-blue-600" />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading profile...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 999999,
        }}
        toastOptions={{
          duration: 3000,

          style: {
            minWidth: "280px",
            borderRadius: "14px",
            background: "#ffffff",
            color: "#0f172a",
            padding: "14px 18px",
            fontSize: "14px",
            fontWeight: "600",
            border:
              "1px solid #e2e8f0",
            boxShadow:
              "0 15px 35px rgba(15, 23, 42, 0.18)",
          },
        }}
      />

      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-2xl">
              My Profile
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View your personal and
              account information.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadProfile(false)
            }
            disabled={isRefreshing}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isRefreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>

        {loadError && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-amber-800">
              Latest profile could not
              be loaded. Showing saved
              information.
            </p>

            <button
              type="button"
              onClick={() =>
                void loadProfile(false)
              }
              className="text-sm font-bold text-amber-900 underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          {/* Left side */}
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="h-28 bg-gradient-to-br from-[#0B2F7A] via-[#0D8CFF] to-[#10C9A7]" />

              <div className="-mt-14 px-5 pb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-100 to-emerald-100 text-3xl font-extrabold text-blue-700 shadow-lg">
                    {profileImageUrl &&
                    !imageFailed ? (
                      <img
                        src={
                          profileImageUrl
                        }
                        alt={
                          user.fullName
                        }
                        className="h-full w-full object-cover"
                        onError={() =>
                          setImageFailed(
                            true,
                          )
                        }
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <h2 className="mt-4 text-xl font-extrabold text-slate-900">
                    {user.fullName}
                  </h2>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {user.email ||
                      "Email not available"}
                  </p>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold capitalize text-blue-700">
                      <ShieldCheck className="h-3.5 w-3.5" />

                      {user.role}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                        }`}
                      />

                      {isActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                  <Link
                    href="/user/settings/profile/edit"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    <Pencil className="h-4 w-4" />

                    Edit Profile
                  </Link>

                  <Link
                    href="/user/settings/change-password"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <KeyRound className="h-4 w-4" />

                    Change Password
                  </Link>
                </div>
              </div>
            </section>

            {/* Account ID */}
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
                      Account ID
                    </p>

                    <p className="mt-1 break-all text-sm font-bold">
                      {user.id ||
                        "Not available"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyAccountId}
                  disabled={!user.id}
                  title="Copy Account ID"
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

          {/* Right side */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Personal Information
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Your personal and
                      contact details.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6">
                <InfoCard
                  icon={UserRound}
                  label="Full Name"
                  value={user.fullName}
                />

                <InfoCard
                  icon={Mail}
                  label="Email Address"
                  value={
                    user.email ||
                    "Not available"
                  }
                />

                <InfoCard
                  icon={Phone}
                  label="Mobile Number"
                  value={
                    user.phoneNumber ||
                    "Not available"
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                    <BadgeCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Account Information
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Role, status and
                      account dates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6">
                <InfoCard
                  icon={ShieldCheck}
                  label="Role"
                  value={capitalize(
                    user.role,
                  )}
                />

                <InfoCard
                  icon={
                    CheckCircle2
                  }
                  label="Status"
                  value={
                    isActive
                      ? "Active"
                      : "Inactive"
                  }
                />

                <InfoCard
                  icon={CalendarDays}
                  label="Created On"
                  value={formatDate(
                    user.createdAt,
                  )}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="h-full rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
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

function formatDate(
  value: string,
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}
