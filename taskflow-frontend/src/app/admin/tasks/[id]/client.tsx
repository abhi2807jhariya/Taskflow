"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  AlignLeft,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Edit3,
  Flag,
  FolderKanban,
  ListChecks,
  LoaderCircle,
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

interface Task {
  id: string;
  title: string;
  description?: string | null;
  projectName: string;
  assignedUserName?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignmentNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskResponse {
  task?: Omit<Task, "status" | "priority"> & {
    status?: string;
    priority?: string;
  };
}

interface BackendErrorResponse {
  message?: string | string[];
}

interface StoredUser {
  fullName?: string;
  name?: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

function getToken() {
  return (
    localStorage.getItem("taskflow_token") ||
    sessionStorage.getItem("taskflow_token")
  );
}

function normalizeStatus(status?: string): TaskStatus {
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

function normalizePriority(priority?: string): TaskPriority {
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

function normalizeTask(task: NonNullable<TaskResponse["task"]>): Task {
  return {
    ...task,
    priority: normalizePriority(task.priority),
    status: normalizeStatus(task.status),
  };
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

  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

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

  const loadTask = useCallback(async () => {
    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.get<TaskResponse>(
        `${API_URL}/tasks/${taskId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.data.task) {
        throw new Error("Task not found.");
      }

      setTask(normalizeTask(response.data.task));
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "Unable to load task."));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTask();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTask]);

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
                    Task Details
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Review task assignment, timeline and status.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push("/admin/tasks")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  {task && (
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/tasks/${task.id}/edit`)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Task
                    </button>
                  )}
                </div>
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
              ) : task ? (
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                        <ListChecks className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-2xl font-bold text-slate-900">
                          {task.title}
                        </h2>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {task.description || "No description provided."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                    <DetailCard
                      icon={<FolderKanban className="h-5 w-5" />}
                      label="Project"
                      value={task.projectName}
                    />
                    <DetailCard
                      icon={<UserRound className="h-5 w-5" />}
                      label="Assigned User"
                      value={task.assignedUserName || "Unassigned"}
                    />
                    <DetailCard
                      icon={<Flag className="h-5 w-5" />}
                      label="Priority"
                      value={formatPriority(task.priority)}
                    />
                    <DetailCard
                      icon={<Clock3 className="h-5 w-5" />}
                      label="Status"
                      value={formatStatus(task.status)}
                    />
                    <DetailCard
                      icon={<CalendarDays className="h-5 w-5" />}
                      label="Start Date"
                      value={formatDate(task.startDate)}
                    />
                    <DetailCard
                      icon={<CalendarDays className="h-5 w-5" />}
                      label="Due Date"
                      value={formatDate(task.dueDate)}
                    />
                  </div>

                  <div className="border-t border-slate-100 p-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <AlignLeft className="h-4 w-4 text-slate-400" />
                      Assignment Description
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {task.assignmentNote || "No assignment description added."}
                    </p>
                  </div>
                </section>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <h2 className="text-xl font-bold text-slate-900">
                    Task not found
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    This task may have been deleted.
                  </p>
                </div>
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

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3 text-slate-500">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function formatPriority(priority: TaskPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatStatus(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    on_hold: "On Hold",
    cancelled: "Cancelled",
  };

  return labels[status];
}
