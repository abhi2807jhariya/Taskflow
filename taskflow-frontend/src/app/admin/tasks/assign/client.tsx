"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  FolderKanban,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  UserRoundCheck,
} from "lucide-react";

import Footer from "@/src/components/layout/Footer";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";

interface ProjectOption {
  id: string;
  name: string;
  status?: string;
}

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  status: "active" | "inactive" | string;
}

interface TaskOption {
  id: string;
  projectId: string;
  title: string;
  status: string;
  assignedUserId?: string | null;
}

interface ProjectsResponse {
  projects?: ProjectOption[];
}

interface UsersResponse {
  users?: UserOption[];
}

interface TasksResponse {
  tasks?: TaskOption[];
}

interface BackendErrorResponse {
  message?: string | string[];
}

interface StoredUser {
  fullName?: string;
  name?: string;
}

interface AssignTaskFormData {
  projectId: string;
  userId: string;
  taskId: string;
  assignmentNote: string;
}

const initialFormData: AssignTaskFormData = {
  projectId: "",
  userId: "",
  taskId: "",
  assignmentNote: "",
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

function getToken() {
  return (
    localStorage.getItem("taskflow_token") ||
    sessionStorage.getItem("taskflow_token")
  );
}

function getBackendErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (!axios.isAxiosError<BackendErrorResponse>(error)) {
    return fallback;
  }

  const backendMessage = error.response?.data?.message;

  if (Array.isArray(backendMessage)) {
    return backendMessage.join(" ");
  }

  if (typeof backendMessage === "string") {
    return backendMessage;
  }

  if (!error.response) {
    return "Backend server is not reachable.";
  }

  return fallback;
}

export default function AssignTaskPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [formData, setFormData] =
    useState<AssignTaskFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedUser =
        localStorage.getItem("taskflow_user") ||
        sessionStorage.getItem("taskflow_user");

      if (!storedUser) {
        setAdminName("Admin");
        return;
      }

      try {
        const parsedUser: StoredUser = JSON.parse(storedUser);
        setAdminName(parsedUser.fullName || parsedUser.name || "Admin");
      } catch {
        setAdminName("Admin");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const loadData = async () => {
    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [projectsResponse, usersResponse, tasksResponse] =
        await Promise.all([
          axios.get<ProjectsResponse>(`${API_URL}/projects`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          axios.get<UsersResponse>(`${API_URL}/users`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          axios.get<TasksResponse>(`${API_URL}/tasks`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      setProjects(projectsResponse.data.projects || []);
      setUsers(usersResponse.data.users || []);
      setTasks(tasksResponse.data.tasks || []);
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "Unable to load task data."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const activeProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.status !== "admin_hold" &&
          project.status !== "completed",
      ),
    [projects],
  );

  const activeUsers = useMemo(
    () => users.filter((user) => user.status === "active"),
    [users],
  );

  const assignedUserIds = useMemo(() => {
    const userIds = new Set<string>();

    tasks.forEach((task) => {
      if (task.assignedUserId && task.id !== formData.taskId) {
        userIds.add(task.assignedUserId);
      }
    });

    return userIds;
  }, [formData.taskId, tasks]);

  const selectedProjectTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.projectId === formData.projectId &&
          !task.assignedUserId &&
          task.status !== "completed" &&
          task.status !== "cancelled",
      ),
    [tasks, formData.projectId],
  );

  const handleInputChange = (
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    if (name === "projectId") {
      setFormData((previous) => ({
        ...previous,
        projectId: value,
        userId: "",
        taskId: "",
      }));
      return;
    }

    if (name === "taskId") {
      setFormData((previous) => ({
        ...previous,
        taskId: value,
        userId: "",
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.projectId) {
      toast.error("Please select a project.");
      return;
    }

    if (!formData.taskId) {
      toast.error("Please select a task.");
      return;
    }

    if (!formData.userId) {
      toast.error("Please select a user.");
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.patch<{ task: TaskOption }>(
        `${API_URL}/tasks/${formData.taskId}/assign`,
        {
          userId: formData.userId,
          assignmentNote: formData.assignmentNote.trim() || undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === formData.taskId ? response.data.task : task,
        ),
      );

      toast.success("Task assigned successfully");
      resetForm();

      window.setTimeout(() => {
        router.push("/admin/tasks");
      }, 600);
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "Unable to assign task."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="relative z-50 shrink-0">
        <Header userName={adminName} setSidebarOpen={setSidebarOpen} />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 pt-16 transition-transform duration-300 md:relative md:translate-x-0 md:pt-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Assign Task
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a project, task and active user.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void loadData()}
                    disabled={isLoading || isSubmitting}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/admin/tasks")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tasks
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mx-auto max-w-5xl">
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <UserRoundCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Task Assignment
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Assign an unassigned project task to an active user.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6 p-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <FormField label="Select Project" required>
                        <div className="relative">
                          <FolderKanban className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <select
                            name="projectId"
                            value={formData.projectId}
                            onChange={handleInputChange}
                            disabled={isLoading || isSubmitting}
                            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">
                              {isLoading ? "Loading projects..." : "Select project"}
                            </option>
                            {activeProjects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                          <SelectArrow />
                        </div>
                      </FormField>

                      <FormField label="Select Task" required>
                        <div className="relative">
                          <ListChecks className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <select
                            name="taskId"
                            value={formData.taskId}
                            onChange={handleInputChange}
                            disabled={
                              !formData.projectId ||
                              selectedProjectTasks.length === 0 ||
                              isSubmitting
                            }
                            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">
                              {!formData.projectId
                                ? "First select a project"
                                : selectedProjectTasks.length === 0
                                  ? "No unassigned tasks"
                                  : "Select task"}
                            </option>
                            {selectedProjectTasks.map((task) => (
                              <option key={task.id} value={task.id}>
                                {task.title}
                              </option>
                            ))}
                          </select>
                          <SelectArrow />
                        </div>
                      </FormField>

                    </div>

                    <FormField label="Select User" required>
                      {!formData.taskId ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                          First select a task to choose a user.
                        </div>
                      ) : activeUsers.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                          No active users found.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {activeUsers.map((user) => {
                            const isSelected = formData.userId === user.id;
                            const hasAssignedTask = assignedUserIds.has(user.id);

                            return (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() =>
                                  setFormData((previous) => ({
                                    ...previous,
                                    userId: user.id,
                                  }))
                                }
                                disabled={isSubmitting}
                                className={`flex items-center gap-3 rounded-xl border bg-white p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  isSelected
                                    ? "border-emerald-300 ring-4 ring-emerald-500/10"
                                    : "border-slate-200 hover:border-emerald-200"
                                }`}
                              >
                                <span
                                  className={`h-3 w-3 shrink-0 rounded-full ${
                                    hasAssignedTask
                                      ? "bg-emerald-500"
                                      : "bg-rose-500"
                                  }`}
                                  aria-label={
                                    hasAssignedTask
                                      ? "Already assigned to another task"
                                      : "No current task assignment"
                                  }
                                />
                                <span className="truncate text-sm font-bold text-slate-900">
                                  {user.fullName}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </FormField>

                    <FormField label="Description">
                      <div className="relative">
                        <FileText className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />
                        <textarea
                          name="assignmentNote"
                          value={formData.assignmentNote}
                          onChange={handleInputChange}
                          placeholder="Add assignment description or important information for the user..."
                          rows={5}
                          maxLength={500}
                          disabled={isSubmitting}
                          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                      <div className="mt-2 flex justify-end">
                        <span className="text-xs font-medium text-slate-400">
                          {formData.assignmentNote.length}/500
                        </span>
                      </div>
                    </FormField>
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isSubmitting}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/admin/tasks")}
                      disabled={isSubmitting}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        !formData.projectId ||
                        !formData.userId ||
                        !formData.taskId
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="h-4 w-4" />
                          Assign Task
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
        {required && <span className="ml-1 text-rose-500">*</span>}
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
