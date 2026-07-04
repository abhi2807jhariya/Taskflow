"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Filter,
  Flag,
  FolderKanban,
  MoreVertical,
  ListTodo,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

type TaskPriority = "low" | "medium" | "high" | "urgent";
type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";
type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | TaskPriority;
type ListSize = 5 | 10 | 25 | "all";

interface UserTask {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  projectName: string;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignedAt?: string | null;
}

interface ApiTask
  extends Omit<UserTask, "status" | "priority"> {
  status?: string;
  priority?: string;
}

interface TasksResponse {
  tasks?: ApiTask[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const LIST_SIZE_OPTIONS: ListSize[] = [
  5,
  10,
  25,
  "all",
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

function normalizeTaskStatus(status?: string): TaskStatus {
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
    status: normalizeTaskStatus(task.status),
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

function isDueSoon(task: UserTask) {
  if (
    !task.dueDate ||
    task.status === "completed" ||
    task.status === "cancelled"
  ) {
    return false;
  }

  const dueDate = new Date(task.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  return dueDate >= today && dueDate <= sevenDaysFromNow;
}

export default function UserTasks() {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("all");
  const [listSize, setListSize] = useState<ListSize>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionTaskId, setOpenActionTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async (showRefreshLoader = false) => {
    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      setLoading(false);
      return;
    }

    if (showRefreshLoader) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const responseData = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(responseData, "Unable to load tasks."),
        );
      }

      const receivedTasks = (responseData as TasksResponse).tasks;
      setTasks(Array.isArray(receivedTasks) ? receivedTasks.map(normalizeTask) : []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load tasks.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTasks();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTasks]);

  const taskStats = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      inProgress: tasks.filter((task) => task.status === "in_progress")
        .length,
      completed: tasks.filter((task) => task.status === "completed").length,
      dueSoon: tasks.filter(isDueSoon).length,
    }),
    [tasks],
  );

  const statusTabs: Array<{
    label: string;
    value: StatusFilter;
    count: number;
  }> = [
    {
      label: "All",
      value: "all",
      count: taskStats.total,
    },
    {
      label: "Pending",
      value: "pending",
      count: taskStats.pending,
    },
    {
      label: "In Progress",
      value: "in_progress",
      count: taskStats.inProgress,
    },
    {
      label: "Completed",
      value: "completed",
      count: taskStats.completed,
    },
  ];

  const projectOptions = useMemo(() => {
    const projects = new Map<string, string>();

    tasks.forEach((task) => {
      projects.set(task.projectId, task.projectName);
    });

    return Array.from(projects).map(([id, name]) => ({
      id,
      name,
    }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !searchValue ||
        task.title.toLowerCase().includes(searchValue) ||
        task.projectName.toLowerCase().includes(searchValue) ||
        task.description?.toLowerCase().includes(searchValue);

      const matchesProject =
        projectFilter === "all" || task.projectId === projectFilter;

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesProject &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [tasks, searchTerm, projectFilter, statusFilter, priorityFilter]);

  const resetListView = () => {
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setProjectFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setListSize(5);
    resetListView();
  };

  const handleListSizeChange = (value: string) => {
    setListSize(value === "all" ? "all" : (Number(value) as ListSize));
    resetListView();
  };

  const totalPages =
    listSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredTasks.length / listSize));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex =
    listSize === "all" ? 0 : (safeCurrentPage - 1) * listSize;

  const paginatedTasks =
    listSize === "all"
      ? filteredTasks
      : filteredTasks.slice(startIndex, startIndex + listSize);

  const endIndex =
    listSize === "all"
      ? filteredTasks.length
      : Math.min(startIndex + listSize, filteredTasks.length);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      {openActionTaskId && (
        <button
          type="button"
          aria-label="Close task actions"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={() => setOpenActionTaskId(null)}
        />
      )}

      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Tasks
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track assigned tasks and update their work status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadTasks(true)}
            disabled={loading || refreshing}
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Tasks"
            value={taskStats.total}
            icon={ListTodo}
            tone="emerald"
          />
          <StatCard
            label="In Progress"
            value={taskStats.inProgress}
            icon={Clock3}
            tone="amber"
          />
          <StatCard
            label="Completed"
            value={taskStats.completed}
            icon={CheckCircle2}
            tone="blue"
          />
          <StatCard
            label="Due Soon"
            value={taskStats.dueSoon}
            icon={CircleAlert}
            tone="rose"
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
            <div className="flex shrink-0 flex-nowrap gap-2 overflow-x-auto pb-1 xl:pb-0">
              {statusTabs.map((tab) => {
                const isSelected = statusFilter === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.value);
                      resetListView();
                    }}
                    className={`inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-bold transition ${
                      isSelected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/50 hover:text-emerald-700"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(160px,1fr)_130px_130px_120px_76px_auto] xl:min-w-[720px] xl:max-w-[820px] xl:flex-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    resetListView();
                  }}
                  placeholder="Search task..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div className="relative">
                <FolderKanban className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={projectFilter}
                  onChange={(event) => {
                    setProjectFilter(event.target.value);
                    resetListView();
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="all">All Projects</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <SelectArrow />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    resetListView();
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <SelectArrow />
              </div>

              <div className="relative">
                <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={priorityFilter}
                  onChange={(event) => {
                    setPriorityFilter(event.target.value as PriorityFilter);
                    resetListView();
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <SelectArrow />
              </div>

              <div className="relative">
                <select
                  value={listSize}
                  onChange={(event) => handleListSizeChange(event.target.value)}
                  aria-label="Tasks per page"
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  {LIST_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All" : option}
                    </option>
                  ))}
                </select>
                <SelectArrow />
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <LoadingState />
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <TableHeading>Task</TableHeading>
                    <TableHeading>Project</TableHeading>
                    <TableHeading>Due Date</TableHeading>
                    <TableHeading>Priority</TableHeading>
                    <TableHeading>Status</TableHeading>
                    <TableHeading>Description</TableHeading>
                    <TableHeading>Action</TableHeading>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-14 text-center">
                        <EmptyState />
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        actionOpen={openActionTaskId === task.id}
                        onActionToggle={() =>
                          setOpenActionTaskId((currentTaskId) =>
                            currentTaskId === task.id ? null : task.id,
                          )
                        }
                        onActionClose={() => setOpenActionTaskId(null)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredTasks.length === 0 ? (
                <div className="px-5 py-12">
                  <EmptyState />
                </div>
              ) : (
                paginatedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    actionOpen={openActionTaskId === task.id}
                    onActionToggle={() =>
                      setOpenActionTaskId((currentTaskId) =>
                        currentTaskId === task.id ? null : task.id,
                      )
                    }
                    onActionClose={() => setOpenActionTaskId(null)}
                  />
                ))
              )}
            </div>

            {filteredTasks.length > 0 && (
              <Pagination
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={filteredTasks.length}
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPrevious={() =>
                  setCurrentPage((previous) => Math.max(1, previous - 1))
                }
                onNext={() =>
                  setCurrentPage((previous) =>
                    Math.min(totalPages, previous + 1),
                  )
                }
                onPageChange={setCurrentPage}
              />
            )}
          </section>
        )}
      </div>
    </>
  );
}

function TaskRow({
  task,
  actionOpen,
  onActionToggle,
  onActionClose,
}: {
  task: UserTask;
  actionOpen: boolean;
  onActionToggle: () => void;
  onActionClose: () => void;
}) {
  return (
    <tr className="transition hover:bg-slate-50/80">
      <td className="px-5 py-4">
        <div className="flex items-start">
          <div className="min-w-0">
            <p className="max-w-[260px] truncate text-sm font-bold text-slate-900">
              {task.title}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Assigned {formatDate(task.assignedAt)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <p className="max-w-[220px] truncate text-sm font-semibold text-slate-700">
          {task.projectName}
        </p>
      </td>
      <td className="px-5 py-4 text-sm font-medium text-slate-600">
        {formatDate(task.dueDate)}
      </td>
      <td className="px-5 py-4">
        <PriorityBadge priority={task.priority} />
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-5 py-4">
        <p className="max-w-[240px] truncate text-sm text-slate-500">
          {task.description || "No description provided"}
        </p>
      </td>
      <td className="px-5 py-4">
        <TaskActionMenu
          task={task}
          open={actionOpen}
          onToggle={onActionToggle}
          onClose={onActionClose}
        />
      </td>
    </tr>
  );
}

function TaskCard({
  task,
  actionOpen,
  onActionToggle,
  onActionClose,
}: {
  task: UserTask;
  actionOpen: boolean;
  onActionToggle: () => void;
  onActionClose: () => void;
}) {
  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-900">
            {task.title}
          </h3>
          <p className="mt-1 truncate text-sm text-slate-500">
            {task.projectName}
          </p>
        </div>
        <TaskActionMenu
          task={task}
          open={actionOpen}
          onToggle={onActionToggle}
          onClose={onActionClose}
        />
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-slate-500">
        {task.description || "No description provided"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
        <MobileDetail label="Assigned" value={formatDate(task.assignedAt)} />
        <MobileDetail label="Due Date" value={formatDate(task.dueDate)} />
      </div>
    </article>
  );
}

function TaskActionMenu({
  task,
  open,
  onToggle,
  onClose,
}: {
  task: UserTask;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
  });

  const handleToggle = () => {
    const button = buttonRef.current;

    if (!button || open) {
      onToggle();
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuWidth = 160;
    const padding = 12;
    let left = rect.right - menuWidth;
    let top = rect.bottom + 8;

    if (left < padding) {
      left = padding;
    }

    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    if (top + 110 > window.innerHeight - padding) {
      top = rect.top - 110 - 8;
    }

    setPosition({
      top,
      left,
    });
    onToggle();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const close = () => onClose();

    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [onClose, open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
        aria-label={`Open actions for ${task.title}`}
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="menu"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
            }}
            className="z-[100000] w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10"
          >
            <Link
              href={`/user/tasks/${task.id}`}
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View
            </Link>
            <Link
              href={`/user/tasks/${task.id}/edit`}
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Edit
            </Link>
          </div>,
          document.body,
        )}
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof ListTodo;
  tone: "emerald" | "amber" | "blue" | "rose";
}) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-3xl font-extrabold text-slate-900">
          {value}
        </p>
      </div>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses[tone]}`}
      >
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

function TableHeading({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
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
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${classes[priority]}`}
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
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${classes[status]}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function MobileDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <CalendarDays className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading tasks...
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <ListTodo className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900">
        No assigned tasks
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Assigned tasks will appear here once admin assigns them to your account.
      </p>
    </div>
  );
}

function Pagination({
  startIndex,
  endIndex,
  totalItems,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onPageChange,
}: {
  startIndex: number;
  endIndex: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-800">{startIndex + 1}</span>{" "}
        to <span className="font-semibold text-slate-800">{endIndex}</span> of{" "}
        <span className="font-semibold text-slate-800">{totalItems}</span>{" "}
        tasks
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={onPrevious}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
          (pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                currentPage === pageNumber
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={currentPage === totalPages}
          onClick={onNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SelectArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-slate-400"
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
    </svg>
  );
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
