"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import toast, {
  Toaster,
} from "react-hot-toast";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  FolderKanban,
  LoaderCircle,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

type ProjectPriority = "low" | "medium" | "high";

type ProjectStatus =
  | "planning"
  | "in_progress"
  | "pending"
  | "completed"
  | "admin_hold";

type UserEditableStatus =
  | "in_progress"
  | "pending"
  | "completed";

type StatusFilter = "all" | ProjectStatus;
type PriorityFilter = "all" | ProjectPriority;
type ListSize = 5 | 10 | 25 | "all";

interface ProjectMember {
  id?: string;
  fullName: string;
  email?: string;
  status?: string;
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

interface ProjectResponse {
  project?: ApiProject;
}

interface UserProfile {
  id: string;
  fullName: string;
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

const LIST_SIZE_OPTIONS: ListSize[] = [
  5,
  10,
  25,
  "all",
];

const USER_STATUS_OPTIONS: Array<{
  value: UserEditableStatus;
  label: string;
}> = [
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "pending",
    label: "Pending",
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

export default function UserProjects() {
  const [projects, setProjects] =
    useState<Project[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState<PriorityFilter>("all");

  const [listSize, setListSize] =
    useState<ListSize>(5);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [
    updatingStatusId,
    setUpdatingStatusId,
  ] = useState<string | null>(null);

  const loadProjects = useCallback(
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

        const projectsData =
          await readJsonResponse(
            projectsResponse,
          );

        if (!projectsResponse.ok) {
          throw new Error(
            getErrorMessage(
              projectsData,
              "Unable to load projects.",
            ),
          );
        }

        const receivedProjects = (
          projectsData as ProjectsResponse
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

        setProjects(assignedProjects);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load projects.";

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
      void loadProjects();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadProjects]);

  const handleProjectStatusChange = async (
    projectId: string,
    status: UserEditableStatus,
  ) => {
    if (updatingStatusId) {
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error(
        "Login session not found.",
      );
      return;
    }

    setUpdatingStatusId(projectId);

    try {
      const response = await fetch(
        `${API_URL}/projects/${projectId}/my-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      const responseData =
        await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            responseData,
            "Unable to update work status.",
          ),
        );
      }

      const updatedProject = (
        responseData as ProjectResponse
      ).project;

      setProjects((previousProjects) =>
        previousProjects.map((project) =>
          project.id === projectId
            ? updatedProject
              ? normalizeProject(updatedProject)
              : {
                  ...project,
                  status,
                }
            : project,
        ),
      );

      toast.success("Work status updated");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update work status.";

      toast.error(message);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const projectStats = useMemo(
    () => ({
      total: projects.length,
      planning: projects.filter(
        (project) =>
          project.status === "planning",
      ).length,
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
      adminHold: projects.filter(
        (project) =>
          project.status === "admin_hold",
      ).length,
    }),
    [projects],
  );

  const statusTabs: Array<{
    label: string;
    value: StatusFilter;
    count: number;
  }> = [
    {
      label: "All",
      value: "all",
      count: projectStats.total,
    },
    {
      label: "Planning",
      value: "planning",
      count: projectStats.planning,
    },
    {
      label: "In Progress",
      value: "in_progress",
      count: projectStats.inProgress,
    },
    {
      label: "Pending",
      value: "pending",
      count: projectStats.pending,
    },
    {
      label: "Completed",
      value: "completed",
      count: projectStats.completed,
    },
    {
      label: "Hold",
      value: "admin_hold",
      count: projectStats.adminHold,
    },
  ];

  const filteredProjects = useMemo(() => {
    const searchValue =
      searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const members =
        project.members || [];

      const matchesSearch =
        !searchValue ||
        project.name
          .toLowerCase()
          .includes(searchValue) ||
        project.description
          ?.toLowerCase()
          .includes(searchValue) ||
        members.some((member) =>
          member.fullName
            .toLowerCase()
            .includes(searchValue),
        );

      const matchesStatus =
        statusFilter === "all" ||
        project.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        project.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    projects,
    searchTerm,
    statusFilter,
    priorityFilter,
  ]);

  const resetListView = () => {
    setCurrentPage(1);
  };

  const handleListSizeChange = (
    value: string,
  ) => {
    setListSize(
      value === "all"
        ? "all"
        : (Number(value) as ListSize),
    );

    resetListView();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setListSize(5);
    resetListView();
  };

  const totalPages =
    listSize === "all"
      ? 1
      : Math.max(
          1,
          Math.ceil(
            filteredProjects.length /
              listSize,
          ),
        );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages,
  );

  const startIndex =
    listSize === "all"
      ? 0
      : (safeCurrentPage - 1) * listSize;

  const paginatedProjects =
    listSize === "all"
      ? filteredProjects
      : filteredProjects.slice(
          startIndex,
          startIndex + listSize,
        );

  const endIndex =
    listSize === "all"
      ? filteredProjects.length
      : Math.min(
          startIndex + listSize,
          filteredProjects.length,
        );

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
              My Projects
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View assigned projects and
              update your work status.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadProjects(true)
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

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
            <div className="flex shrink-0 flex-nowrap gap-2 overflow-x-auto pb-1 xl:pb-0">
              {statusTabs.map((tab) => {
                const isSelected =
                  statusFilter === tab.value;

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

            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(170px,1fr)_140px_130px_76px_auto] xl:min-w-[620px] xl:max-w-[720px] xl:flex-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(
                      event.target.value,
                    );
                    resetListView();
                  }}
                  placeholder="Search project..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target
                        .value as StatusFilter,
                    );
                    resetListView();
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="all">
                    All Status
                  </option>
                  <option value="planning">
                    Planning
                  </option>
                  <option value="in_progress">
                    In Progress
                  </option>
                  <option value="pending">
                    Pending
                  </option>
                  <option value="completed">
                    Completed
                  </option>
                  <option value="admin_hold">
                    Admin Hold
                  </option>
                </select>

                <SelectArrow />
              </div>

              <div className="relative">
                <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  value={priorityFilter}
                  onChange={(event) => {
                    setPriorityFilter(
                      event.target
                        .value as PriorityFilter,
                    );
                    resetListView();
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="all">
                    All Priority
                  </option>
                  <option value="low">Low</option>
                  <option value="medium">
                    Medium
                  </option>
                  <option value="high">
                    High
                  </option>
                </select>

                <SelectArrow />
              </div>

              <div className="relative">
                <select
                  value={listSize}
                  onChange={(event) =>
                    handleListSizeChange(
                      event.target.value,
                    )
                  }
                  aria-label="Projects per page"
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  {LIST_SIZE_OPTIONS.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option === "all"
                          ? "All"
                          : option}
                      </option>
                    ),
                  )}
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
              <table className="w-full min-w-[940px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <TableHeading>
                      Project
                    </TableHeading>
                    <TableHeading>
                      Members
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
                    <TableHeading>
                      Update
                    </TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-14 text-center"
                      >
                        <EmptyState
                          title={
                            projects.length === 0
                              ? "No assigned projects"
                              : "No matching projects"
                          }
                          message={
                            projects.length === 0
                              ? "Assigned projects will appear here once admin adds you as a member."
                              : "Try changing the search text or filters."
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedProjects.map(
                      (project) => (
                        <ProjectRow
                          key={project.id}
                          project={project}
                          updating={
                            updatingStatusId ===
                            project.id
                          }
                          onStatusChange={
                            handleProjectStatusChange
                          }
                        />
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredProjects.length === 0 ? (
                <div className="px-5 py-12">
                  <EmptyState
                    title={
                      projects.length === 0
                        ? "No assigned projects"
                        : "No matching projects"
                    }
                    message={
                      projects.length === 0
                        ? "Assigned projects will appear here once admin adds you as a member."
                        : "Try changing the search text or filters."
                    }
                  />
                </div>
              ) : (
                paginatedProjects.map(
                  (project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      updating={
                        updatingStatusId ===
                        project.id
                      }
                      onStatusChange={
                        handleProjectStatusChange
                      }
                    />
                  ),
                )
              )}
            </div>

            {filteredProjects.length > 0 && (
              <Pagination
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={filteredProjects.length}
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPrevious={() =>
                  setCurrentPage((previous) =>
                    Math.max(
                      1,
                      previous - 1,
                    ),
                  )
                }
                onNext={() =>
                  setCurrentPage((previous) =>
                    Math.min(
                      totalPages,
                      previous + 1,
                    ),
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

function ProjectRow({
  project,
  updating,
  onStatusChange,
}: {
  project: Project;
  updating: boolean;
  onStatusChange: (
    projectId: string,
    status: UserEditableStatus,
  ) => void | Promise<void>;
}) {
  return (
    <tr className="transition hover:bg-slate-50/80">
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <FolderKanban className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="max-w-[280px] truncate text-sm font-bold text-slate-900">
              {project.name}
            </p>

            <p className="mt-1 max-w-[340px] truncate text-xs text-slate-500">
              {project.description ||
                "No description provided"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          <Users className="h-4 w-4" />
          {project.members?.length || 0}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-slate-700">
            {formatDate(project.startDate)}
          </p>

          <p className="text-slate-400">
            to {formatDate(project.dueDate)}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <PriorityBadge
          priority={project.priority}
        />
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={project.status} />
      </td>

      <td className="px-5 py-4">
        <StatusControl
          project={project}
          updating={updating}
          onStatusChange={onStatusChange}
        />
      </td>
    </tr>
  );
}

function ProjectCard({
  project,
  updating,
  onStatusChange,
}: {
  project: Project;
  updating: boolean;
  onStatusChange: (
    projectId: string,
    status: UserEditableStatus,
  ) => void | Promise<void>;
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

          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
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

        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          <Users className="h-3.5 w-3.5" />
          {project.members?.length || 0}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
        <MobileDetail
          icon={CalendarDays}
          label="Start Date"
          value={formatDate(
            project.startDate,
          )}
        />

        <MobileDetail
          icon={CalendarDays}
          label="Due Date"
          value={formatDate(project.dueDate)}
        />
      </div>

      <div className="mt-4">
        <StatusControl
          project={project}
          updating={updating}
          onStatusChange={onStatusChange}
        />
      </div>
    </article>
  );
}

function StatusControl({
  project,
  updating,
  onStatusChange,
}: {
  project: Project;
  updating: boolean;
  onStatusChange: (
    projectId: string,
    status: UserEditableStatus,
  ) => void | Promise<void>;
}) {
  const locked =
    project.status === "admin_hold" ||
    project.status === "completed";

  const value =
    project.status === "planning"
      ? ""
      : project.status;

  return (
    <div className="relative min-w-[160px]">
      <select
        value={value}
        disabled={locked || updating}
        onChange={(event) => {
          const nextStatus =
            event.target
              .value as UserEditableStatus;

          if (!nextStatus) {
            return;
          }

          onStatusChange(
            project.id,
            nextStatus,
          );
        }}
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        {project.status === "admin_hold" && (
          <option value="admin_hold">
            Admin Hold
          </option>
        )}

        <option value="">
          {updating
            ? "Updating..."
            : "Update status"}
        </option>

        {USER_STATUS_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <SelectArrow />
    </div>
  );
}

function TableHeading({
  children,
}: {
  children: ReactNode;
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

function MobileDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value}
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
        <span className="font-semibold text-slate-800">
          {startIndex + 1}
        </span>{" "}
        to{" "}
        <span className="font-semibold text-slate-800">
          {endIndex}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-800">
          {totalItems}
        </span>{" "}
        projects
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

        {Array.from(
          {
            length: totalPages,
          },
          (_, index) => index + 1,
        ).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() =>
              onPageChange(pageNumber)
            }
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
              currentPage === pageNumber
                ? "bg-emerald-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {pageNumber}
          </button>
        ))}

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

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />

        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading projects...
        </p>
      </div>
    </div>
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
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <FolderKanban className="h-7 w-7" />
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {message}
      </p>
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
