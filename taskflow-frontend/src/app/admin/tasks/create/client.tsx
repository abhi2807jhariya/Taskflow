"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  AlignLeft,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flag,
  FolderKanban,
  ListChecks,
  ListTodo,
  LoaderCircle,
  Plus,
  RotateCcw,
  UserRound,
} from "lucide-react";

import Footer from "@/src/components/layout/Footer";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";

type Priority = "low" | "medium" | "high" | "urgent";
type ProjectPriority = "low" | "medium" | "high";
type TaskPriority = Priority | "";

interface StoredUser {
  fullName?: string;
  name?: string;
}

interface Project {
  id: string;
  name: string;
  priority: ProjectPriority;
  status?: string;
  startDate?: string | null;
  dueDate?: string | null;
}

interface TaskUser {
  id: string;
  fullName: string;
  email: string;
  status?: "active" | "inactive" | string;
}

interface ProjectsResponse {
  projects?: Project[];
  data?: Project[];
}

interface UsersResponse {
  users?: TaskUser[];
  data?: TaskUser[];
}

interface BackendErrorResponse {
  message?: string | string[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const priorityLabels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const initialFormState = {
  selectedProjectId: "",
  selectedUserId: "",
  taskTitle: "",
  description: "",
  priority: "" as TaskPriority,
  startDate: "",
  dueDate: "",
};

function getToken() {
  return (
    localStorage.getItem("taskflow_token") ||
    sessionStorage.getItem("taskflow_token")
  );
}

function getRequestHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

function normalizePriority(priority?: string | null): Priority {
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

function toIsoDate(value: string) {
  return value
    ? new Date(`${value}T00:00:00.000Z`).toISOString()
    : undefined;
}

function toDateValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function CreateTaskPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState(
    initialFormState.selectedProjectId,
  );
  const [selectedUserId, setSelectedUserId] = useState(
    initialFormState.selectedUserId,
  );
  const [taskTitle, setTaskTitle] = useState(initialFormState.taskTitle);
  const [description, setDescription] = useState(initialFormState.description);
  const [priority, setPriority] = useState<TaskPriority>(
    initialFormState.priority,
  );
  const [startDate, setStartDate] = useState(initialFormState.startDate);
  const [dueDate, setDueDate] = useState(initialFormState.dueDate);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedUser =
        localStorage.getItem("taskflow_user") ||
        sessionStorage.getItem("taskflow_user");

      if (!storedUser) {
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

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      setProjectsLoading(true);
      setUsersLoading(true);
      setProjectsError("");
      setUsersError("");

      try {
        const [projectsResponse, usersResponse] = await Promise.all([
          axios.get<Project[] | ProjectsResponse>(`${API_URL}/projects`, {
            headers: getRequestHeaders(),
          }),
          axios.get<TaskUser[] | UsersResponse>(`${API_URL}/users`, {
            headers: getRequestHeaders(),
          }),
        ]);

        const receivedProjects = Array.isArray(projectsResponse.data)
          ? projectsResponse.data
          : projectsResponse.data.projects || projectsResponse.data.data || [];

        const receivedUsers = Array.isArray(usersResponse.data)
          ? usersResponse.data
          : usersResponse.data.users || usersResponse.data.data || [];

        setProjects(
          receivedProjects.map((project) => ({
            ...project,
            priority: normalizePriority(project.priority) as ProjectPriority,
          })),
        );

        setUsers(receivedUsers);
      } catch (error) {
        setProjects([]);
        setUsers([]);
        setProjectsError(
          getBackendErrorMessage(error, "Unable to load projects."),
        );
        setUsersError(getBackendErrorMessage(error, "Unable to load users."));
      } finally {
        setProjectsLoading(false);
        setUsersLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const selectableProjects = useMemo(
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

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  const projectStartDate = toDateValue(selectedProject?.startDate);
  const projectDueDate = toDateValue(selectedProject?.dueDate);

  const dueDateIsInvalid =
    Boolean(startDate && dueDate) &&
    new Date(`${dueDate}T00:00:00`) <
      new Date(`${startDate}T00:00:00`);

  const taskDateOutOfRange =
    Boolean(
      (startDate &&
        ((projectStartDate && startDate < projectStartDate) ||
          (projectDueDate && startDate > projectDueDate))) ||
        (dueDate &&
          ((projectStartDate && dueDate < projectStartDate) ||
            (projectDueDate && dueDate > projectDueDate))),
    );

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setFormError("");

    if (!projectId) {
      setPriority(initialFormState.priority);
      return;
    }

    const selectedProject = projects.find(
      (project) => project.id === projectId,
    );

    setPriority(normalizePriority(selectedProject?.priority));
    setStartDate("");
    setDueDate("");
  };

  const resetForm = () => {
    setSelectedProjectId(initialFormState.selectedProjectId);
    setSelectedUserId(initialFormState.selectedUserId);
    setTaskTitle(initialFormState.taskTitle);
    setDescription(initialFormState.description);
    setPriority(initialFormState.priority);
    setStartDate(initialFormState.startDate);
    setDueDate(initialFormState.dueDate);
    setFormError("");
  };

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!selectedProjectId) {
      setFormError("Please select a project.");
      return;
    }

    if (!taskTitle.trim()) {
      setFormError("Task title is required.");
      return;
    }

    if (dueDateIsInvalid || taskDateOutOfRange) {
      setFormError(
        dueDateIsInvalid
          ? "Due date cannot be earlier than start date."
          : "Task dates must be inside selected project date range.",
      );
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      await axios.post(
        `${API_URL}/tasks`,
        {
          title: taskTitle.trim(),
          description: description.trim() || undefined,
          projectId: selectedProjectId,
          assignedUserId: selectedUserId || undefined,
          startDate: toIsoDate(startDate),
          dueDate: toIsoDate(dueDate),
          priority: priority || "medium",
        },
        {
          headers: getRequestHeaders(),
        },
      );

      toast.success("Task created successfully");
      resetForm();

      window.setTimeout(() => {
        router.push("/admin/tasks");
      }, 600);
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "Unable to create task."));
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
            className="fixed inset-0 z-40 cursor-pointer bg-slate-950/50 backdrop-blur-sm md:hidden"
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
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Link
                    href="/admin/tasks"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-violet-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tasks
                  </Link>

                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                    Create Task
                  </h1>
                </div>

                <Link
                  href="/admin/tasks/assign"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <ListChecks className="h-4 w-4" />
                  Assign Task
                </Link>
              </div>

              <div className="mx-auto max-w-5xl">
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <form onSubmit={handleCreateTask}>
                    <div className="space-y-6 p-5 sm:p-6">
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <FormField label="Project" required>
                          <div className="relative">
                            <FolderKanban className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <select
                              value={selectedProjectId}
                              onChange={(event) =>
                                handleProjectChange(event.target.value)
                              }
                              disabled={
                                projectsLoading ||
                                selectableProjects.length === 0 ||
                                isSubmitting
                              }
                              className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                            >
                              <option value="">
                                {projectsLoading
                                  ? "Loading projects..."
                                  : selectableProjects.length === 0
                                    ? "No active projects found"
                                    : "Select project"}
                              </option>

                              {selectableProjects.map((project) => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                            </select>

                            {projectsLoading ? (
                              <LoaderCircle className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                            ) : (
                              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            )}
                          </div>

                          {projectsError && (
                            <p className="mt-2 text-xs font-semibold text-rose-600">
                              {projectsError}
                            </p>
                          )}
                        </FormField>

                        <FormField label="Priority" required>
                          <div className="relative">
                            <Flag className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                              type="text"
                              value={priority ? priorityLabels[priority] : ""}
                              placeholder="Select project first"
                              disabled
                              className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-100"
                            />
                          </div>
                        </FormField>
                      </div>

                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <FormField label="Task Title" required>
                          <div className="relative">
                            <ListTodo className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                              type="text"
                              value={taskTitle}
                              onChange={(event) => {
                                setTaskTitle(event.target.value);
                                setFormError("");
                              }}
                              placeholder="Enter task title"
                              disabled={isSubmitting}
                              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>
                        </FormField>

                        <FormField label="User">
                          <div className="relative">
                            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <select
                              value={selectedUserId}
                              onChange={(event) => {
                                setSelectedUserId(event.target.value);
                                setFormError("");
                              }}
                              disabled={
                                usersLoading ||
                                activeUsers.length === 0 ||
                                isSubmitting
                              }
                              className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                            >
                              <option value="">
                                {usersLoading
                                  ? "Loading users..."
                                  : activeUsers.length === 0
                                    ? "No active users found"
                                    : "Select user"}
                              </option>

                              {activeUsers.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.fullName}
                                </option>
                              ))}
                            </select>

                            {usersLoading ? (
                              <LoaderCircle className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                            ) : (
                              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            )}
                          </div>

                          {usersError && (
                            <p className="mt-2 text-xs font-semibold text-rose-600">
                              {usersError}
                            </p>
                          )}
                        </FormField>
                      </div>

                      <FormField label="Description">
                        <div className="relative">
                          <AlignLeft className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />

                          <textarea
                            value={description}
                            onChange={(event) =>
                              setDescription(event.target.value)
                            }
                            rows={5}
                            placeholder="Enter task description"
                            disabled={isSubmitting}
                            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </FormField>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <FormField label="Start Date">
                          <div className="relative">
                            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                              type="date"
                              value={startDate}
                              min={projectStartDate || undefined}
                              max={projectDueDate || undefined}
                              onChange={(event) => {
                                setStartDate(event.target.value);
                                setFormError("");
                              }}
                              disabled={!selectedProjectId || isSubmitting}
                              className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </div>
                        </FormField>

                        <FormField label="Due Date">
                          <div className="relative">
                            <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                              type="date"
                              value={dueDate}
                              min={startDate || projectStartDate || undefined}
                              max={projectDueDate || undefined}
                              onChange={(event) => {
                                setDueDate(event.target.value);
                                setFormError("");
                              }}
                              disabled={!selectedProjectId || isSubmitting}
                              className={`h-12 w-full cursor-pointer rounded-xl border bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                                dueDateIsInvalid || taskDateOutOfRange
                                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
                                  : "border-slate-200 focus:border-violet-500 focus:ring-violet-500/10"
                              }`}
                            />
                          </div>
                        </FormField>
                      </div>

                      {(formError || dueDateIsInvalid || taskDateOutOfRange) && (
                        <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                          {formError ||
                            (dueDateIsInvalid
                              ? "Due date cannot be earlier than start date."
                              : "Task dates must be inside selected project date range.")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
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
                        disabled={
                          isSubmitting ||
                          !selectedProjectId ||
                          !taskTitle.trim() ||
                          dueDateIsInvalid ||
                          taskDateOutOfRange
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Create Task
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
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
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span>{label}</span>

        {required && <span className="text-rose-500">*</span>}
      </label>

      {children}
    </div>
  );
}
