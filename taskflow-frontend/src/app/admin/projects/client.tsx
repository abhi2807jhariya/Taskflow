"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, Filter, Flag, FolderKanban, LoaderCircle, MoreVertical, Pencil, Plus, RefreshCw, Search, Trash2, Users, X } from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

type ProjectPriority = "low" | "medium" | "high";

type ProjectStatus = "planning" | "in_progress" | "pending" | "completed" | "admin_hold" | "active" | "on_hold" | "cancelled";

type NormalizedProjectStatus = "planning" | "in_progress" | "pending" | "completed" | "admin_hold";

type StatusFilter = "all" | NormalizedProjectStatus;
type PriorityFilter = "all" | ProjectPriority;
type ListSize = 5 | 10 | 25 | "all";

interface ProjectMember {
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
  members: ProjectMember[];
}

interface ProjectsResponse {
  projects: Project[];
}

interface BackendErrorResponse {
  message?: string | string[];
}

interface StoredUser {
  fullName?: string;
  name?: string;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const LIST_SIZE_OPTIONS: ListSize[] = [5, 10, 25, "all"];

function normalizeProjectStatus(status: ProjectStatus): NormalizedProjectStatus {
  if (status === "active" || status === "in_progress") {
    return "in_progress";
  }

  if (status === "pending") {
    return "pending";
  }

  if (status === "completed") {
    return "completed";
  }

  if (status === "on_hold" || status === "admin_hold" || status === "cancelled") {
    return "admin_hold";
  }

  return "planning";
}

function getStoredToken() {
  return localStorage.getItem("taskflow_token") || sessionStorage.getItem("taskflow_token");
}

function clearStoredSession() {
  localStorage.removeItem("taskflow_token");
  localStorage.removeItem("taskflow_user");

  sessionStorage.removeItem("taskflow_token");
  sessionStorage.removeItem("taskflow_user");
}

function getBackendErrorMessage(error: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError<BackendErrorResponse>(error)) {
    return fallbackMessage;
  }

  const backendMessage = error.response?.data?.message;

  if (Array.isArray(backendMessage)) {
    return backendMessage.join(", ");
  }

  if (typeof backendMessage === "string") {
    return backendMessage;
  }

  if (!error.response) {
    return "Backend server is not reachable.";
  }

  return fallbackMessage;
}

export default function ProjectsPage() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [adminName, setAdminName] = useState("Admin");

  const [projects, setProjects] = useState<Project[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [listSize, setListSize] = useState<ListSize>(5);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("taskflow_user") || sessionStorage.getItem("taskflow_user");

    if (!storedUser) {
      return;
    }

    try {
      const parsedUser: StoredUser = JSON.parse(storedUser);

      // eslint-disable-next-line react-hooks/set-state-in-effect -- admin name is hydrated from client storage after mount.
      setAdminName(parsedUser.fullName || parsedUser.name || "Admin");
    } catch {
      setAdminName("Admin");
    }
  }, []);

  const handleUnauthorized = useCallback(() => {
    clearStoredSession();

    toast.error("Your login session has expired.");

    window.setTimeout(() => {
      router.replace("/login");
    }, 700);
  }, [router]);

  const fetchProjects = useCallback(
    async (showRefreshLoader = false) => {
      const token = getStoredToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await axios.get<ProjectsResponse>(`${apiUrl}/projects`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setProjects(Array.isArray(response.data.projects) ? response.data.projects : []);
      } catch (error) {
        console.error("Fetch projects error:", error);

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          handleUnauthorized();
          return;
        }

        toast.error(getBackendErrorMessage(error, "Unable to load projects."));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- projects are fetched once after client auth storage is available.
    void fetchProjects();
  }, [fetchProjects]);

  const projectStats = useMemo(
    () => ({
      total: projects.length,

      planning: projects.filter((project) => normalizeProjectStatus(project.status) === "planning").length,

      inProgress: projects.filter((project) => normalizeProjectStatus(project.status) === "in_progress").length,

      pending: projects.filter((project) => normalizeProjectStatus(project.status) === "pending").length,

      completed: projects.filter((project) => project.status === "completed").length,

      onHold: projects.filter((project) => normalizeProjectStatus(project.status) === "admin_hold").length,
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
      label: "Admin Hold",
      value: "admin_hold",
      count: projectStats.onHold,
    },
  ];

  const filteredProjects = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const members = project.members || [];

      const matchesSearch =
        !searchValue ||
        project.name.toLowerCase().includes(searchValue) ||
        project.description?.toLowerCase().includes(searchValue) ||
        members.some((member) => member.fullName.toLowerCase().includes(searchValue));

      const matchesStatus = statusFilter === "all" || normalizeProjectStatus(project.status) === statusFilter;

      const matchesPriority = priorityFilter === "all" || project.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, searchTerm, statusFilter, priorityFilter]);

  const resetListView = () => {
    setCurrentPage(1);
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    resetListView();
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    resetListView();
  };

  const handlePriorityFilterChange = (value: PriorityFilter) => {
    setPriorityFilter(value);
    resetListView();
  };

  const handleListSizeChange = (value: string) => {
    setListSize(value === "all" ? "all" : (Number(value) as ListSize));
    resetListView();
  };

  const totalPages = listSize === "all" ? 1 : Math.max(1, Math.ceil(filteredProjects.length / listSize));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = listSize === "all" ? 0 : (safeCurrentPage - 1) * listSize;

  const paginatedProjects = listSize === "all" ? filteredProjects : filteredProjects.slice(startIndex, startIndex + listSize);

  const endIndex = listSize === "all" ? filteredProjects.length : Math.min(startIndex + listSize, filteredProjects.length);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    resetListView();
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || deletingId) {
      return;
    }

    const token = getStoredToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setDeletingId(projectToDelete.id);

    try {
      await axios.delete(`${apiUrl}/projects/${projectToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProjects((previous) => previous.filter((project) => project.id !== projectToDelete.id));

      toast.success("Project deleted successfully");

      setProjectToDelete(null);
    } catch (error) {
      console.error("Delete project error:", error);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      toast.error(getBackendErrorMessage(error, "Unable to delete project."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 999999,
        }}
        toastOptions={{
          duration: 3000,

          style: {
            minWidth: "280px",
            borderRadius: "14px",
            background: "#ffffff",
            color: "#0f172a",
            padding: "14px 18px",
            fontSize: "14px",
            fontWeight: "600",
            border: "1px solid #e2e8f0",
            boxShadow: "0 15px 35px rgba(15, 23, 42, 0.18)",
          },

          success: {
            iconTheme: {
              primary: "#059669",
              secondary: "#ffffff",
            },
          },

          error: {
            duration: 4000,

            iconTheme: {
              primary: "#dc2626",
              secondary: "#ffffff",
            },
          },
        }}
      />

      <div className="relative z-50 shrink-0">
        <Header userName={adminName} setSidebarOpen={setSidebarOpen} />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && <button type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden" />}

        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 pt-16
            transition-transform duration-300
            md:relative md:translate-x-0 md:pt-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">Projects</h1>

                  <p className="mt-1 text-sm text-slate-500">Manage, track and update all TaskFlow projects.</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void fetchProjects(true)}
                    disabled={isRefreshing || isLoading}
                    className="inline-flex min-h-11 items-center cursor-pointer justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </button>

                  <Link
                    href="/admin/projects/create"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Create Project
                  </Link>
                </div>
              </div>

              <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/70">
                <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
                  <div className="flex shrink-0 flex-nowrap gap-2 overflow-x-auto pb-1 xl:pb-0">
                    {statusTabs.map((tab) => {
                      const isSelected = statusFilter === tab.value;

                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => handleStatusFilterChange(tab.value)}
                          className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-bold transition ${
                            isSelected ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/50 hover:text-emerald-700"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(160px,1fr)_122px_122px_76px_auto] xl:min-w-[560px] xl:max-w-[620px] xl:flex-1">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => handleSearchTermChange(event.target.value)}
                        placeholder="Search project..."
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <select
                        value={statusFilter}
                        onChange={(event) => handleStatusFilterChange(event.target.value as StatusFilter)}
                        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      >
                        <option value="all">All Status</option>

                        <option value="planning">Planning</option>

                        <option value="in_progress">In Progress</option>

                        <option value="pending">Pending</option>

                        <option value="completed">Completed</option>

                        <option value="admin_hold">Admin Hold</option>
                      </select>

                      <SelectArrow />
                    </div>

                    <div className="relative">
                      <Flag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <select
                        value={priorityFilter}
                        onChange={(event) => handlePriorityFilterChange(event.target.value as PriorityFilter)}
                        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      >
                        <option value="all">All Priority</option>

                        <option value="low">Low</option>

                        <option value="medium">Medium</option>

                        <option value="high">High</option>
                      </select>

                      <SelectArrow />
                    </div>

                    <div className="relative">
                      <select
                        value={listSize}
                        onChange={(event) => handleListSizeChange(event.target.value)}
                        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                        aria-label="Projects per page"
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
                      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </button>
                  </div>
                </div>
              </section>

              {isLoading ? (
                <LoadingState />
              ) : (
                <>
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="hidden overflow-x-auto lg:block">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-slate-50">
                          <tr className="border-b border-slate-200">
                            <TableHeading>Project</TableHeading>
                            <TableHeading>Members</TableHeading>
                            <TableHeading>Timeline</TableHeading>
                            <TableHeading>Priority</TableHeading>
                            <TableHeading>Status</TableHeading>
                            <TableHeading align="right">Actions</TableHeading>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredProjects.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-5 py-14 text-center">
                                <div className="mx-auto max-w-md">
                                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <FolderKanban className="h-7 w-7" />
                                  </div>

                                  <h2 className="mt-4 text-base font-bold text-slate-900">
                                    {projects.length === 0 ? "No projects created yet" : "No matching projects"}
                                  </h2>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            paginatedProjects.map((project) => (
                              <tr key={project.id} className="transition hover:bg-slate-50/80">
                                <td className="px-5 py-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                      <FolderKanban className="h-5 w-5" />
                                    </div>

                                    <div className="min-w-0">
                                      <Link
                                        href={`/admin/projects/${project.id}`}
                                        className="block max-w-[250px] truncate text-sm font-bold text-slate-900 transition hover:text-emerald-700"
                                      >
                                        {project.name}
                                      </Link>

                                      <p className="mt-1 max-w-[120px] truncate text-xs text-slate-500">
                                        {project.description || "No description provided"}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if ((project.members?.length || 0) > 0) {
                                        router.push(`/admin/projects/${project.id}/members`);
                                      }
                                    }}
                                    disabled={(project.members?.length || 0) === 0}
                                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                                  >
                                    <Users className="h-4 w-4" />
                                    Members ({project.members?.length || 0})
                                  </button>
                                </td>

                                <td className="px-5 py-4">
                                  <div className="space-y-1 text-xs">
                                    <p className="font-semibold text-slate-700">{formatDate(project.startDate)}</p>
                                    <p className="text-slate-400">to {formatDate(project.dueDate)}</p>
                                  </div>
                                </td>

                                <td className="px-5 py-4">
                                  <PriorityBadge priority={project.priority} />
                                </td>

                                <td className="px-5 py-4">
                                  <StatusBadge status={project.status} />
                                </td>

                                <td className="px-5 py-4">
                                  <ProjectActions
                                    project={project}
                                    deleting={deletingId === project.id}
                                    onView={() => router.push(`/admin/projects/${project.id}`)}
                                    onEdit={() => router.push(`/admin/projects/${project.id}/edit`)}
                                    onDelete={() => setProjectToDelete(project)}
                                  />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="divide-y divide-slate-100 lg:hidden">
                      {filteredProjects.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <FolderKanban className="h-7 w-7" />
                          </div>

                          <h2 className="mt-4 text-base font-bold text-slate-900">
                            {projects.length === 0 ? "No projects created yet" : "No matching projects"}
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            {projects.length === 0
                              ? "No project data is available."
                              : "Try changing the search text or filters."}
                          </p>
                        </div>
                      ) : (
                        paginatedProjects.map((project) => (
                          <article key={project.id} className="p-5">
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                <FolderKanban className="h-5 w-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/admin/projects/${project.id}`}
                                  className="block truncate font-bold text-slate-900 transition hover:text-emerald-700"
                                >
                                  {project.name}
                                </Link>

                                <p className="mt-1 max-w-full truncate text-sm text-slate-500">
                                  {project.description || "No description provided"}
                                </p>
                              </div>

                              <ProjectActions
                                project={project}
                                deleting={deletingId === project.id}
                                onView={() => router.push(`/admin/projects/${project.id}`)}
                                onEdit={() => router.push(`/admin/projects/${project.id}/edit`)}
                                onDelete={() => setProjectToDelete(project)}
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <PriorityBadge priority={project.priority} />
                              <StatusBadge status={project.status} />
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                              <MobileDetail label="Start Date" value={formatDate(project.startDate)} />
                              <MobileDetail label="Due Date" value={formatDate(project.dueDate)} />

                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Members</p>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if ((project.members?.length || 0) > 0) {
                                      router.push(`/admin/projects/${project.id}/members`);
                                    }
                                  }}
                                  disabled={(project.members?.length || 0) === 0}
                                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                                >
                                  <Users className="h-4 w-4" />
                                  View Members ({project.members?.length || 0})
                                </button>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>

                    {filteredProjects.length > 0 && (
                      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                          Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to <span className="font-semibold text-slate-800">{endIndex}</span> of{" "}
                          <span className="font-semibold text-slate-800">{filteredProjects.length}</span> projects
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Previous page"
                            disabled={safeCurrentPage === 1}
                            onClick={() => setCurrentPage((previousPage) => Math.max(1, previousPage - 1))}
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
                              onClick={() => setCurrentPage(pageNumber)}
                              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                                safeCurrentPage === pageNumber ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {pageNumber}
                            </button>
                          ))}

                          <button
                            type="button"
                            aria-label="Next page"
                            disabled={safeCurrentPage === totalPages}
                            onClick={() => setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1))}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </main>

          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </div>

      {projectToDelete && (
        <Modal
          title="Delete Project"
          onClose={() => {
            if (!deletingId) {
              setProjectToDelete(null);
            }
          }}
        >
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">Delete {projectToDelete.name}?</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">This project will be permanently deleted. This action cannot be undone.</p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={Boolean(deletingId)}
                className="cursor-pointer inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleDeleteProject()}
                disabled={Boolean(deletingId)}
                className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Project
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TableHeading({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return <th className={`px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  const classes: Record<ProjectPriority, string> = {
    low: "bg-blue-50 text-blue-700 ring-blue-600/10",
    medium: "bg-amber-50 text-amber-700 ring-amber-600/10",
    high: "bg-rose-50 text-rose-700 ring-rose-600/10",
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${classes[priority]}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const normalizedStatus = normalizeProjectStatus(status);

  const classes: Record<NormalizedProjectStatus, string> = {
    planning: "bg-violet-50 text-violet-700 ring-violet-600/10",
    in_progress: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    pending: "bg-amber-50 text-amber-700 ring-amber-600/10",
    completed: "bg-blue-50 text-blue-700 ring-blue-600/10",
    admin_hold: "bg-slate-100 text-slate-700 ring-slate-600/10",
  };

  const labels: Record<NormalizedProjectStatus, string> = {
    planning: "Planning",
    in_progress: "In Progress",
    pending: "Pending",
    completed: "Completed",
    admin_hold: "Admin Hold",
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${classes[normalizedStatus]}`}>{labels[normalizedStatus]}</span>;
}

function ProjectActions({ project, deleting, onView, onEdit, onDelete }: { project: Project; deleting: boolean; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    if (deleting) {
      return;
    }

    if (dropdownOpen) {
      setDropdownOpen(false);
      return;
    }

    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();

    const menuWidth = 192;
    const menuHeight = 150;
    const padding = 12;

    let left = rect.right - menuWidth;

    let top = rect.bottom + 8;

    if (left < padding) {
      left = padding;
    }

    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }

    if (top + menuHeight > window.innerHeight - padding) {
      top = rect.top - menuHeight - 8;
    }

    setMenuPosition({
      top,
      left,
    });

    setDropdownOpen(true);
  };

  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setDropdownOpen(false);
    };

    const closeDropdown = () => {
      setDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);

    window.addEventListener("resize", closeDropdown);

    window.addEventListener("scroll", closeDropdown, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);

      window.removeEventListener("resize", closeDropdown);

      window.removeEventListener("scroll", closeDropdown, true);
    };
  }, [dropdownOpen]);

  const runAction = (action: () => void) => {
    setDropdownOpen(false);
    action();
  };

  return (
    <>
      <div className="flex justify-end">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          disabled={deleting}
          aria-label={`Open actions for ${project.name}`}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
          className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-5 w-5" />}
        </button>
      </div>

      {dropdownOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            className="z-[100000] w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(onView)}
              className="cursor-pointer flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
            >
              <Eye className="h-4 w-4" />
              View Project
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(onEdit)}
              className="cursor-pointer flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Pencil className="h-4 w-4" />
              Edit Project
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button type="button" role="menuitem" onClick={() => runAction(onDelete)} className="cursor-pointer flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
              <Trash2 className="h-4 w-4" />
              Delete Project
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-emerald-600" />

        <p className="mt-3 text-sm font-semibold text-slate-600">Loading projects...</p>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <section role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <button type="button" onClick={onClose} aria-label="Close modal" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

function SelectArrow() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
      <path fillRule="evenodd" clipRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
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
