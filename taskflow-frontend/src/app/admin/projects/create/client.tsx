"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Flag,
  FolderKanban,
  LoaderCircle,
  Save,
} from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

type ProjectPriority =
  | "low"
  | "medium"
  | "high";

interface ProjectFormData {
  projectName: string;
  description: string;
  startDate: string;
  dueDate: string;
  priority: ProjectPriority;
}

interface StoredUser {
  fullName?: string;
  name?: string;
}

interface BackendErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

const initialFormData: ProjectFormData = {
  projectName: "",
  description: "",
  startDate: "",
  dueDate: "",
  priority: "medium",
};

export default function CreateProjectPage() {
  const router = useRouter();

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [adminName, setAdminName] =
    useState("Admin");

  const [formData, setFormData] =
    useState<ProjectFormData>(
      initialFormData,
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const minimumDate = useMemo(() => {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
      today.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedUser =
        localStorage.getItem(
          "taskflow_user",
        ) ||
        sessionStorage.getItem(
          "taskflow_user",
        );

      if (!storedUser) {
        setAdminName("Admin");
        return;
      }

      try {
        const parsedUser: StoredUser =
          JSON.parse(storedUser);

        setAdminName(
          parsedUser.fullName ||
            parsedUser.name ||
            "Admin",
        );
      } catch {
        setAdminName("Admin");
      }
    }, 0);

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, []);

  const handleInputChange = (
    event: ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >,
  ) => {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const getErrorMessage = (
    error: unknown,
  ): string => {
    if (!axios.isAxiosError<
      BackendErrorResponse
    >(error)) {
      return "Unable to create project.";
    }

    const backendMessage =
      error.response?.data?.message;

    if (Array.isArray(backendMessage)) {
      return backendMessage.join(", ");
    }

    if (
      typeof backendMessage ===
      "string"
    ) {
      return backendMessage;
    }

    if (!error.response) {
      return "Backend server is not reachable.";
    }

    if (
      error.response.status === 401
    ) {
      return "Your login session has expired. Please login again.";
    }

    if (
      error.response.status === 403
    ) {
      return "You are not allowed to create projects.";
    }

    return "Unable to create project.";
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const projectName =
      formData.projectName.trim();

    const description =
      formData.description.trim();

    if (!projectName) {
      toast.error(
        "Project name is required.",
      );
      return;
    }

    if (projectName.length < 2) {
      toast.error(
        "Project name must contain at least 2 characters.",
      );
      return;
    }

    if (!formData.startDate) {
      toast.error(
        "Start date is required.",
      );
      return;
    }

    if (!formData.dueDate) {
      toast.error(
        "Due date is required.",
      );
      return;
    }

    const startDate = new Date(
      `${formData.startDate}T00:00:00.000Z`,
    );

    const dueDate = new Date(
      `${formData.dueDate}T00:00:00.000Z`,
    );

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(dueDate.getTime())
    ) {
      toast.error(
        "Please select valid project dates.",
      );
      return;
    }

    if (dueDate < startDate) {
      toast.error(
        "Due date cannot be earlier than start date.",
      );
      return;
    }

    const token =
      localStorage.getItem(
        "taskflow_token",
      ) ||
      sessionStorage.getItem(
        "taskflow_token",
      );

    if (!token) {
      toast.error(
        "Login session not found. Please login again.",
      );

      window.setTimeout(() => {
        router.replace("/login");
      }, 700);

      return;
    }

    setIsSubmitting(true);

    try {
      const projectData = {
        name: projectName,

        description:
          description || undefined,

        startDate:
          startDate.toISOString(),

        dueDate:
          dueDate.toISOString(),

        priority:
          formData.priority,
      };

      await axios.post(
        `${apiUrl}/projects`,
        projectData,
        {
          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },
        },
      );

      toast.success(
        "Project created successfully",
      );

      resetForm();

      window.setTimeout(() => {
        router.push(
          "/admin/projects",
        );
      }, 700);
    } catch (error) {
      console.error(
        "Create project error:",
        error,
      );

      const errorMessage =
        getErrorMessage(error);

      toast.error(errorMessage);

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        localStorage.removeItem(
          "taskflow_token",
        );
        localStorage.removeItem(
          "taskflow_user",
        );

        sessionStorage.removeItem(
          "taskflow_token",
        );
        sessionStorage.removeItem(
          "taskflow_user",
        );

        window.setTimeout(() => {
          router.replace("/login");
        }, 900);
      }
    } finally {
      setIsSubmitting(false);
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
          setSidebarOpen={
            setSidebarOpen
          }
        />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
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

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 pt-16
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

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              {/* Page heading */}
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Create Project
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Add a new project and
                    define its timeline,
                    priority and current
                    status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/admin/projects",
                    )
                  }
                  disabled={
                    isSubmitting
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Projects
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mx-auto max-w-5xl"
              >
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  {/* Form header */}
                  <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <FolderKanban className="h-6 w-6" />
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-900">
                        Project Information
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Enter the basic
                        details of the new
                        project.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 p-5 sm:p-6">
                    {/* Project name and priority */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <FormField
                        label="Project Name"
                        required
                      >
                        <div className="relative">
                          <FolderKanban className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                          <input
                            type="text"
                            name="projectName"
                            value={
                              formData.projectName
                            }
                            onChange={
                              handleInputChange
                            }
                            placeholder="Example: TaskFlow Development"
                            minLength={2}
                            maxLength={100}
                            autoComplete="off"
                            disabled={
                              isSubmitting
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </FormField>

                      <FormField
                        label="Priority"
                        required
                      >
                        <div className="relative">
                          <Flag className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                          <select
                            name="priority"
                            value={
                              formData.priority
                            }
                            onChange={
                              handleInputChange
                            }
                            disabled={
                              isSubmitting
                            }
                            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="low">
                              Low
                            </option>

                            <option value="medium">
                              Medium
                            </option>

                            <option value="high">
                              High
                            </option>
                          </select>

                          <SelectArrow />
                        </div>
                      </FormField>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <FormField
                        label="Start Date"
                        required
                      >
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                          <input
                            type="date"
                            name="startDate"
                            value={
                              formData.startDate
                            }
                            min={
                              minimumDate
                            }
                            onChange={
                              handleInputChange
                            }
                            disabled={
                              isSubmitting
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </FormField>

                      <FormField
                        label="Due Date"
                        required
                      >
                        <div className="relative">
                          <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                          <input
                            type="date"
                            name="dueDate"
                            value={
                              formData.dueDate
                            }
                            min={
                              formData.startDate ||
                              minimumDate
                            }
                            onChange={
                              handleInputChange
                            }
                            disabled={
                              isSubmitting
                            }
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </FormField>
                    </div>

                    {/* Description */}
                    <FormField label="Project Description">
                      <div className="relative">
                        <FileText className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />

                        <textarea
                          name="description"
                          value={
                            formData.description
                          }
                          onChange={
                            handleInputChange
                          }
                          placeholder="Write a short description about this project..."
                          rows={5}
                          maxLength={1000}
                          disabled={
                            isSubmitting
                          }
                          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>

                      <div className="mt-2 flex justify-end">
                        <span className="text-xs font-medium text-slate-400">
                          {
                            formData
                              .description
                              .length
                          }
                          /1000
                        </span>
                      </div>
                    </FormField>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={
                        isSubmitting
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/admin/projects",
                        )
                      }
                      disabled={
                        isSubmitting
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        isSubmitting
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Create Project
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </form>
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
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}

        {required && (
          <span className="ml-1 text-rose-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function SelectArrow() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z"
      />
    </svg>
  );
}
