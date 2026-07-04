"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Flag,
  FolderKanban,
  LoaderCircle,
  Save,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import Footer from "@/src/components/layout/Footer";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";

type ProjectPriority = "low" | "medium" | "high";

type ProjectStatus =
  | "planning"
  | "active"
  | "in_progress"
  | "pending"
  | "on_hold"
  | "admin_hold"
  | "completed"
  | "cancelled";

interface ProjectMember {
  id: string;
  fullName: string;
  email: string;
  profileImage?: string | null;
  status?: string;
}

interface ProjectCreator {
  id: string;
  fullName: string;
  email: string;
  profileImage?: string | null;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: ProjectCreator;
  members: ProjectMember[];
}

interface ProjectResponse {
  message: string;
  project: Project;
}

interface BackendErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

interface StoredUser {
  fullName?: string;
  name?: string;
}

interface EditProjectFormData {
  name: string;
  description: string;
  startDate: string;
  dueDate: string;
  priority: ProjectPriority;
  status: ProjectStatus;
}

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const initialFormData: EditProjectFormData = {
  name: "",
  description: "",
  startDate: "",
  dueDate: "",
  priority: "medium",
  status: "planning",
};

function getStoredToken() {
  return (
    localStorage.getItem("taskflow_token") ||
    sessionStorage.getItem("taskflow_token")
  );
}

function clearStoredSession() {
  localStorage.removeItem("taskflow_token");
  localStorage.removeItem("taskflow_user");

  sessionStorage.removeItem("taskflow_token");
  sessionStorage.removeItem("taskflow_user");
}

function getBackendErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
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
    return backendMessage.join(", ");
  }

  if (typeof backendMessage === "string") {
    return backendMessage;
  }

  if (!error.response) {
    return "Backend server is not reachable.";
  }

  return fallbackMessage;
}

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export default function EditProjectPage() {
  const router = useRouter();

  const params = useParams<{
    id: string;
  }>();

  const projectId = params.id;

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [adminName, setAdminName] =
    useState("Admin");

  const [project, setProject] =
    useState<Project | null>(null);

  const [formData, setFormData] =
    useState<EditProjectFormData>(
      initialFormData,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [projectNotFound, setProjectNotFound] =
    useState(false);

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

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleUnauthorized =
    useCallback(() => {
      clearStoredSession();

      toast.error(
        "Your login session has expired.",
      );

      window.setTimeout(() => {
        router.replace("/login");
      }, 700);
    }, [router]);

  const fetchProject = useCallback(
    async () => {
      if (!projectId) {
        setProjectNotFound(true);
        setIsLoading(false);
        return;
      }

      const token = getStoredToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      setIsLoading(true);
      setProjectNotFound(false);

      try {
        const response =
          await axios.get<ProjectResponse>(
            `${apiUrl}/projects/${projectId}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const fetchedProject =
          response.data.project;

        setProject(fetchedProject);

        setFormData({
          name: fetchedProject.name,
          description:
            fetchedProject.description || "",
          startDate: toDateInput(
            fetchedProject.startDate,
          ),
          dueDate: toDateInput(
            fetchedProject.dueDate,
          ),
          priority:
            fetchedProject.priority,
          status: fetchedProject.status,
        });
      } catch (error) {
        console.error(
          "Fetch project error:",
          error,
        );

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          handleUnauthorized();
          return;
        }

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 404
        ) {
          setProjectNotFound(true);
          return;
        }

        toast.error(
          getBackendErrorMessage(
            error,
            "Unable to load project.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      handleUnauthorized,
      projectId,
    ],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchProject();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchProject]);

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

  const handleAdminHoldChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const holdValue = event.target.value;

    setFormData((previous) => ({
      ...previous,
      status:
        holdValue === "admin_hold"
          ? "admin_hold"
          : project?.status === "on_hold" ||
              project?.status === "admin_hold"
            ? "planning"
            : project?.status ||
              previous.status,
    }));
  };

  const resetForm = () => {
    if (!project) {
      return;
    }

    setFormData({
      name: project.name,
      description:
        project.description || "",
      startDate: toDateInput(
        project.startDate,
      ),
      dueDate: toDateInput(
        project.dueDate,
      ),
      priority: project.priority,
      status: project.status,
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !projectId ||
      isSubmitting
    ) {
      return;
    }

    const projectName =
      formData.name.trim();

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

    const token = getStoredToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await axios.patch<ProjectResponse>(
          `${apiUrl}/projects/${projectId}`,
          {
            name: projectName,
            description,
            startDate:
              startDate.toISOString(),
            dueDate:
              dueDate.toISOString(),
            priority:
              formData.priority,
            status: formData.status,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
          },
        );

      setProject(
        response.data.project,
      );

      toast.success(
        "Project updated successfully",
      );

      window.setTimeout(() => {
        router.push(
          "/admin/projects",
        );
      }, 700);
    } catch (error) {
      console.error(
        "Update project error:",
        error,
      );

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        handleUnauthorized();
        return;
      }

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 404
      ) {
        setProjectNotFound(true);
        return;
      }

      toast.error(
        getBackendErrorMessage(
          error,
          "Unable to update project.",
        ),
      );
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

      <div className="relative z-50 shrink-0">
        <Header
          userName={adminName}
          setSidebarOpen={
            setSidebarOpen
          }
        />
      </div>

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

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              {isLoading ? (
                <LoadingState />
              ) : projectNotFound ? (
                <ProjectNotFound
                  onBack={() =>
                    router.push(
                      "/admin/projects",
                    )
                  }
                />
              ) : (
                <>
                  <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                        Edit Project
                      </h1>

                      <p className="mt-1 text-sm text-slate-500">
                        Update project
                        information, timeline,
                        priority and admin hold state.
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
                      <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                          <FolderKanban className="h-6 w-6" />
                        </div>

                        <div className="min-w-0">
                          <h2 className="truncate font-bold text-slate-900">
                            {project?.name ||
                              "Project Information"}
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            Edit the existing
                            project details.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6 p-5 sm:p-6">
                        <FormField
                          label="Project Name"
                          required
                        >
                          <div className="relative">
                            <FolderKanban className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                              type="text"
                              name="name"
                              value={
                                formData.name
                              }
                              onChange={
                                handleInputChange
                              }
                              placeholder="Enter project name"
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
                              placeholder="Write a short project description..."
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
                                  undefined
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

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

                          <FormField label="Admin Control">
                            <div className="relative">
                              <CheckCircle2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                              <select
                                value={
                                  formData.status ===
                                    "on_hold" ||
                                  formData.status ===
                                    "admin_hold"
                                    ? "admin_hold"
                                    : "keep"
                                }
                                onChange={
                                  handleAdminHoldChange
                                }
                                disabled={
                                  isSubmitting
                                }
                                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <option value="keep">
                                  No Admin Hold
                                </option>

                                <option value="admin_hold">
                                  Admin Hold
                                </option>
                              </select>

                              <SelectArrow />
                            </div>

                          </FormField>
                        </div>

                      </div>

                      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
                        <button
                          type="button"
                          onClick={resetForm}
                          disabled={
                            isSubmitting
                          }
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reset Changes
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
                              Updating...
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
                  </form>
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

function LoadingState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />

        <p className="mt-4 text-sm font-semibold text-slate-600">
          Loading project...
        </p>
      </div>
    </div>
  );
}

function ProjectNotFound({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <FolderKanban className="h-8 w-8" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Project not found
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          The project may have been deleted
          or the project ID is invalid.
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </button>
      </div>
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

