"use client";

import { useEffect, useState } from "react";

import {
  AlertTriangle,
  Database,
  Eye,
  EyeOff,
  FolderKanban,
  Images,
  ListTodo,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  Settings,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";

import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

interface StoredUser {
  fullName?: string;
  name?: string;
}

const REQUIRED_CONFIRMATION_TEXT = "DELETE TASKFLOW";

const deleteItems = [
  {
    title: "Admin Account",
    description: "Current administrator account will be permanently deleted.",
    icon: ShieldAlert,
  },
  {
    title: "Registered Users",
    description: "All team members and their accounts will be deleted.",
    icon: Users,
  },
  {
    title: "Projects",
    description:
      "All created projects and project information will be deleted.",
    icon: FolderKanban,
  },
  {
    title: "Tasks",
    description: "All assigned, pending and completed tasks will be deleted.",
    icon: ListTodo,
  },
  {
    title: "Comments",
    description: "All task and project comments will be deleted.",
    icon: MessageSquare,
  },
  {
    title: "System Settings",
    description:
      "TaskFlow settings and application configuration will be reset.",
    icon: Settings,
  },
  {
    title: "Uploaded Files",
    description: "Profile images and other uploaded files will be removed.",
    icon: Images,
  },
  {
    title: "Complete Database",
    description:
      "All TaskFlow workspace information will be permanently removed.",
    icon: Database,
  },
];

export default function DangerZoneClient() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [adminName, setAdminName] = useState("Admin");

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [password, setPassword] = useState("");

  const [confirmationText, setConfirmationText] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);

      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  const canDelete =
    !isDeleting &&
    password.trim().length > 0 &&
    confirmationText === REQUIRED_CONFIRMATION_TEXT;

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isDeleting) return;

    setIsModalOpen(false);
    setPassword("");
    setConfirmationText("");
    setShowPassword(false);
  };

  const handleDeleteWorkspace = async () => {
    if (!canDelete || isDeleting) return;

    const token =
      localStorage.getItem("taskflow_token") ||
      sessionStorage.getItem("taskflow_token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (!token) {
      toast.error("Login session not found. Please login again.");

      return;
    }

    try {
      setIsDeleting(true);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const response = await axios.delete(`${apiUrl}/auth/delete-workspace`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        data: {
          currentPassword: password,
          confirmationText,
        },
      });

      toast.success(
        response.data.message || "TaskFlow workspace deleted successfully.",
      );

      localStorage.removeItem("taskflow_token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("taskflow_user");

      sessionStorage.removeItem("taskflow_token");
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("taskflow_user");

      window.setTimeout(() => {
        window.location.replace("/setup");
      }, 1000);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        if (Array.isArray(message)) {
          toast.error(message.join(" "));
        } else {
          toast.error(message || "Unable to delete TaskFlow workspace.");
        }
      } else {
        toast.error("Unable to delete TaskFlow workspace.");
      }
    } finally {
      setIsDeleting(false);
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
      />
      {/* Header */}
      <div className="relative z-50 shrink-0">
        <Header userName={adminName} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Sidebar and main section */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64
            bg-slate-950 pt-16
            transition-transform duration-300
            md:relative md:translate-x-0 md:pt-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <Sidebar />
        </aside>

        {/* Right section */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              {/* Page heading */}
              <div className="mb-7">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <ShieldAlert size={23} />
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      Danger Zone
                    </h1>

                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                      Permanently delete the complete TaskFlow application and
                      all associated workspace data.
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <AlertTriangle size={21} />
                  </div>

                  <div>
                    <h2 className="font-bold text-amber-950">
                      Important Warning
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Actions available on this page are permanent. Deleted
                      TaskFlow data cannot be recovered after the process is
                      completed.
                    </p>
                  </div>
                </div>
              </section>

              {/* Delete application card */}
              <section className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
                <div className="border-b border-red-100 bg-red-50 px-5 py-5 sm:px-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                      <Trash2 size={22} />
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Delete Entire TaskFlow App
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Delete the administrator, users and all data belonging
                        to this TaskFlow workspace.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      The following information will be deleted
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Review all affected data before continuing.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {deleteItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.title}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm ring-1 ring-slate-200">
                            <Icon size={20} />
                          </div>

                          <h4 className="mt-4 font-bold text-slate-900">
                            {item.title}
                          </h4>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-red-200 bg-red-50 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-3xl">
                      <h3 className="font-bold text-red-900">
                        This action cannot be undone
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-red-700">
                        After deletion, the current administrator will be logged
                        out and TaskFlow will return to the initial setup
                        screen.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openModal}
                      className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 active:scale-[0.98]"
                    >
                      <Trash2 size={18} />
                      Delete Entire App
                    </button>
                  </div>
                </div>
              </section>

              {/* Security protection */}
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <LockKeyhole size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Security Protection
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      To prevent accidental deletion, administrator identity and
                      password will be verified before deleting the application.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-sm font-bold text-emerald-600">
                      Step 1
                    </span>

                    <h3 className="mt-2 font-bold text-slate-900">
                      Admin Verification
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      The logged-in account must have administrator permission.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-sm font-bold text-emerald-600">
                      Step 2
                    </span>

                    <h3 className="mt-2 font-bold text-slate-900">
                      Password Confirmation
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      The administrator must enter the current account password.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <span className="text-sm font-bold text-emerald-600">
                      Step 3
                    </span>

                    <h3 className="mt-2 font-bold text-slate-900">
                      Permanent Deletion
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      All workspace data will be deleted after final
                      confirmation.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </main>

          {/* Footer */}
          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-workspace-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Trash2 size={22} />
                </div>

                <div>
                  <h2
                    id="delete-workspace-title"
                    className="text-lg font-bold text-slate-900"
                  >
                    Delete Entire TaskFlow App?
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>
                    <h3 className="text-sm font-bold text-red-900">
                      Permanent Deletion Warning
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-red-700">
                      The admin account, users, projects, tasks, comments,
                      settings and uploaded data will be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Current Password
                </label>

                <div className="relative">
                  <input
                    id="current-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-500 transition hover:text-slate-900"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* Confirmation text */}
              <div>
                <label
                  htmlFor="confirmation-text"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Confirmation Text
                </label>

                <p className="mb-2 text-sm leading-6 text-slate-500">
                  Type{" "}
                  <span className="font-bold text-red-600">
                    {REQUIRED_CONFIRMATION_TEXT}
                  </span>{" "}
                  to confirm permanent deletion.
                </p>

                <input
                  id="confirmation-text"
                  type="text"
                  value={confirmationText}
                  onChange={(event) =>
                    setConfirmationText(event.target.value.toUpperCase())
                  }
                  placeholder={REQUIRED_CONFIRMATION_TEXT}
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold uppercase tracking-wide text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canDelete || isDeleting}
                onClick={handleDeleteWorkspace}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {isDeleting ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
