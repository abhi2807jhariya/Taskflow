"use client";

import {
  type ChangeEvent,
  type FormEvent,
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
import toast, {
  Toaster,
} from "react-hot-toast";

import {
  ArrowLeft,
  LoaderCircle,
  Mail,
  Phone,
  Save,
  UserRound,
} from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

type UserStatus =
  | "active"
  | "inactive";

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
  profileImage?: string | null;
}

interface BackendErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

interface EditUserFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

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

function getAuthHeaders() {
  const token = getToken();

  return {
    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),
  };
}

function getStoredAdmin():
  | StoredAdmin
  | null {
  const storedAdminText =
    localStorage.getItem(
      "taskflow_user",
    ) ||
    sessionStorage.getItem(
      "taskflow_user",
    );

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
    profileImage.startsWith(
      "data:",
    ) ||
    profileImage.startsWith(
      "blob:",
    ) ||
    profileImage.startsWith(
      "http://",
    ) ||
    profileImage.startsWith(
      "https://",
    )
  ) {
    return profileImage;
  }

  return `${API_URL}${
    profileImage.startsWith("/")
      ? ""
      : "/"
  }${profileImage}`;
}

function isObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getUserFromResponse(
  responseData: unknown,
): TaskFlowUser | null {
  if (!isObject(responseData)) {
    return null;
  }

  if (isObject(responseData.user)) {
    return normalizeUser(
      responseData.user as unknown as TaskFlowUser,
    );
  }

  if (isObject(responseData.data)) {
    if (
      isObject(
        responseData.data.user,
      )
    ) {
      return normalizeUser(
        responseData.data
          .user as unknown as TaskFlowUser,
      );
    }

    if (
      typeof responseData.data
        .id === "string"
    ) {
      return normalizeUser(
        responseData.data as unknown as TaskFlowUser,
      );
    }
  }

  if (
    typeof responseData.id ===
      "string" &&
    typeof responseData.fullName ===
      "string"
  ) {
    return normalizeUser(
      responseData as unknown as TaskFlowUser,
    );
  }

  return null;
}

function normalizeUser(
  user: TaskFlowUser,
): TaskFlowUser {
  return {
    id: user.id,

    fullName:
      user.fullName || "",

    email:
      user.email || "",

    phoneNumber:
      user.phoneNumber ?? null,

    profileImage:
      user.profileImage ?? null,

    role:
      user.role || "user",

    status:
      user.status === "inactive"
        ? "inactive"
        : "active",

    createdAt:
      user.createdAt || "",

    updatedAt:
      user.updatedAt || "",
  };
}

function getResponseMessage(
  responseData: unknown,
): string | null {
  if (!isObject(responseData)) {
    return null;
  }

  return typeof responseData.message ===
    "string"
    ? responseData.message
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
    if (
      error instanceof Error &&
      error.message
    ) {
      return error.message;
    }

    return fallbackMessage;
  }

  const backendMessage =
    error.response?.data?.message;

  if (
    Array.isArray(
      backendMessage,
    )
  ) {
    return backendMessage.join(
      " ",
    );
  }

  if (
    typeof backendMessage ===
    "string"
  ) {
    return backendMessage;
  }

  if (!error.response) {
    return "Backend server is not reachable. Please make sure it is running on port 5000.";
  }

  if (
    error.response.status === 401
  ) {
    return "Your login session has expired. Please login again.";
  }

  if (
    error.response.status === 403
  ) {
    return "You do not have permission to edit this user.";
  }

  if (
    error.response.status === 404
  ) {
    return "User not found.";
  }

  if (
    error.response.status === 409
  ) {
    return "This email address or mobile number is already being used.";
  }

  return fallbackMessage;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();

  const userId = Array.isArray(
    params.id,
  )
    ? params.id[0]
    : params.id;

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    adminName,
    setAdminName,
  ] = useState("Admin");

  const [
    adminProfileImage,
    setAdminProfileImage,
  ] = useState<string | null>(
    null,
  );

  const [user, setUser] =
    useState<TaskFlowUser | null>(
      null,
    );

  const [
    formData,
    setFormData,
  ] = useState<EditUserFormData>({
    fullName: "",
    email: "",
    phoneNumber: "",
  });

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isUserNotFound,
    setIsUserNotFound,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(
    null,
  );

  const loadStoredAdmin =
    useCallback(() => {
      const storedAdmin =
        getStoredAdmin();

      if (!storedAdmin) {
        setAdminName("Admin");

        setAdminProfileImage(
          null,
        );

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
    const timeoutId =
      window.setTimeout(() => {
        loadStoredAdmin();
      }, 0);

    const handleAdminUpdated =
      () => {
        loadStoredAdmin();
      };

    window.addEventListener(
      "taskflow-profile-updated",
      handleAdminUpdated,
    );

    window.addEventListener(
      "storage",
      handleAdminUpdated,
    );

    return () => {
      window.clearTimeout(
        timeoutId,
      );

      window.removeEventListener(
        "taskflow-profile-updated",
        handleAdminUpdated,
      );

      window.removeEventListener(
        "storage",
        handleAdminUpdated,
      );
    };
  }, [loadStoredAdmin]);

  const fetchUser =
    useCallback(async () => {
      if (!userId) {
        setUser(null);
        setIsUserNotFound(true);
        setLoadError(null);
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
        setLoadError(null);
        setIsUserNotFound(false);

        const response =
          await axios.get<unknown>(
            `${API_URL}/users/${userId}`,
            {
              headers:
                getAuthHeaders(),

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
            "User details were not returned by the server.",
          );
        }

        setUser(fetchedUser);

        setFormData({
          fullName:
            fetchedUser.fullName,

          email:
            fetchedUser.email,

          phoneNumber:
            fetchedUser.phoneNumber ||
            "",
        });

        setErrors({});
      } catch (error: unknown) {
        setUser(null);

        if (
          axios.isAxiosError(
            error,
          ) &&
          error.response?.status ===
            401
        ) {
          toast.error(
            getErrorMessage(
              error,
              "Login session expired.",
            ),
          );

          router.replace(
            "/login",
          );

          return;
        }

        if (
          axios.isAxiosError(
            error,
          ) &&
          error.response?.status ===
            404
        ) {
          setIsUserNotFound(
            true,
          );

          setLoadError(null);
          return;
        }

        const message =
          getErrorMessage(
            error,
            "Unable to load user details.",
          );

        setLoadError(message);

        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }, [router, userId]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void fetchUser();
      }, 0);

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [fetchUser]);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } =
      event.target;

    if (
      name === "phoneNumber"
    ) {
      const numbersOnly =
        value
          .replace(/\D/g, "")
          .slice(0, 10);

      setFormData(
        (previousData) => ({
          ...previousData,
          phoneNumber:
            numbersOnly,
        }),
      );
    } else {
      setFormData(
        (previousData) => ({
          ...previousData,
          [name]: value,
        }),
      );
    }

    setErrors(
      (previousErrors) => ({
        ...previousErrors,

        [name]: undefined,
      }),
    );
  };

  const validateForm =
    (): boolean => {
      const newErrors: FormErrors =
        {};

      const fullName =
        formData.fullName.trim();

      const email =
        formData.email
          .trim()
          .toLowerCase();

      const phoneNumber =
        formData.phoneNumber.trim();

      if (!fullName) {
        newErrors.fullName =
          "Full name is required.";
      } else if (
        fullName.length < 3
      ) {
        newErrors.fullName =
          "Full name must contain at least 3 characters.";
      }

      if (!email) {
        newErrors.email =
          "Email address is required.";
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email,
        )
      ) {
        newErrors.email =
          "Please enter a valid email address.";
      }

      if (!phoneNumber) {
        newErrors.phoneNumber =
          "Mobile number is required.";
      } else if (
        !/^[0-9]{10}$/.test(
          phoneNumber,
        )
      ) {
        newErrors.phoneNumber =
          "Mobile number must contain exactly 10 digits.";
      }

      setErrors(newErrors);

      return (
        Object.keys(newErrors)
          .length === 0
      );
    };

  const hasFormChanged =
    (): boolean => {
      if (!user) {
        return false;
      }

      return (
        formData.fullName.trim() !==
          user.fullName.trim() ||
        formData.email
          .trim()
          .toLowerCase() !==
          user.email
            .trim()
            .toLowerCase() ||
        formData.phoneNumber.trim() !==
          (user.phoneNumber ||
            "").trim()
      );
    };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !user ||
      isSubmitting
    ) {
      return;
    }

    if (!validateForm()) {
      toast.error(
        "Please correct the form errors.",
      );

      return;
    }

    if (!hasFormChanged()) {
      toast.error(
        "No changes were made to the user.",
      );

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

    const updatePayload = {
      fullName:
        formData.fullName.trim(),

      email:
        formData.email
          .trim()
          .toLowerCase(),

      phoneNumber:
        formData.phoneNumber.trim(),
    };

    try {
      setIsSubmitting(true);

      const response =
        await axios.patch<unknown>(
          `${API_URL}/users/${user.id}`,
          updatePayload,
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

      const updatedUser =
        responseUser ||
        normalizeUser({
          ...user,
          ...updatePayload,

          updatedAt:
            new Date().toISOString(),
        });

      setUser(updatedUser);

      setFormData({
        fullName:
          updatedUser.fullName,

        email:
          updatedUser.email,

        phoneNumber:
          updatedUser.phoneNumber ||
          "",
      });

      setErrors({});

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
          "User updated successfully.",
      );

      window.setTimeout(() => {
        router.push(
          `/admin/users/${user.id}`,
        );

        router.refresh();
      }, 1000);
    } catch (error: unknown) {
      const message =
        getErrorMessage(
          error,
          "Unable to update user.",
        );

      toast.error(message);

      if (
        axios.isAxiosError(
          error,
        ) &&
        error.response?.status ===
          401
      ) {
        router.replace("/login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (
      !user ||
      isSubmitting
    ) {
      return;
    }

    setFormData({
      fullName:
        user.fullName || "",

      email:
        user.email || "",

      phoneNumber:
        user.phoneNumber || "",
    });

    setErrors({});
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

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              {isLoading ? (
                <LoadingState />
              ) : isUserNotFound ? (
                <UserNotFound />
              ) : loadError ? (
                <LoadErrorState
                  message={loadError}
                  onRetry={() =>
                    void fetchUser()
                  }
                />
              ) : !user ? (
                <UserNotFound />
              ) : (
                <>
                  {/* Page heading */}
                  <div className="mb-6">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
                    >
                      <ArrowLeft className="h-4 w-4" />

                      Back to user profile
                    </Link>

                    <h1 className="text-2xl font-bold text-slate-900 sm:text-2xl">
                      Edit User
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                      Update the user&apos;s
                      personal and contact
                      information.
                    </p>
                  </div>

                  <div>
                    {/* Edit form */}
                    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <UserRound className="h-5 w-5" />
                          </div>

                          <div>
                            <h2 className="font-bold text-slate-900">
                              User information
                            </h2>

                            <p className="text-sm text-slate-500">
                              Edit the fields below
                              and save your changes.
                            </p>
                          </div>
                        </div>
                      </div>

                      <form
                        id="edit-user-form"
                        onSubmit={handleSubmit}
                        noValidate
                        className="p-5 sm:p-8"
                      >
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                          <FormField
                            label="Full Name"
                            htmlFor="fullName"
                            required
                            error={
                              errors.fullName
                            }
                          >
                            <div className="relative">
                              <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                              <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                value={
                                  formData.fullName
                                }
                                onChange={
                                  handleInputChange
                                }
                                disabled={
                                  isSubmitting
                                }
                                placeholder="Enter full name"
                                autoComplete="name"
                                className={getInputClass(
                                  Boolean(
                                    errors.fullName,
                                  ),
                                )}
                              />
                            </div>
                          </FormField>

                          <FormField
                            label="Email Address"
                            htmlFor="email"
                            required
                            error={errors.email}
                          >
                            <div className="relative">
                              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                              <input
                                id="email"
                                name="email"
                                type="email"
                                value={
                                  formData.email
                                }
                                onChange={
                                  handleInputChange
                                }
                                disabled={
                                  isSubmitting
                                }
                                placeholder="Enter email address"
                                autoComplete="email"
                                className={getInputClass(
                                  Boolean(
                                    errors.email,
                                  ),
                                )}
                              />
                            </div>
                          </FormField>

                          <FormField
                            label="Mobile Number"
                            htmlFor="phoneNumber"
                            required
                            error={
                              errors.phoneNumber
                            }
                          >
                            <div className="relative">
                              <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                              <input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                value={
                                  formData.phoneNumber
                                }
                                onChange={
                                  handleInputChange
                                }
                                disabled={
                                  isSubmitting
                                }
                                placeholder="Enter 10 digit mobile number"
                                autoComplete="tel"
                                className={getInputClass(
                                  Boolean(
                                    errors.phoneNumber,
                                  ),
                                )}
                              />
                            </div>
                          </FormField>
                        </div>
                      </form>

                      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:flex-row sm:justify-end sm:px-8">
                        <button
                          type="button"
                          onClick={
                            handleReset
                          }
                          disabled={
                            isSubmitting ||
                            !hasFormChanged()
                          }
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset
                        </button>

                        <Link
                          href={`/admin/users/${user.id}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </Link>

                        <button
                          type="submit"
                          form="edit-user-form"
                          disabled={
                            isSubmitting ||
                            !hasFormChanged()
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <>
                              <LoaderCircle className="h-4 w-4 animate-spin" />

                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />

                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </div>
          </main>

          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  required = false,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
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
        The requested user does not
        exist or may have been deleted.
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

function LoadErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <UserRound className="h-8 w-8" />
      </div>

      <h1 className="mt-4 text-xl font-bold text-slate-900">
        Unable to load user
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        {message}
      </p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/admin/users"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />

          Back to Users
        </Link>

        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function getInputClass(
  hasError: boolean,
): string {
  return `
    h-12 w-full rounded-xl border bg-slate-50
    pl-12 pr-4 text-sm font-medium text-slate-900
    outline-none transition
    placeholder:text-slate-400
    disabled:cursor-not-allowed disabled:opacity-60
    ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10"
        : "border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
    }
  `;
}
