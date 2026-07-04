"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft,
  FolderKanban,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";

import Footer from "@/src/components/layout/Footer";
import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";

interface AssignedTask {
  id: string;
  title: string;
  projectName: string;
}

interface ProjectMember {
  id: string;
  fullName: string;
  tasks?: AssignedTask[];
}

interface Project {
  id: string;
  name: string;
  members: ProjectMember[];
}

interface ProjectResponse {
  project?: Project;
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

function getBackendErrorMessage(error: unknown, fallback: string) {
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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ProjectMembersPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadProject = useCallback(
    async (showRefreshLoader = false) => {
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
        const response = await axios.get<ProjectResponse>(
          `${API_URL}/projects/${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setProject(response.data.project || null);
      } catch (error) {
        toast.error(
          getBackendErrorMessage(error, "Unable to load project members."),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProject();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadProject]);

  const members = project?.members || [];

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
                    Assigned Members
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {project?.name || "Project"} members are counted from
                    assigned tasks.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void loadProject(true)}
                    disabled={loading || refreshing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/admin/projects")}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Projects
                  </button>
                </div>
              </div>

              {loading ? (
                <LoadingState />
              ) : members.length === 0 ? (
                <EmptyState />
              ) : (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[760px]">
                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200">
                          <TableHeading>User Name</TableHeading>
                          <TableHeading>Task Name</TableHeading>
                          <TableHeading>Project</TableHeading>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {members.flatMap((member) =>
                          (member.tasks || []).map((task) => (
                            <tr key={`${member.id}-${task.id}`}>
                              <td className="px-5 py-4">
                                <UserName name={member.fullName} />
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <ListChecks className="h-4 w-4 text-slate-400" />
                                  {task.title}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <FolderKanban className="h-4 w-4 text-slate-400" />
                                  {task.projectName}
                                </div>
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-slate-100 lg:hidden">
                    {members.map((member) => (
                      <article key={member.id} className="p-5">
                        <UserName name={member.fullName} />
                        <div className="mt-4 space-y-3">
                          {(member.tasks || []).map((task) => (
                            <div
                              key={task.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                            >
                              <p className="text-sm font-bold text-slate-800">
                                {task.title}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {task.projectName}
                              </p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
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

function UserName({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
        {getInitials(name)}
      </div>
      <span className="text-sm font-bold text-slate-900">{name}</span>
    </div>
  );
}

function TableHeading({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading members...
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <UserRound className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-lg font-bold text-slate-900">
        No assigned members
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Members will appear here after project tasks are assigned.
      </p>
    </div>
  );
}
