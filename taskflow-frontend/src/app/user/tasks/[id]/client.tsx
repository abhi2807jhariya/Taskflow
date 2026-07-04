"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  AlignLeft,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Edit3,
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

interface UserTask {
  id: string;
  title: string;
  description?: string | null;
  projectName: string;
  startDate?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignmentNote?: string | null;
  assignedAt?: string | null;
  updatedAt?: string | null;
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

export default function UserTaskDetailPage() {
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const [task, setTask] = useState<UserTask | null>(null);
  const [loading, setLoading] = useState(true);

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

      setTask(normalizeTask(apiTask));
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

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/user/tasks"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Tasks
            </Link>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              Task Details
            </h1>
          </div>

          {task && (
            <Link
              href={`/user/tasks/${task.id}/edit`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              <Edit3 className="h-4 w-4" />
              Edit Status
            </Link>
          )}
        </div>

        {loading ? (
          <LoadingState />
        ) : !task ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <ListTodo className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-bold text-slate-900">
                        {task.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Assigned {formatDate(task.assignedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard
                  icon={FolderKanban}
                  label="Project"
                  value={task.projectName}
                />
                <InfoCard
                  icon={CalendarDays}
                  label="Start Date"
                  value={formatDate(task.startDate)}
                />
                <InfoCard
                  icon={CalendarDays}
                  label="Due Date"
                  value={formatDate(task.dueDate)}
                />
                <InfoCard
                  icon={Clock3}
                  label="Last Updated"
                  value={formatDate(task.updatedAt)}
                />
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <TextPanel
                icon={AlignLeft}
                title="Description"
                value={task.description || "No description provided."}
              />
              <TextPanel
                icon={Flag}
                title="Assignment Note"
                value={task.assignmentNote || "No assignment note provided."}
              />
            </section>
          </div>
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function TextPanel({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof AlignLeft;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <Icon className="h-4 w-4 text-emerald-600" />
        {title}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {value}
      </p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const classes: Record<TaskPriority, string> = {
    low: "bg-blue-50 text-blue-700 ring-blue-600/10",
    medium: "bg-amber-50 text-amber-700 ring-amber-600/10",
    high: "bg-rose-50 text-rose-700 ring-rose-600/10",
    urgent: "bg-red-50 text-red-700 ring-red-600/10",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ring-inset ${classes[priority]}`}
    >
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const classes: Record<TaskStatus, string> = {
    pending: "bg-slate-100 text-slate-700 ring-slate-600/10",
    in_progress: "bg-amber-50 text-amber-700 ring-amber-600/10",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    on_hold: "bg-blue-50 text-blue-700 ring-blue-600/10",
    cancelled: "bg-rose-50 text-rose-700 ring-rose-600/10",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${classes[status]}`}
    >
      {getStatusLabel(status)}
    </span>
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
