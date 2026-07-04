"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";

import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
} from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

type UserStatus = "active" | "inactive";

interface TaskFlowUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  profileImage?: string | null;
  role?: string;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

interface StoredAdmin {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  profileImage?: string | null;
  role?: string;
}

interface UserApiResponse {
  message?: string;
  user?: TaskFlowUser;

  data?:
    | TaskFlowUser
    | {
        user?: TaskFlowUser;
      };
}

interface BackendErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
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

function getAuthHeaders() {
  const token = getToken();

  return {
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

function getStoredAdmin(): StoredAdmin | null {
  const storedAdminText =
    localStorage.getItem("taskflow_user") ||
    sessionStorage.getItem("taskflow_user");

  if (!storedAdminText) {
    return null;
  }

  try {
    return JSON.parse(
      storedAdminText,
    ) as StoredAdmin;
  } catch {
    return null;
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
    profileImage.startsWith("/") ? "" : "/"
  }${profileImage}`;
}

function getUserFromResponse(
  responseData: unknown,
): TaskFlowUser | null {
  if (
    typeof responseData !== "object" ||
    responseData === null
  ) {
    return null;
  }

  const data =
    responseData as UserApiResponse &
      Partial<TaskFlowUser>;

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

    if (
      "id" in data.data &&
      typeof data.data.id === "string"
    ) {
      return data.data as TaskFlowUser;
    }
  }

  if (
    typeof data.id === "string" &&
    typeof data.fullName === "string"
  ) {
    return data as TaskFlowUser;
  }

  return null;
}

function getResponseMessage(
  responseData: unknown,
): string | null {
  if (
    typeof responseData !== "object" ||
    responseData === null
  ) {
    return null;
  }

  const message = (
    responseData as UserApiResponse
  ).message;

  return typeof message === "string"
    ? message
    : null;
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (
    !axios.isAxiosError<BackendErrorResponse>(
      error,
    )
  ) {
    return fallbackMessage;
  }

  const backendMessage =
    error.response?.data?.message;

  if (Array.isArray(backendMessage)) {
    return backendMessage.join(" ");
  }

  if (
    typeof backendMessage === "string"
  ) {
    return backendMessage;
  }

  if (!error.response) {
    return "Backend server is not reachable. Please make sure it is running on port 5000.";
  }

  if (error.response.status === 401) {
    return "Your login session has expired. Please login again.";
  }

  if (error.response.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (error.response.status === 404) {
    return "User not found.";
  }

  return fallbackMessage;
}

export default function ViewUserPage() {
  const params = useParams();
  const router = useRouter();

  const userId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [adminName, setAdminName] =
    useState("Admin");

  const [
    adminProfileImage,
    setAdminProfileImage,
  ] = useState<string | null>(null);

  const [user, setUser] =
    useState<TaskFlowUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isUpdatingStatus,
    setIsUpdatingStatus,
  ] = useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const loadStoredAdmin =
    useCallback(() => {
      const storedAdmin = getStoredAdmin();

      if (!storedAdmin) {
        setAdminName("Admin");
        setAdminProfileImage(null);
        return;
      }

      setAdminName(
        storedAdmin.fullName ||
          storedAdmin.name ||
          "Admin",
      );

      setAdminProfileImage(
        getProfileImageUrl(
          storedAdmin.profileImage,
        ),
      );
    }, []);

  useEffect(() => {
    loadStoredAdmin();

    const handleAdminProfileUpdated =
      () => {
        loadStoredAdmin();
      };

    window.addEventListener(
      "taskflow-profile-updated",
      handleAdminProfileUpdated,
    );

    return () => {
      window.removeEventListener(
        "taskflow-profile-updated",
        handleAdminProfileUpdated,
      );
    };
  }, [loadStoredAdmin]);

  const fetchUser = useCallback(
    async () => {
      if (!userId) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const token = getToken();

      if (!token) {
        toast.error(
          "Login session not found. Please login again.",
        );

        setIsLoading(false);
        router.replace("/login");
        return;
      }

      try {
        setIsLoading(true);

        const response =
          await axios.get<unknown>(
            `${API_URL}/users/${userId}`,
            {
              headers: getAuthHeaders(),

              params: {
                _t: Date.now(),
              },
            },
          );

        const fetchedUser =
          getUserFromResponse(
            response.data,
          );

        if (!fetchedUser) {
          throw new Error(
            "User was not returned by the server.",
          );
        }

        setUser(fetchedUser);
      } catch (error: unknown) {
        setUser(null);

        toast.error(
          getErrorMessage(
            error,
            "Unable to load user details.",
          ),
        );

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          router.replace("/login");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [router, userId],
  );

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const handleStatusChange =
    async () => {
      if (
        !user ||
        isUpdatingStatus ||
        isDeleting
      ) {
        return;
      }

      const token = getToken();

      if (!token) {
        toast.error(
          "Login session not found. Please login again.",
        );

        router.replace("/login");
        return;
      }

      const newStatus: UserStatus =
        user.status === "active"
          ? "inactive"
          : "active";

      try {
        setIsUpdatingStatus(true);

        const response =
          await axios.patch<unknown>(
            `${API_URL}/users/${user.id}/status`,
            {
              status: newStatus,
            },
            {
              headers: {
                "Content-Type":
                  "application/json",

                ...getAuthHeaders(),
              },
            },
          );

        const responseUser =
          getUserFromResponse(
            response.data,
          );

        const updatedUser: TaskFlowUser =
          responseUser || {
            ...user,
            status: newStatus,
            updatedAt:
              new Date().toISOString(),
          };

        setUser(updatedUser);

        window.dispatchEvent(
          new CustomEvent(
            "taskflow-user-updated",
            {
              detail: updatedUser,
            },
          ),
        );

        toast.success(
          getResponseMessage(
            response.data,
          ) ||
            (newStatus === "active"
              ? "User activated successfully."
              : "User deactivated successfully."),
        );
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Unable to update user status.",
          ),
        );

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          router.replace("/login");
        }
      } finally {
        setIsUpdatingStatus(false);
      }
    };

  const confirmDelete = () => {
    if (
      !user ||
      isDeleting ||
      isUpdatingStatus
    ) {
      return;
    }

    const confirmationToastId =
      "view-page-delete-user-confirmation";

    toast.dismiss(
      confirmationToastId,
    );

    toast(
      (toastItem) => (
        <div className="w-[300px]">
          <h3 className="text-center font-bold text-slate-900">
            Delete user?
          </h3>

          <p className="mt-2 text-center text-sm leading-6 text-slate-600">
            Are you sure you want to
            delete{" "}
            <span className="font-bold text-slate-900">
              {user.fullName}
            </span>
            ?
          </p>

          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                toast.dismiss(
                  toastItem.id,
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                toast.dismiss(
                  toastItem.id,
                );

                void handleDelete();
              }}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        id: confirmationToastId,
        duration: Infinity,
        position: "top-center",

        style: {
          padding: "18px",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow:
            "0 20px 45px rgba(15, 23, 42, 0.25)",
        },
      },
    );
  };

  const handleDelete = async () => {
    if (
      !user ||
      isDeleting ||
      isUpdatingStatus
    ) {
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error(
        "Login session not found. Please login again.",
      );

      router.replace("/login");
      return;
    }

    try {
      setIsDeleting(true);

      await axios.delete(
        `${API_URL}/users/${user.id}`,
        {
          headers: getAuthHeaders(),
        },
      );

      toast.success(
        `${user.fullName} deleted successfully.`,
      );

      window.setTimeout(() => {
        router.replace("/admin/users");
        router.refresh();
      }, 1000);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to delete user.",
        ),
      );

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        router.replace("/login");
      }

      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
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

          success: {
            iconTheme: {
              primary: "#059669",
              secondary: "#ffffff",
            },
          },

          error: {
            duration: 4000,

            iconTheme: {
              primary: "#dc2626",
              secondary: "#ffffff",
            },
          },
        }}
      />

      {/* Header */}
      <div className="relative z-50 shrink-0">
        <Header
          userName={adminName}
          profileImage={
            adminProfileImage
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
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Admin sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64
            bg-slate-950 pt-16
            transition-transform duration-300
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
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              {isLoading ? (
                <LoadingState />
              ) : !user ? (
                <UserNotFound />
              ) : (
                <UserProfileContent
                  user={user}
                  isUpdatingStatus={
                    isUpdatingStatus
                  }
                  isDeleting={isDeleting}
                  onStatusChange={
                    handleStatusChange
                  }
                  onDelete={
                    confirmDelete
                  }
                />
              )}
            </div>
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

interface UserProfileContentProps {
  user: TaskFlowUser;
  isUpdatingStatus: boolean;
  isDeleting: boolean;
  onStatusChange: () => void;
  onDelete: () => void;
}

function UserProfileContent({
  user,
  isUpdatingStatus,
  isDeleting,
  onStatusChange,
  onDelete,
}: UserProfileContentProps) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const initials =
    getInitials(user.fullName);

  const profileImageUrl =
    getProfileImageUrl(
      user.profileImage,
    );

  useEffect(() => {
    setImageFailed(false);
  }, [profileImageUrl]);

  return (
    <>
      {/* Page heading */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/users"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to users
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-2xl">
            User Profile
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View and manage user account
            information.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/admin/users/${user.id}/edit`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Edit3 className="h-4 w-4" />
            Edit User
          </Link>

          <button
            type="button"
            onClick={onStatusChange}
            disabled={
              isUpdatingStatus ||
              isDeleting
            }
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              user.status === "active"
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {isUpdatingStatus ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : user.status ===
              "active" ? (
              <>
                <UserX className="h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                Activate
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={
              isDeleting ||
              isUpdatingStatus
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete User
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Profile card */}
        <section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {profileImageUrl &&
          !imageFailed ? (
            <img
              src={profileImageUrl}
              alt={user.fullName}
              className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-emerald-100"
              onError={() =>
                setImageFailed(true)
              }
            />
          ) : (
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl font-bold text-white ring-4 ring-emerald-100">
              {initials}
            </div>
          )}

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            {user.fullName}
          </h2>

          <p className="mt-1 text-sm font-medium capitalize text-slate-500">
            {user.role || "Team Member"}
          </p>

          <div className="mt-4">
            <StatusBadge
              status={user.status}
            />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Account ID
            </p>

            <p className="mt-2 break-all text-sm font-medium text-slate-600">
              {user.id}
            </p>
          </div>
        </section>

        {/* User information */}
        <div className="space-y-6">
          {/* Personal Information */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Personal Information
                  </h2>

                  <p className="text-sm text-slate-500">
                    User contact and account
                    details.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7">
              <DetailCard
                label="Full Name"
                value={user.fullName}
                icon={
                  <UserRound className="h-5 w-5" />
                }
              />

              <DetailCard
                label="Role"
                value={capitalize(
                  user.role ||
                    "Team Member",
                )}
                icon={
                  <ShieldCheck className="h-5 w-5" />
                }
              />

              <DetailCard
                label="Email Address"
                value={
                  user.email ||
                  "Not available"
                }
                icon={
                  <Mail className="h-5 w-5" />
                }
              />

              <DetailCard
                label="Mobile Number"
                value={
                  user.phoneNumber ||
                  "Not available"
                }
                icon={
                  <Phone className="h-5 w-5" />
                }
              />
            </div>
          </section>

          {/* Account Information */}
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <h2 className="font-bold text-slate-900">
                Account Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                User account status and
                timestamps.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3 sm:p-7">
              <DetailCard
                label="Account Status"
                value={capitalize(
                  user.status,
                )}
                icon={
                  user.status ===
                  "active" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <UserX className="h-5 w-5" />
                  )
                }
              />

              <DetailCard
                label="Created On"
                value={formatDate(
                  user.createdAt,
                )}
                icon={
                  <CalendarDays className="h-5 w-5" />
                }
              />

              <DetailCard
                label="Last Updated"
                value={formatDate(
                  user.updatedAt,
                )}
                icon={
                  <Clock3 className="h-5 w-5" />
                }
              />
            </div>
          </section>
        </div>
      </div>
    </>
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-bold text-slate-800">
            {value || "Not available"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: UserStatus;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold capitalize ${
        status === "active"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status === "active"
            ? "bg-emerald-500"
            : "bg-rose-500"
        }`}
      />

      {status}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />

        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading user details...
        </p>
      </div>
    </div>
  );
}

function UserNotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <UserRound className="h-8 w-8" />
      </div>

      <h1 className="mt-4 text-xl font-bold text-slate-900">
        User not found
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        The requested user does not exist or
        may have been deleted.
      </p>

      <Link
        href="/admin/users"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>
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
    return "U";
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
