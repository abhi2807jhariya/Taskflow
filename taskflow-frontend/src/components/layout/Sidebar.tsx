"use client";

import {
  type ElementType,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LockKeyhole,
  PlusCircle,
  Settings,
  TriangleAlert,
  UserCheck,
  Users,
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: ElementType;
  exact?: boolean;
}

const menuItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: FolderKanban,
  },
];

const taskManagementSubmenu: SidebarItem[] = [
  {
    label: "Task List",
    href: "/admin/tasks",
    icon: ListTodo,
    exact: true,
  },
  {
    label: "Create Task",
    href: "/admin/tasks/create",
    icon: PlusCircle,
  },
  {
    label: "Assign Task",
    href: "/admin/tasks/assign",
    icon: UserCheck,
  },
];

const settingsSubmenu: SidebarItem[] = [
  {
    label: "Profile Settings",
    href: "/admin/settings/profile",
    icon: CircleUserRound,
  },
  {
    label: "Change Password",
    href: "/admin/settings/change-password",
    icon: LockKeyhole,
  },
  {
    label: "Danger Zone",
    href: "/admin/settings/danger-zone",
    icon: TriangleAlert,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [taskManagementOpen, setTaskManagementOpen] =
    useState(false);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const isMenuActive = (
    href: string,
    exact = false,
  ) => {
    if (exact) {
      return pathname === href;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  const isTaskManagementActive =
    taskManagementSubmenu.some((item) =>
      isMenuActive(item.href, item.exact),
    );

  const isSettingsActive = settingsSubmenu.some(
    (item) =>
      isMenuActive(item.href, item.exact),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTaskManagementOpen(
        isTaskManagementActive,
      );

      setSettingsOpen(isSettingsActive);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    isTaskManagementActive,
    isSettingsActive,
  ]);

  const toggleTaskManagement = () => {
    setTaskManagementOpen((previous) => {
      const nextState = !previous;

      if (nextState) {
        setSettingsOpen(false);
      }

      return nextState;
    });
  };

  const toggleSettings = () => {
    setSettingsOpen((previous) => {
      const nextState = !previous;

      if (nextState) {
        setTaskManagementOpen(false);
      }

      return nextState;
    });
  };

  const closeDropdowns = () => {
    setTaskManagementOpen(false);
    setSettingsOpen(false);
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {/* Main menu */}
        {menuItems.map((item) => {
          const Icon = item.icon;

          const active = isMenuActive(
            item.href,
            item.exact,
          );

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDropdowns}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  active
                    ? "text-violet-700"
                    : "text-slate-400"
                }`}
              />

              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Task Management dropdown */}
        <div>
          <button
            type="button"
            onClick={toggleTaskManagement}
            aria-expanded={taskManagementOpen}
            aria-controls="task-management-submenu"
            className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              isTaskManagementActive
                ? "bg-violet-50 text-violet-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-3">
              <ClipboardList
                className={`h-5 w-5 shrink-0 ${
                  isTaskManagementActive
                    ? "text-violet-700"
                    : "text-slate-400"
                }`}
              />

              <span>Task Management</span>
            </span>

            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                taskManagementOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          <div
            id="task-management-submenu"
            className={`grid transition-all duration-200 ${
              taskManagementOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="ml-6 mt-1 space-y-1 pl-3">
                {taskManagementSubmenu.map(
                  (item) => {
                    const Icon = item.icon;

                    const active = isMenuActive(
                      item.href,
                      item.exact,
                    );

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                          active
                            ? "bg-violet-50 text-violet-700"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active
                              ? "text-violet-700"
                              : "text-slate-400"
                          }`}
                        />

                        <span>{item.label}</span>
                      </Link>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings dropdown */}
        <div>
          <button
            type="button"
            onClick={toggleSettings}
            aria-expanded={settingsOpen}
            aria-controls="admin-settings-submenu"
            className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              isSettingsActive
                ? "bg-violet-50 text-violet-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-3">
              <Settings
                className={`h-5 w-5 shrink-0 ${
                  isSettingsActive
                    ? "text-violet-700"
                    : "text-slate-400"
                }`}
              />

              <span>Settings</span>
            </span>

            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                settingsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            id="admin-settings-submenu"
            className={`grid transition-all duration-200 ${
              settingsOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="ml-6 mt-1 space-y-1 pl-3">
                {settingsSubmenu.map((item) => {
                  const Icon = item.icon;

                  const active = isMenuActive(
                    item.href,
                    item.exact,
                  );

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active
                            ? "text-violet-700"
                            : "text-slate-400"
                        }`}
                      />

                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
