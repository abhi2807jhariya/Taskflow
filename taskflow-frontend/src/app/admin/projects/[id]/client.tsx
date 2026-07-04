"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Flag, FolderKanban, LoaderCircle, Pencil, RefreshCw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import Footer from "@/src/components/layout/Footer";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";

type ProjectPriority = "low" | "medium" | "high";

type ProjectStatus = "planning" | "in_progress" | "pending" | "completed" | "admin_hold" | "active" | "on_hold" | "cancelled";

type NormalizedProjectStatus = "planning" | "in_progress" | "pending" | "completed" | "admin_hold";

interface ProjectMember {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  profileImage?: string | null;
  status?: string;
}

interface ProjectCreator {
  id: string;
  fullName: string;
  email: string;
  profileImage?: string | null;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: ProjectCreator;
  members: ProjectMember[];
}

interface ProjectResponse {
  message: string;
  project: Project;
}

interface BackendErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

interface StoredUser {
  fullName?: string;
  name?: string;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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

export default function ViewProjectPage() {
  const router = useRouter();
  const params = useParams();

  const projectId = typeof params.id === "string" ? params.id : "";

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [adminName, setAdminName] = useState("Admin");

  const [project, setProject] = useState<Project | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedUser = localStorage.getItem("taskflow_user") || sessionStorage.getItem("taskflow_user");

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

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const handleUnauthorized = useCallback(() => {
    clearStoredSession();

    toast.error("Your login session has expired.");

    window.setTimeout(() => {
      router.replace("/login");
    }, 700);
  }, [router]);

  const fetchProject = useCallback(
    async (showRefreshLoader = false) => {
      if (!projectId) {
        setLoadError("Project ID is missing or invalid.");
        setIsLoading(false);
        return;
      }

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

      setLoadError("");

      try {
        const response = await axios.get<ProjectResponse>(`${apiUrl}/projects/${projectId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setProject(response.data.project);
      } catch (error) {
        console.error("Fetch project error:", error);

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          handleUnauthorized();
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setLoadError("Project not found. It may have been deleted.");
          setProject(null);
          return;
        }

        const message = getBackendErrorMessage(error, "Unable to load project.");

        setLoadError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [handleUnauthorized, projectId],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchProject();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchProject]);

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
              {isLoading ? (
                <LoadingState />
              ) : loadError || !project ? (
                <ProjectErrorState message={loadError || "Project not found."} onBack={() => router.push("/admin/projects")} onRetry={() => void fetchProject()} />
              ) : (
                <>
                  <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">View Project</h1>

                      <p className="mt-1 text-sm text-slate-500">Review complete project information.</p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => router.push("/admin/projects")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Projects
                      </button>

                      <button
                        type="button"
                        onClick={() => void fetchProject(true)}
                        disabled={isRefreshing}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                        Refresh
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/admin/projects/${project.id}/edit`)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98]"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit Project
                      </button>
                    </div>
                  </div>

                  <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-white p-5 sm:p-7">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <FolderKanban className="h-7 w-7" />
                          </div>

                          <div className="min-w-0">
                            <h2 className="text-2xl font-bold text-slate-900 sm:text-2xl">{project.name}</h2>

                            <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{project.description || "No project description provided."}</p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <PriorityBadge priority={project.priority} />

                          <StatusBadge status={project.status} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-7 p-5 sm:p-7">
                      <div>
                        <SectionHeading icon={<CalendarDays className="h-5 w-5" />} title="Project Timeline" />

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <DetailCard icon={<CalendarDays className="h-5 w-5" />} label="Start Date" value={formatDate(project.startDate)} />

                          <DetailCard icon={<Clock3 className="h-5 w-5" />} label="Due Date" value={formatDate(project.dueDate)} />

                          <DetailCard icon={<CalendarDays className="h-5 w-5" />} label="Created On" value={formatDate(project.createdAt)} />

                          <DetailCard icon={<RefreshCw className="h-5 w-5" />} label="Last Updated" value={formatDate(project.updatedAt)} />
                        </div>
                      </div>

                      <div>
                        <SectionHeading icon={<CheckCircle2 className="h-5 w-5" />} title="Project Information" />

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <InformationRow label="Project ID" value={project.id} />

                          <InformationRow label="Priority" value={formatPriority(project.priority)} />

                          <InformationRow label="Status" value={formatStatus(project.status)} />
                        </div>
                      </div>
                    </div>
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
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-emerald-700">
      {icon}

      <h3 className="font-bold text-slate-900">{title}</h3>
    </div>
  );
}

function DetailCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">{icon}</div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>

        <p className="mt-1 truncate text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function InformationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>

      <p className="mt-1 break-all text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  const classes: Record<ProjectPriority, string> = {
    low: "bg-blue-50 text-blue-700 ring-blue-600/10",
    medium: "bg-amber-50 text-amber-700 ring-amber-600/10",
    high: "bg-rose-50 text-rose-700 ring-rose-600/10",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold capitalize ring-1 ring-inset ${classes[priority]}`}>
      <Flag className="h-3.5 w-3.5" />
      {priority}
    </span>
  );
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

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${classes[normalizedStatus]}`}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      {formatStatus(status)}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[450px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />

        <p className="mt-4 text-sm font-semibold text-slate-600">Loading project details...</p>
      </div>
    </div>
  );
}

function ProjectErrorState({ message, onBack, onRetry }: { message: string; onBack: () => void; onRetry: () => void }) {
  return (
    <div className="flex min-h-[450px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <FolderKanban className="h-8 w-8" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">Unable to view project</h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </button>

          <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
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

function formatStatus(status: ProjectStatus) {
  const labels: Record<NormalizedProjectStatus, string> = {
    planning: "Planning",
    in_progress: "In Progress",
    pending: "Pending",
    completed: "Completed",
    admin_hold: "Admin Hold",
  };

  return labels[normalizeProjectStatus(status)];
}

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

function formatPriority(priority: ProjectPriority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

