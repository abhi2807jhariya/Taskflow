"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Flag,
  FolderKanban,
  ListTodo,
  LoaderCircle,
} from "lucide-react";

type TaskPriority = "low" | "medium" | "high" | "urgent";
type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";
type UserEditableTaskStatus = "pending" | "in_progress" | "completed";

interface UserTask {
  id: string;
  title: string;
  description?: string | null;
  projectName: string;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
}

interface ApiTask extends Omit<UserTask, "status" | "priority"> {
  status?: string;
  priority?: string;
}

interface TaskResponse {
  task?: ApiTask;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const STATUS_OPTIONS: Array<{
  value: UserEditableTaskStatus;
  label: string;
}> = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

function getToken() {
  return (
    localStorage.getItem("taskflow_token") ||
    sessionStorage.getItem("taskflow_token")
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      message: text,
    };
  }
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data !== "object" || data === null) {
    return fallback;
  }

  const message = (data as { message?: string | string[] }).message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  if (typeof message === "string") {
    return message;
  }

  return fallback;
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

function normalizeTask(task: ApiTask): UserTask {
  return {
    ...task,
    priority: normalizePriority(task.priority),
    status: normalizeStatus(task.status),
  };
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

function getStatusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    on_hold: "On Hold",
    cancelled: "Cancelled",
  };

  return labels[status];
}

function isStatusLocked(status: TaskStatus) {
  return (
    status === "completed" ||
    status === "on_hold" ||
    status === "cancelled"
  );
}

export default function UserTaskEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const [task, setTask] = useState<UserTask | null>(null);
  const [status, setStatus] = useState<UserEditableTaskStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTask = useCallback(async () => {
    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to load task."));
      }

      const apiTask = (data as TaskResponse).task;

      if (!apiTask) {
        throw new Error("Task not found.");
      }

      const normalizedTask = normalizeTask(apiTask);
      setTask(normalizedTask);

      if (
        normalizedTask.status === "pending" ||
        normalizedTask.status === "in_progress" ||
        normalizedTask.status === "completed"
      ) {
        setStatus(normalizedTask.status);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load task.",
      );
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!task || isStatusLocked(task.status)) {
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/tasks/${task.id}/my-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to update task status."),
        );
      }

      toast.success("Task status updated");
      router.push(`/user/tasks/${task.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update task status.",
      );
    } finally {
      setSaving(false);
    }
  };

  const locked = task ? isStatusLocked(task.status) : true;

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <Link
            href={task ? `/user/tasks/${task.id}` : "/user/tasks"}
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            Edit Task Status
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update only your current work status for this assigned task.
          </p>
        </div>

        {loading ? (
          <LoadingState />
        ) : !task ? (
          <EmptyState />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <ListTodo className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-slate-900">
                    {task.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {task.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoCard
                  icon={FolderKanban}
                  label="Project"
                  value={task.projectName}
                />
                <InfoCard
                  icon={Flag}
                  label="Priority"
                  value={task.priority}
                />
                <InfoCard
                  icon={CalendarDays}
                  label="Due Date"
                  value={formatDate(task.dueDate)}
                />
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Status
                </label>
                <select
                  value={locked ? task.status : status}
                  disabled={locked || saving}
                  onChange={(event) =>
                    setStatus(event.target.value as UserEditableTaskStatus)
                  }
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {locked && (
                    <option value={task.status}>
                      {getStatusLabel(task.status)}
                    </option>
                  )}
                  {!locked &&
                    STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </div>

              {locked && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
                  This task is {getStatusLabel(task.status)}. Status update is
                  locked for your account.
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end">
              <Link
                href={`/user/tasks/${task.id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={locked || saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Save Status
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-bold capitalize text-slate-800">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading task...
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <ListTodo className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-lg font-bold text-slate-900">
        Task not found
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        This task is not assigned to your account or no longer exists.
      </p>
    </div>
  );
}
