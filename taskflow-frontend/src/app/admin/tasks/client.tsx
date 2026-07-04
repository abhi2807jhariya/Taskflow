"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Link from "next/link";
import { createPortal } from "react-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  FolderKanban,
  ListChecks,
  LoaderCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  UserRoundCheck,
  XCircle,
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
type ListSize = 5 | 10 | 25 | "all";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  projectName: string;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
}

interface ApiTask
  extends Omit<Task, "status" | "priority"> {
  status?: string;
  priority?: string;
}

interface TasksResponse {
  tasks?: ApiTask[];
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

function normalizeTask(task: ApiTask): Task {
  return {
    ...task,
    priority: normalizePriority(task.priority),
    status: normalizeTaskStatus(task.status),
  };
}

function formatDate(value?: string | null): string {
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

export default function TasksPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] =
    useState<"all" | TaskPriority>("all");
  const [listSize, setListSize] = useState<ListSize>(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [openActionTaskId, setOpenActionTaskId] = useState<string | null>(null);

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
      const response = await axios.get<TasksResponse>(`${API_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTasks((response.data.tasks || []).map(normalizeTask));
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "Unable to load tasks."));
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

  const resetListView = () => {
    setCurrentPage(1);
  };

  const projectOptions = useMemo(() => {
    const uniqueProjects = new Map<string, string>();

    tasks.forEach((task) => {
      uniqueProjects.set(task.projectId, task.projectName);
    });

    return Array.from(uniqueProjects.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search) ||
        task.projectName.toLowerCase().includes(search) ||
        task.assignedUserName?.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search);

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

  const taskStats = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      inProgress: tasks.filter((task) => task.status === "in_progress")
        .length,
      completed: tasks.filter((task) => task.status === "completed").length,
    }),
    [tasks],
  );

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

  const handleDeleteTask = async (task: Task) => {
    const token = getToken();

    if (!token) {
      toast.error("Login session not found.");
      return;
    }

    const isConfirmed = window.confirm(`Delete task "${task.title}"?`);

    if (!isConfirmed) {
      return;
    }

    setDeletingTaskId(task.id);

    try {
      await axios.delete(`${API_URL}/tasks/${task.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTasks((previousTasks) =>
        previousTasks.filter((currentTask) => currentTask.id !== task.id),
      );
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error(getBackendErrorMessage(error, "Unable to delete task."));
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Toaster position="top-right" reverseOrder={false} />

      {openActionTaskId && (
        <button
          type="button"
          aria-label="Close task actions"
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={() => setOpenActionTaskId(null)}
        />
      )}

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
              <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Tasks
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Create, manage and assign project tasks.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void loadTasks(true)}
                    disabled={loading || refreshing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>

                  <Link
                    href="/admin/tasks/assign"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <UserRoundCheck className="h-4 w-4" />
                    Assign Task
                  </Link>

                  <Link
                    href="/admin/tasks/create"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Create Task
                  </Link>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Total Tasks"
                  value={taskStats.total}
                  icon={<ClipboardList className="h-5 w-5" />}
                  iconClass="bg-violet-100 text-violet-700"
                />
                <StatCard
                  title="Pending Tasks"
                  value={taskStats.pending}
                  icon={<CircleDashed className="h-5 w-5" />}
                  iconClass="bg-amber-100 text-amber-700"
                />
                <StatCard
                  title="In Progress"
                  value={taskStats.inProgress}
                  icon={<Clock3 className="h-5 w-5" />}
                  iconClass="bg-blue-100 text-blue-700"
                />
                <StatCard
                  title="Completed"
                  value={taskStats.completed}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  iconClass="bg-emerald-100 text-emerald-700"
                />
              </div>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(220px,1fr)_160px_150px_150px_86px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(event.target.value);
                          resetListView();
                        }}
                        placeholder="Search by task, project or user..."
                        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => {
                            setSearchTerm("");
                            resetListView();
                          }}
                          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <select
                      value={projectFilter}
                      onChange={(event) => {
                        setProjectFilter(event.target.value);
                        resetListView();
                      }}
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="all">All Projects</option>
                      {projectOptions.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(event.target.value as "all" | TaskStatus);
                        resetListView();
                      }}
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      value={priorityFilter}
                      onChange={(event) => {
                        setPriorityFilter(event.target.value as "all" | TaskPriority);
                        resetListView();
                      }}
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    >
                      <option value="all">All Priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    <select
                      value={listSize}
                      onChange={(event) => {
                        setListSize(
                          event.target.value === "all"
                            ? "all"
                            : (Number(event.target.value) as ListSize),
                        );
                        resetListView();
                      }}
                      aria-label="Tasks per page"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    >
                      {LIST_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option === "all" ? "All" : option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loading ? (
                  <LoadingState />
                ) : (
                  <>
                    <div className="hidden overflow-x-auto lg:block">
                      <table className="w-full min-w-[980px]">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-200">
                            <TableHeading>Task</TableHeading>
                            <TableHeading>Project</TableHeading>
                            <TableHeading>Assigned To</TableHeading>
                            <TableHeading>Due Date</TableHeading>
                            <TableHeading>Priority</TableHeading>
                            <TableHeading>Status</TableHeading>
                            <TableHeading align="right">Action</TableHeading>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {paginatedTasks.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-16 text-center">
                                <EmptyState hasTasks={tasks.length > 0} />
                              </td>
                            </tr>
                          ) : (
                            paginatedTasks.map((task) => (
                              <TaskRow
                                key={task.id}
                                task={task}
                                deleting={deletingTaskId === task.id}
                                actionOpen={openActionTaskId === task.id}
                                onActionToggle={() =>
                                  setOpenActionTaskId((currentTaskId) =>
                                    currentTaskId === task.id ? null : task.id,
                                  )
                                }
                                onActionClose={() => setOpenActionTaskId(null)}
                                onDelete={() => void handleDeleteTask(task)}
                              />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="divide-y divide-slate-100 lg:hidden">
                      {paginatedTasks.length === 0 ? (
                        <div className="px-6 py-14">
                          <EmptyState hasTasks={tasks.length > 0} />
                        </div>
                      ) : (
                        paginatedTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            deleting={deletingTaskId === task.id}
                            actionOpen={openActionTaskId === task.id}
                            onActionToggle={() =>
                              setOpenActionTaskId((currentTaskId) =>
                                currentTaskId === task.id ? null : task.id,
                              )
                            }
                            onActionClose={() => setOpenActionTaskId(null)}
                            onDelete={() => void handleDeleteTask(task)}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}

                {!loading && filteredTasks.length > 0 && (
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

function TaskRow({
  task,
  deleting,
  actionOpen,
  onActionToggle,
  onActionClose,
  onDelete,
}: {
  task: Task;
  deleting: boolean;
  actionOpen: boolean;
  onActionToggle: () => void;
  onActionClose: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <ListChecks className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="max-w-[260px] truncate font-semibold text-slate-900">
              {task.title}
            </p>
            <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">
              {task.description || "No description"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex max-w-[220px] items-center gap-2 text-sm font-medium text-slate-700">
          <FolderKanban className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{task.projectName}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        {task.assignedUserName ? (
          <div className="flex items-center gap-2">
            <UserAvatar fullName={task.assignedUserName} />
            <span className="max-w-[160px] truncate text-sm font-medium text-slate-700">
              {task.assignedUserName}
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            <UserRound className="h-3.5 w-3.5" />
            Unassigned
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          {formatDate(task.dueDate)}
        </div>
      </td>
      <td className="px-6 py-4">
        <PriorityBadge priority={task.priority} />
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={task.status} />
      </td>
      <td className="relative px-6 py-4 text-right">
        <TaskActionMenu
          task={task}
          deleting={deleting}
          open={actionOpen}
          onToggle={onActionToggle}
          onClose={onActionClose}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

function TaskCard({
  task,
  deleting,
  actionOpen,
  onActionToggle,
  onActionClose,
  onDelete,
}: {
  task: Task;
  deleting: boolean;
  actionOpen: boolean;
  onActionToggle: () => void;
  onActionClose: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <ListChecks className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-bold text-slate-900">{task.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {task.description || "No description"}
            </p>
          </div>
        </div>
        <TaskActionMenu
          task={task}
          deleting={deleting}
          open={actionOpen}
          onToggle={onActionToggle}
          onClose={onActionClose}
          onDelete={onDelete}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
      <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
        <TaskInfo label="Project" value={task.projectName} />
        <TaskInfo label="Due Date" value={formatDate(task.dueDate)} />
        <TaskInfo label="Assigned To" value={task.assignedUserName || "Unassigned"} />
      </div>
    </article>
  );
}

function TaskActionMenu({
  task,
  deleting,
  open,
  onToggle,
  onClose,
  onDelete,
}: {
  task: Task;
  deleting: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDelete: () => void;
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

    if (top + 150 > window.innerHeight - padding) {
      top = rect.top - 150 - 8;
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
            className="z-[100000] w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl shadow-slate-900/10"
          >
          <Link
            href={`/admin/tasks/${task.id}`}
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Eye className="h-4 w-4 text-slate-400" />
            View
          </Link>

          <Link
            href={`/admin/tasks/${task.id}/edit`}
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Edit3 className="h-4 w-4 text-slate-400" />
            Edit
          </Link>

          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete();
            }}
            disabled={deleting}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
          </div>,
          document.body,
        )}
    </>
  );
}

function StatCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function TableHeading({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const classes: Record<TaskPriority, string> = {
    low: "bg-blue-50 text-blue-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-orange-50 text-orange-700",
    urgent: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${classes[priority]}`}
    >
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const classes: Record<TaskStatus, string> = {
    pending: "bg-amber-50 text-amber-700",
    in_progress: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    on_hold: "bg-violet-50 text-violet-700",
    cancelled: "bg-slate-100 text-slate-700",
  };

  const labels: Record<TaskStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    on_hold: "On Hold",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${classes[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function UserAvatar({ fullName }: { fullName: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-sm">
      {getInitials(fullName)}
    </div>
  );
}

function TaskInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading tasks...
        </p>
      </div>
    </div>
  );
}

function EmptyState({ hasTasks }: { hasTasks: boolean }) {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ClipboardCheck className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">
        No tasks found
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {hasTasks
          ? "Try changing the search or filters."
          : "No project tasks have been created yet."}
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

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
