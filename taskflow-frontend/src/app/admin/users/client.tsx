"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Eye, Filter, Trash2, LoaderCircle, Mail, MoreVertical, Pencil, Phone, Plus, RefreshCw, Search, UserCheck, UserRound, UserX, X } from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

type UserStatus = "active" | "inactive";
type ListSize = 5 | 10 | 25 | "all";

interface TaskFlowUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage?: string | null;
  role?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
}

interface UsersObjectResponse {
  message?: string;
  users?: TaskFlowUser[];
  data?: TaskFlowUser[];
}

interface StatusObjectResponse {
  message?: string;
  user?: TaskFlowUser;
  data?: TaskFlowUser;
}

interface MenuPosition {
  top: number;
  left: number;
}

const LIST_SIZE_OPTIONS: ListSize[] = [5, 10, 25, "all"];
const MENU_WIDTH = 192;
const MENU_HEIGHT = 150;
const SCREEN_PADDING = 16;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getProfileImageUrl(profileImage?: string | null): string | null {
  if (!profileImage) {
    return null;
  }

  if (profileImage.startsWith("data:") || profileImage.startsWith("blob:") || profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
    return profileImage;
  }

  return `${API_URL}${profileImage.startsWith("/") ? "" : "/"}${profileImage}`;
}

export default function UsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [adminName, setAdminName] = useState("Admin");

  const [users, setUsers] = useState<TaskFlowUser[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [listSize, setListSize] = useState<ListSize>(5);

  const [openMenuUser, setOpenMenuUser] = useState<TaskFlowUser | null>(null);

  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const apiUrl = API_URL;

  const getToken = useCallback((): string | null => {
    return localStorage.getItem("taskflow_token") || sessionStorage.getItem("taskflow_token");
  }, []);

  const getRequestHeaders = useCallback(() => {
    const token = getToken();

    return {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    };
  }, [getToken]);

  const getBackendErrorMessage = useCallback((error: unknown, fallbackMessage: string): string => {
    if (!axios.isAxiosError(error)) {
      return fallbackMessage;
    }

    const backendMessage = error.response?.data?.message;

    if (Array.isArray(backendMessage)) {
      return backendMessage.join(" ");
    }

    if (typeof backendMessage === "string") {
      return backendMessage;
    }

    if (!error.response) {
      return "Backend server is not reachable. Please make sure the backend is running on port 5000.";
    }

    return fallbackMessage;
  }, []);

  const closeActionMenu = useCallback(() => {
    setOpenMenuUser(null);
    setMenuPosition(null);
  }, []);

  const handleDeleteUser = (user: TaskFlowUser) => {
    closeActionMenu();

    const confirmationToastId = "delete-user-confirmation";

    toast.dismiss(confirmationToastId);

    toast(
      (toastItem) => (
        <div className="w-[320px]">
          <p className="text-center font-bold text-slate-900">Delete user?</p>

          <p className="mt-2 text-center text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-900">{user.fullName}</span>?
          </p>

          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastItem.id);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                toast.dismiss(toastItem.id);

                try {
                  setDeletingUserId(user.id);

                  await axios.delete(`${apiUrl}/users/${user.id}`, {
                    headers: getRequestHeaders(),
                  });

                  setUsers((previousUsers) => previousUsers.filter((currentUser) => currentUser.id !== user.id));

                  toast.success(`${user.fullName} deleted successfully`);
                } catch (error: unknown) {
                  toast.error(getBackendErrorMessage(error, "Unable to delete user."));
                } finally {
                  setDeletingUserId(null);
                }
              }}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        id: confirmationToastId,
        duration: Infinity,
        position: "top-center",

        style: {
          padding: "18px",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.25)",
        },
      },
    );
  };

  const fetchUsers = useCallback(
    async (showRefreshToast = false) => {
      try {
        if (showRefreshToast) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        closeActionMenu();

        const response = await axios.get<TaskFlowUser[] | UsersObjectResponse>(`${apiUrl}/users`, {
          headers: getRequestHeaders(),
        });

        let receivedUsers: TaskFlowUser[] = [];

        if (Array.isArray(response.data)) {
          receivedUsers = response.data;
        } else if (Array.isArray(response.data.users)) {
          receivedUsers = response.data.users;
        } else if (Array.isArray(response.data.data)) {
          receivedUsers = response.data.data;
        }

        const normalizedUsers: TaskFlowUser[] = receivedUsers.map(
          (user): TaskFlowUser => ({
            ...user,

            status: user.status === "inactive" ? "inactive" : "active",
          }),
        );

        setUsers(normalizedUsers);

        if (showRefreshToast) {
          toast.success("Users refreshed successfully");
        }
      } catch (error: unknown) {
        toast.error(getBackendErrorMessage(error, "Unable to load users."));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiUrl, closeActionMenu, getBackendErrorMessage, getRequestHeaders],
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("taskflow_user") || sessionStorage.getItem("taskflow_user");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        // eslint-disable-next-line react-hooks/set-state-in-effect -- admin name is hydrated from client storage after mount.
        setAdminName(parsedUser.fullName || parsedUser.name || "Admin");
      } catch {
        setAdminName("Admin");
      }
    }

    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const handleViewportChange = () => {
      closeActionMenu();
    };

    window.addEventListener("resize", handleViewportChange);

    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);

      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [closeActionMenu]);

  const resetListView = () => {
    setCurrentPage(1);
    closeActionMenu();
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    resetListView();
  };

  const handleStatusFilterChange = (value: "all" | UserStatus) => {
    setStatusFilter(value);
    resetListView();
  };

  const handleListSizeChange = (value: string) => {
    setListSize(value === "all" ? "all" : (Number(value) as ListSize));
    resetListView();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setListSize(5);
    resetListView();
  };

  const handleStatusChange = async (userId: string, currentStatus: UserStatus) => {
    const newStatus: UserStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      setUpdatingStatusId(userId);
      closeActionMenu();

      const response = await axios.patch<TaskFlowUser | StatusObjectResponse>(
        `${apiUrl}/users/${userId}/status`,
        {
          status: newStatus,
        },
        {
          headers: getRequestHeaders(),
        },
      );

      let updatedStatus = newStatus;

      if (!Array.isArray(response.data)) {
        if ("status" in response.data) {
          updatedStatus = response.data.status === "inactive" ? "inactive" : "active";
        } else {
          const updatedUser = response.data.user || response.data.data;

          if (updatedUser?.status) {
            updatedStatus = updatedUser.status === "inactive" ? "inactive" : "active";
          }
        }
      }

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                status: updatedStatus,
              }
            : user,
        ),
      );

      toast.success(updatedStatus === "active" ? "User activated successfully" : "User deactivated successfully");
    } catch (error: unknown) {
      toast.error(getBackendErrorMessage(error, "Unable to update user status."));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleMenuToggle = (event: React.MouseEvent<HTMLButtonElement>, user: TaskFlowUser) => {
    event.stopPropagation();

    if (openMenuUser?.id === user.id) {
      closeActionMenu();
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();

    let left = buttonRect.right - MENU_WIDTH;

    if (left < SCREEN_PADDING) {
      left = SCREEN_PADDING;
    }

    if (left + MENU_WIDTH > window.innerWidth - SCREEN_PADDING) {
      left = window.innerWidth - MENU_WIDTH - SCREEN_PADDING;
    }

    const spaceBelow = window.innerHeight - buttonRect.bottom;

    const top = spaceBelow >= MENU_HEIGHT ? buttonRect.bottom + 8 : Math.max(SCREEN_PADDING, buttonRect.top - MENU_HEIGHT - 8);

    setOpenMenuUser(user);

    setMenuPosition({
      top,
      left,
    });
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const fullName = user.fullName?.toLowerCase() || "";

      const email = user.email?.toLowerCase() || "";

      const phoneNumber = user.phoneNumber || "";

      const matchesSearch = !search || fullName.includes(search) || email.includes(search) || phoneNumber.includes(search);

      const matchesStatus = statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const totalPages = listSize === "all" ? 1 : Math.max(1, Math.ceil(filteredUsers.length / listSize));

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = listSize === "all" ? 0 : (safeCurrentPage - 1) * listSize;

  const paginatedUsers = listSize === "all" ? filteredUsers : filteredUsers.slice(startIndex, startIndex + listSize);

  const endIndex = listSize === "all" ? filteredUsers.length : Math.min(startIndex + listSize, filteredUsers.length);

  const activeUsers = users.filter((user) => user.status === "active").length;

  const inactiveUsers = users.filter((user) => user.status === "inactive").length;

  const statusTabs: Array<{
    label: string;
    value: "all" | UserStatus;
    count: number;
  }> = [
    {
      label: "All",
      value: "all",
      count: users.length,
    },
    {
      label: "Active",
      value: "active",
      count: activeUsers,
    },
    {
      label: "Inactive",
      value: "inactive",
      count: inactiveUsers,
    },
  ];

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

      {/* Desktop action dropdown */}
      {openMenuUser && menuPosition && (
        <>
          <button type="button" aria-label="Close user actions" onClick={closeActionMenu} className="fixed inset-0 z-[9997] cursor-default bg-transparent" />

          <div
            className="fixed z-[9998]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <ActionMenu
              user={openMenuUser}
              isUpdating={updatingStatusId === openMenuUser.id}
              isDeleting={deletingUserId === openMenuUser.id}
              onStatusChange={() => handleStatusChange(openMenuUser.id, openMenuUser.status)}
              onDelete={() => handleDeleteUser(openMenuUser)}
            />
          </div>
        </>
      )}

      {/* Header */}
      <div className="relative z-50 shrink-0">
        <Header userName={adminName} setSidebarOpen={setSidebarOpen} />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && <button type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden" />}

        {/* Sidebar */}
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

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              {/* Page heading */}
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">Users</h1>

                  <p className="mt-1 text-sm text-slate-500">Create and manage TaskFlow team members.</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void fetchUsers(true)}
                    disabled={isRefreshing || isLoading}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </button>

                  <Link
                    href="/admin/users/create"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Create User
                  </Link>
                </div>
              </div>

              {/* Filters */}
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
                            isSelected
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100"
                              : "border-slate-200 bg-white text-slate-700 hover:border-emerald-100 hover:bg-emerald-50/50 hover:text-emerald-700"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(180px,1fr)_122px_76px_auto] xl:min-w-[480px] xl:max-w-[560px] xl:flex-1">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => handleSearchTermChange(event.target.value)}
                        placeholder="Search user..."
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <select
                        value={statusFilter}
                        onChange={(event) => handleStatusFilterChange(event.target.value as "all" | UserStatus)}
                        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                      >
                        <option value="all">All Status</option>

                        <option value="active">Active</option>

                        <option value="inactive">Inactive</option>
                      </select>

                      <SelectArrow />
                    </div>

                    <div className="relative">
                      <select
                        value={listSize}
                        onChange={(event) => handleListSizeChange(event.target.value)}
                        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                        aria-label="Users per page"
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

              {/* Users container */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Loading */}
                {isLoading && (
                  <div className="flex min-h-72 flex-col items-center justify-center px-6 py-16">
                    <LoaderCircle className="h-10 w-10 animate-spin text-emerald-600" />

                    <p className="mt-4 text-sm font-semibold text-slate-600">Loading users...</p>
                  </div>
                )}

                {!isLoading && (
                  <>
                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto lg:block">
                      <table className="w-full min-w-[1050px]">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70">
                            <TableHeading>User</TableHeading>

                            <TableHeading>Email</TableHeading>

                            <TableHeading>Mobile Number</TableHeading>

                            <TableHeading>Status</TableHeading>

                            <TableHeading>Created</TableHeading>

                            <TableHeading align="right">Actions</TableHeading>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {paginatedUsers.map((user) => (
                            <tr key={user.id} className="transition hover:bg-slate-50/70">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <UserAvatar user={user} />

                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900">{user.fullName}</p>

                                    <p className="mt-0.5 text-xs capitalize text-slate-500">{user.role || "Team Member"}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />

                                  <span className="max-w-[240px] truncate">{user.email}</span>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />

                                  {user.phoneNumber || "Not available"}
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <StatusBadge status={user.status} />
                              </td>

                              <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">{formatDate(user.createdAt)}</td>

                              <td className="px-6 py-4 text-right">
                                <button
                                  type="button"
                                  aria-label={`Open actions for ${user.fullName}`}
                                  disabled={updatingStatusId === user.id}
                                  onClick={(event) => handleMenuToggle(event, user)}
                                  className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {updatingStatusId === user.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="divide-y divide-slate-100 lg:hidden">
                      {paginatedUsers.map((user) => (
                        <article key={user.id} className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar user={user} />

                              <div className="min-w-0">
                                <h2 className="truncate font-bold text-slate-900">{user.fullName}</h2>

                                <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>

                            <StatusBadge status={user.status} />
                          </div>

                          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone className="h-4 w-4 text-slate-400" />

                              {user.phoneNumber || "Not available"}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <CheckCircle2 className="h-4 w-4 text-slate-400" />
                              Created {formatDate(user.createdAt)}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <Link href={`/admin/users/${user.id}`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                              <Eye className="h-4 w-4" />
                              View
                            </Link>

                            <Link href={`/admin/users/${user.id}/edit`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Link>

                            <button
                              type="button"
                              disabled={updatingStatusId === user.id}
                              onClick={() => handleStatusChange(user.id, user.status)}
                              className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                user.status === "active" ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {updatingStatusId === user.id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : user.status === "active" ? (
                                <>
                                  <UserX className="h-4 w-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4" />
                                  Enable
                                </>
                              )}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>

                    {/* Empty state */}
                    {filteredUsers.length === 0 && (
                      <div className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <UserRound className="h-8 w-8" />
                        </div>

                        <h3 className="mt-4 text-lg font-bold text-slate-900">No users found</h3>
                      </div>
                    )}

                    {/* Pagination */}
                    {filteredUsers.length > 0 && (
                      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                          Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to <span className="font-semibold text-slate-800">{endIndex}</span> of{" "}
                          <span className="font-semibold text-slate-800">{filteredUsers.length}</span> users
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
                  </>
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

function TableHeading({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}

function SelectArrow() {
  return <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />;
}

function UserAvatar({ user }: { user: TaskFlowUser }) {
  const initials = getInitials(user.fullName);

  const profileImageUrl = getProfileImageUrl(user.profileImage);

  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  if (!profileImageUrl || failedImageUrl === profileImageUrl) {
    return <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-sm">{initials}</div>;
  }

  return <img src={profileImageUrl} alt={user.fullName} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white" onError={() => setFailedImageUrl(profileImageUrl)} />;
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize ${status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-rose-500"}`} />

      {status}
    </span>
  );
}

function ActionMenu({ user, isUpdating, isDeleting, onStatusChange, onDelete }: { user: TaskFlowUser; isUpdating: boolean; isDeleting: boolean; onStatusChange: () => void; onDelete: () => void }) {
  return (
    <div className="w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-2xl shadow-slate-900/20">
      <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
        <Eye className="h-4 w-4 text-slate-400" />
        View Profile
      </Link>

      <Link href={`/admin/users/${user.id}/edit`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
        <Pencil className="h-4 w-4 text-slate-400" />
        Edit User
      </Link>

      <button
        type="button"
        onClick={onStatusChange}
        disabled={isUpdating}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
          user.status === "active" ? "text-rose-700 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {isUpdating ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : user.status === "active" ? (
          <>
            <UserX className="h-4 w-4" />
            Deactivate
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4" />
            Activate
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting || isUpdating}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            Delete User
          </>
        )}
      </button>
    </div>
  );
}

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
