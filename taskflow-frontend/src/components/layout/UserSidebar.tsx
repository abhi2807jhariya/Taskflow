"use client";

import { type ElementType, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  CircleUserRound,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LockKeyhole,
  Settings,
} from "lucide-react";

interface SidebarItem {
  name: string;
  href: string;
  icon: ElementType;
}

const userMenuItems: SidebarItem[] = [
  {
    name: "Dashboard",
    href: "/user/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Projects",
    href: "/user/projects",
    icon: FolderKanban,
  },
  {
    name: "My Tasks",
    href: "/user/tasks",
    icon: ListTodo,
  },
  // {
  //   name: "Profile",
  //   href: "/user/profile",
  //   icon: UserRound,
  // },
];

const settingsSubmenu: SidebarItem[] = [
  {
    name: "Profile",
    href: "/user/settings/profile",
    icon: CircleUserRound,
  },
  {
    name: "Change Password",
    href: "/user/settings/change-password",
    icon: LockKeyhole,
  },
  // {
  //   name: "Danger Zone",
  //   href: "/user/settings/danger-zone",
  //   icon: TriangleAlert,
  // },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const isMenuActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isSettingsActive = settingsSubmenu.some((item) =>
    isMenuActive(item.href),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSettingsOpen(isSettingsActive);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSettingsActive]);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
        {userMenuItems.map((item) => {
          const Icon = item.icon;
          const active = isMenuActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  active ? "text-violet-700" : "text-slate-400"
                }`}
              />

              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Settings dropdown */}
        <div>
          <button
            type="button"
            onClick={() => setSettingsOpen((previous) => !previous)}
            aria-expanded={settingsOpen}
            aria-controls="user-settings-submenu"
            className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
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

          {/* Settings submenu */}
          <div
            id="user-settings-submenu"
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
                  const active = isMenuActive(item.href);

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

                      <span>{item.name}</span>
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
