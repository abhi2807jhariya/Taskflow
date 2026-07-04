"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import toast, {
  Toaster,
} from "react-hot-toast";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FolderKanban,
  ListTodo,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";

type ProjectPriority = "low" | "medium" | "high";

type ProjectStatus =
  | "planning"
  | "in_progress"
  | "pending"
  | "completed"
  | "admin_hold";

interface ProjectMember {
  id?: string;
  fullName: string;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  members?: ProjectMember[];
  createdAt?: string;
  updatedAt?: string;
}

interface ApiProject
  extends Omit<Project, "status"> {
  status?: string;
}

interface ProjectsResponse {
  projects?: ApiProject[];
}

interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
}

interface ProfileResponse {
  user?: UserProfile;
  data?:
    | UserProfile
    | {
        user?: UserProfile;
      };
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

async function readJsonResponse(
  response: Response,
) {
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

function getErrorMessage(
  data: unknown,
  fallback: string,
) {
  if (
    typeof data !== "object" ||
    data === null
  ) {
    return fallback;
  }

  const message = (
    data as {
      message?: string | string[];
    }
  ).message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  if (typeof message === "string") {
    return message;
  }

  return fallback;
}

function getProfile(
  responseData: unknown,
): UserProfile | null {
  if (
    typeof responseData !== "object" ||
    responseData === null
  ) {
    return null;
  }

  const data =
    responseData as ProfileResponse &
      Partial<UserProfile>;

  if (
    typeof data.user === "object" &&
    data.user !== null
  ) {
    return data.user;
  }

  if (
    typeof data.data === "object" &&
    data.data !== null
  ) {
    if (
      "user" in data.data &&
      typeof data.data.user === "object" &&
      data.data.user !== null
    ) {
      return data.data.user;
    }

    if ("id" in data.data) {
      return data.data as UserProfile;
    }
  }

  if (
    typeof data.id === "string" &&
    typeof data.fullName === "string"
  ) {
    return data as UserProfile;
  }

  return null;
}

function normalizeProjectStatus(
  status?: string,
): ProjectStatus {
  if (status === "in_progress" || status === "active") {
    return "in_progress";
  }

  if (status === "pending") {
    return "pending";
  }

  if (status === "completed") {
    return "completed";
  }

  if (
    status === "admin_hold" ||
    status === "on_hold" ||
    status === "cancelled"
  ) {
    return "admin_hold";
  }

  return "planning";
}

function normalizeProject(
  project: ApiProject,
): Project {
  return {
    ...project,
    status: normalizeProjectStatus(project.status),
  };
}

function isAssignedProject(
  project: ApiProject,
  userId: string,
) {
  return Boolean(
    userId &&
      project.members?.some(
        (member) => member.id === userId,
      ),
  );
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

function isDueSoon(project: Project) {
  if (
    !project.dueDate ||
    project.status === "completed" ||
    project.status === "admin_hold"
  ) {
    return false;
  }

  const dueDate = new Date(project.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 7);

  return (
    dueDate >= today &&
    dueDate <= sevenDaysFromNow
  );
}

export default function UserDashboard() {
  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const loadDashboard = useCallback(
    async (
      showRefreshLoader = false,
    ) => {
      const token = getToken();

      if (!token) {
        toast.error(
          "Login session not found.",
        );
        setLoading(false);
        return;
      }

      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [
          profileResponse,
          projectsResponse,
        ] = await Promise.all([
          fetch(`${API_URL}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
          fetch(`${API_URL}/projects`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
        ]);

        const profileData =
          await readJsonResponse(
            profileResponse,
          );

        if (!profileResponse.ok) {
          throw new Error(
            getErrorMessage(
              profileData,
              "Unable to load profile.",
            ),
          );
        }

        const currentUser =
          getProfile(profileData);

        if (!currentUser) {
          throw new Error(
            "Profile information was not returned.",
          );
        }

        const projectData =
          await readJsonResponse(
            projectsResponse,
          );

        if (!projectsResponse.ok) {
          throw new Error(
            getErrorMessage(
              projectData,
              "Unable to load projects.",
            ),
          );
        }

        const receivedProjects = (
          projectData as ProjectsResponse
        ).projects;

        const assignedProjects =
          Array.isArray(receivedProjects)
            ? receivedProjects
                .filter((project) =>
                  isAssignedProject(
                    project,
                    currentUser.id,
                  ),
                )
                .map(normalizeProject)
            : [];

        setUser(currentUser);
        setProjects(assignedProjects);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load dashboard.";

        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDashboard]);

  const stats = useMemo(
    () => ({
      assigned: projects.length,
      inProgress: projects.filter(
        (project) =>
          project.status === "in_progress",
      ).length,
      pending: projects.filter(
        (project) =>
          project.status === "pending",
      ).length,
      completed: projects.filter(
        (project) =>
          project.status === "completed",
      ).length,
    }),
    [projects],
  );

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((first, second) => {
          const firstDate = new Date(
            first.updatedAt ||
              first.createdAt ||
              "",
          ).getTime();

          const secondDate = new Date(
            second.updatedAt ||
              second.createdAt ||
              "",
          ).getTime();

          return secondDate - firstDate;
        })
        .slice(0, 5),
    [projects],
  );

  const upcomingProjects = useMemo(
    () =>
      projects
        .filter(isDueSoon)
        .sort(
          (first, second) =>
            new Date(
              first.dueDate || "",
            ).getTime() -
            new Date(
              second.dueDate || "",
            ).getTime(),
        )
        .slice(0, 4),
    [projects],
  );

  const firstName =
    user?.fullName
      ?.trim()
      .split(/\s+/)[0] || "User";

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
      />

      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Welcome back, {firstName}.
              Track your projects and work
              status from here.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDashboard(true)
            }
            disabled={loading || refreshing}
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Assigned Projects"
                value={stats.assigned}
                icon={FolderKanban}
                tone="emerald"
              />

              <StatCard
                label="In Progress"
                value={stats.inProgress}
                icon={Clock3}
                tone="blue"
              />

              <StatCard
                label="Pending"
                value={stats.pending}
                icon={CircleAlert}
                tone="amber"
              />

              <StatCard
                label="Completed"
                value={stats.completed}
                icon={CheckCircle2}
                tone="violet"
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <QuickLink
                  href="/user/projects"
                  icon={FolderKanban}
                  label="My Projects"
                  description="Update project status"
                />

                <QuickLink
                  href="/user/tasks"
                  icon={ListTodo}
                  label="My Tasks"
                  description="Check assigned tasks"
                />

                <QuickLink
                  href="/user/settings/profile"
                  icon={UserRound}
                  label="My Profile"
                  description="Manage account details"
                />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Recent Projects
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Latest assigned project
                      status.
                    </p>
                  </div>

                  <Link
                    href="/user/projects"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 transition hover:text-emerald-700"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {recentProjects.length === 0 ? (
                  <EmptyState
                    title="No assigned projects"
                    message="Assigned projects will appear here once admin adds you as a member."
                  />
                ) : (
                  <>
                    <div className="hidden overflow-x-auto lg:block">
                      <table className="w-full min-w-[650px]">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-100">
                            <TableHeading>
                              Project
                            </TableHeading>
                            <TableHeading>
                              Timeline
                            </TableHeading>
                            <TableHeading>
                              Priority
                            </TableHeading>
                            <TableHeading>
                              Status
                            </TableHeading>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {recentProjects.map(
                            (project) => (
                              <tr
                                key={project.id}
                                className="transition hover:bg-slate-50/80"
                              >
                                <td className="px-5 py-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                      <FolderKanban className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0">
                                      <p className="max-w-[260px] truncate text-sm font-bold text-slate-900">
                                        {project.name}
                                      </p>

                                      <p className="mt-1 max-w-[320px] truncate text-xs text-slate-500">
                                        {project.description ||
                                          "No description provided"}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <p className="text-xs font-semibold text-slate-700">
                                    {formatDate(
                                      project.startDate,
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-400">
                                    to{" "}
                                    {formatDate(
                                      project.dueDate,
                                    )}
                                  </p>
                                </td>

                                <td className="px-5 py-4">
                                  <PriorityBadge
                                    priority={
                                      project.priority
                                    }
                                  />
                                </td>

                                <td className="px-5 py-4">
                                  <StatusBadge
                                    status={
                                      project.status
                                    }
                                  />
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="divide-y divide-slate-100 lg:hidden">
                      {recentProjects.map(
                        (project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                          />
                        ),
                      )}
                    </div>
                  </>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Deadline Focus
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Projects due in the next
                      7 days.
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {upcomingProjects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm font-bold text-slate-900">
                        No urgent deadlines
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        You have no assigned
                        project due in the next
                        week.
                      </p>
                    </div>
                  ) : (
                    upcomingProjects.map(
                      (project) => (
                        <div
                          key={project.id}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {project.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Due{" "}
                                {formatDate(
                                  project.dueDate,
                                )}
                              </p>
                            </div>

                            <PriorityBadge
                              priority={
                                project.priority
                              }
                            />
                          </div>

                          <div className="mt-3">
                            <StatusBadge
                              status={
                                project.status
                              }
                            />
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />

        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading dashboard...
        </p>
      </div>
    </div>
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
  icon: typeof FolderKanban;
  tone:
    | "emerald"
    | "blue"
    | "violet"
    | "amber";
}) {
  const toneClasses = {
    emerald:
      "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    violet:
      "bg-violet-50 text-violet-700",
    amber:
      "bg-amber-50 text-amber-700",
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

function QuickLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: typeof FolderKanban;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-20 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm transition group-hover:scale-105">
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-900">
          {label}
        </span>

        <span className="mt-0.5 block text-xs text-slate-500">
          {description}
        </span>
      </span>
    </Link>
  );
}

function TableHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: ProjectPriority;
}) {
  const classes: Record<ProjectPriority, string> = {
    low: "bg-blue-50 text-blue-700 ring-blue-600/10",
    medium:
      "bg-amber-50 text-amber-700 ring-amber-600/10",
    high: "bg-rose-50 text-rose-700 ring-rose-600/10",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${classes[priority]}`}
    >
      {priority}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: ProjectStatus;
}) {
  const classes: Record<ProjectStatus, string> = {
    planning:
      "bg-violet-50 text-violet-700 ring-violet-600/10",
    in_progress:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    pending:
      "bg-amber-50 text-amber-700 ring-amber-600/10",
    completed:
      "bg-blue-50 text-blue-700 ring-blue-600/10",
    admin_hold:
      "bg-slate-100 text-slate-700 ring-slate-600/10",
  };

  const labels: Record<ProjectStatus, string> = {
    planning: "Planning",
    in_progress: "In Progress",
    pending: "Pending",
    completed: "Completed",
    admin_hold: "Admin Hold",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${classes[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ProjectCard({
  project,
}: {
  project: Project;
}) {
  return (
    <article className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <FolderKanban className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-900">
            {project.name}
          </h3>

          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
            {project.description ||
              "No description provided"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PriorityBadge
          priority={project.priority}
        />

        <StatusBadge
          status={project.status}
        />
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="font-semibold text-slate-500">
            {formatDate(project.startDate)}
          </span>

          <span className="font-semibold text-slate-500">
            {formatDate(project.dueDate)}
          </span>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <FolderKanban className="h-7 w-7" />
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-900">
        {title}
      </h2>

      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}
