"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  AlignLeft,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flag,
  FolderKanban,
  ListTodo,
  LoaderCircle,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react";

import Footer from "@/src/components/layout/Footer";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";

type TaskPriority = "low" | "medium" | "high" | "urgent";
type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";

interface Project {
  id: string;
  name: string;
  priority?: string;
  status?: string;
}

interface TaskUser {
  id: string;
  fullName: string;
  email: string;
  status?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  projectName: string;
  assignedUserId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority?: string;
  status?: string;
  assignmentNote?: string | null;
}

interface TaskResponse {
  task?: Task;
}

interface ProjectsResponse {
  projects?: Project[];
}

interface UsersResponse {
  users?: TaskUser[];
}

interface BackendErrorResponse {
  message?: string | string[];
}

interface StoredUser {
  fullName?: string;
  name?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  projectId: string;
  assignedUserId: string;
  startDate: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignmentNote: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const initialFormData: TaskFormData = {
  title: "",
  description: "",
  projectId: "",
  assignedUserId: "",
  startDate: "",
  dueDate: "",
  priority: "medium",
  status: "pending",
  assignmentNote: "",
};

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

function normalizePriority(priority?: string | null): TaskPriority {
  if (
    priority === "low" ||
    priority === "medium" ||
    priority === "high" ||
    priority === "urgent"
  ) {
    return priority;
  }

  return "medium";
}

function normalizeStatus(status?: string | null): TaskStatus {
  if (status === "in-progress" || status === "in_progress") {
    return "in_progress";
  }

  if (status === "completed") {
    return "completed";
  }

  if (status === "on-hold" || status === "on_hold") {
    return "on_hold";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  return "pending";
}

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function toIsoDate(value: string) {
  return value
    ? new Date(`${value}T00:00:00.000Z`).toISOString()
    : undefined;
}

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [originalTask, setOriginalTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [loading, setLoading] = useState(true);
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
    () => users.filter((user) => user.status !== "inactive"),
    [users],
  );

  const loadData = useCallback(async () => {
    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [taskResponse, projectsResponse, usersResponse] =
        await Promise.all([
          axios.get<TaskResponse>(`${API_URL}/tasks/${taskId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
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
        ]);

      const task = taskResponse.data.task;

      if (!task) {
        throw new Error("Task not found.");
      }

      setOriginalTask(task);
      setProjects(projectsResponse.data.projects || []);
      setUsers(usersResponse.data.users || []);
      setFormData({
        title: task.title,
        description: task.description || "",
        projectId: task.projectId,
        assignedUserId: task.assignedUserId || "",
        startDate: toDateInput(task.startDate),
        dueDate: toDateInput(task.dueDate),
        priority: normalizePriority(task.priority),
        status: normalizeStatus(task.status),
        assignmentNote: task.assignmentNote || "",
      });
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "Unable to load task."));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const handleInputChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    if (!originalTask) {
      return;
    }

    setFormData({
      title: originalTask.title,
      description: originalTask.description || "",
      projectId: originalTask.projectId,
      assignedUserId: originalTask.assignedUserId || "",
      startDate: toDateInput(originalTask.startDate),
      dueDate: toDateInput(originalTask.dueDate),
      priority: normalizePriority(originalTask.priority),
      status: normalizeStatus(originalTask.status),
      assignmentNote: originalTask.assignmentNote || "",
    });
  };

  const dueDateIsInvalid =
    Boolean(formData.startDate && formData.dueDate) &&
    new Date(`${formData.dueDate}T00:00:00`) <
      new Date(`${formData.startDate}T00:00:00`);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    if (!formData.projectId) {
      toast.error("Please select a project.");
      return;
    }

    if (dueDateIsInvalid) {
      toast.error("Due date cannot be earlier than start date.");
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.patch(
        `${API_URL}/tasks/${taskId}`,
        {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          projectId: formData.projectId,
          assignedUserId: formData.assignedUserId || undefined,
          startDate: toIsoDate(formData.startDate),
          dueDate: toIsoDate(formData.dueDate),
          priority: formData.priority,
          status: formData.status,
          assignmentNote: formData.assignmentNote.trim() || undefined,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Task updated successfully");

      window.setTimeout(() => {
        router.push("/admin/tasks");
      }, 600);
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "Unable to update task."));
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
            <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Edit Task
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Update task details, assignment and status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/admin/tasks")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Tasks
                </button>
              </div>

              {loading ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
                  <div className="text-center">
                    <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
                    <p className="mt-3 text-sm font-semibold text-slate-600">
                      Loading task...
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
                      <FormField label="Task Title" required>
                        <div className="relative">
                          <ListTodo className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </FormField>

                      <FormField label="Project" required>
                        <div className="relative">
                          <FolderKanban className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <select
                            name="projectId"
                            value={formData.projectId}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {activeProjects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </FormField>

                      <FormField label="Assigned User">
                        <div className="relative">
                          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <select
                            name="assignedUserId"
                            value={formData.assignedUserId}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">No change / unassigned</option>
                            {activeUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.fullName} - {user.email}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </FormField>

                      <FormField label="Priority" required>
                        <div className="relative">
                          <Flag className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </FormField>

                      <FormField label="Status" required>
                        <div className="relative">
                          <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </FormField>

                      <FormField label="Start Date">
                        <div className="relative">
                          <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <input
                            type="date"
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </FormField>

                      <FormField label="Due Date">
                        <div className="relative">
                          <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          <input
                            type="date"
                            name="dueDate"
                            value={formData.dueDate}
                            min={formData.startDate || undefined}
                            onChange={handleInputChange}
                            disabled={isSubmitting}
                            className={`h-12 w-full rounded-xl border bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                              dueDateIsInvalid
                                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                                : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10"
                            }`}
                          />
                        </div>
                      </FormField>
                    </div>

                    <div className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
                      <FormField label="Description">
                        <div className="relative">
                          <AlignLeft className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={4}
                            disabled={isSubmitting}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium leading-6 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </FormField>

                      <FormField label="Assignment Description">
                        <div className="relative">
                          <AlignLeft className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />
                          <textarea
                            name="assignmentNote"
                            value={formData.assignmentNote}
                            onChange={handleInputChange}
                            rows={4}
                            disabled={isSubmitting}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium leading-6 text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </FormField>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
                      <button
                        type="button"
                        onClick={resetForm}
                        disabled={isSubmitting}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
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
                </form>
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
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}
