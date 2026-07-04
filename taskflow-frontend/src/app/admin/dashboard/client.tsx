"use client";
import Link from "next/link";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckCircle2,
  PlusCircle,
  UserPlus,
  FilePlus,
  UserCheck,
} from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const name = localStorage.getItem("userName");

      if (name) {
        setUserName(name);
      } else {
        setUserName("Abhishek");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] text-[#1e293b] font-sans overflow-hidden">
      {/* Header */}
      <div className="w-full shrink-0 z-50">
        <Header userName={userName} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Sidebar and Main Content */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 pt-16
            transform
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:relative md:translate-x-0 md:pt-0
            transition-transform duration-300 ease-in-out
            shrink-0 h-full bg-slate-900 w-64
          `}
        >
          <Sidebar />
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#f8fafc]">
          <main className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6">
            {/* Page Title */}
            <div>
              <h1 className="text-2xl md:text-2xl font-bold text-[#0f172a]">
                Admin Dashboard
              </h1>

              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Welcome back, {userName}!
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Total Users */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Users
                  </p>

                  <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                    8
                  </h3>
                </div>

                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Total Projects */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Projects
                  </p>

                  <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                    5
                  </h3>
                </div>

                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FolderKanban className="w-6 h-6" />
                </div>
              </div>

              {/* Total Tasks */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Tasks
                  </p>

                  <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                    24
                  </h3>
                </div>

                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
              </div>

              {/* Completed Tasks */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Completed Tasks
                  </p>

                  <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                    10
                  </h3>
                </div>

                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-slate-800">
                Quick Actions
              </h2>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {/* Create User */}
                <Link
                  href="/admin/users/create"
                  className="group flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <UserPlus className="h-5 w-5 text-indigo-600 transition-transform group-hover:scale-110" />

                  <span className="mt-2 text-center text-xs font-bold text-slate-800">
                    Create User
                  </span>
                </Link>

                {/* Create Project */}
                <Link
                  href="/admin/projects/create"
                  className="group flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-4 transition-all hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <FilePlus className="h-5 w-5 text-emerald-600 transition-transform group-hover:scale-110" />

                  <span className="mt-2 text-center text-xs font-bold text-slate-800">
                    Create Project
                  </span>
                </Link>

                {/* Create Task */}
                <Link
                  href="/admin/tasks/create"
                  className="group flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-4 transition-all hover:border-amber-300 hover:bg-amber-50/50"
                >
                  <PlusCircle className="h-5 w-5 text-amber-600 transition-transform group-hover:scale-110" />

                  <span className="mt-2 text-center text-xs font-bold text-slate-800">
                    Create Task
                  </span>
                </Link>

                {/* Assign Task */}
                <Link
                  href="/admin/tasks/assign"
                  className="group flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <UserCheck className="h-5 w-5 text-blue-600 transition-transform group-hover:scale-110" />

                  <span className="mt-2 text-center text-xs font-bold text-slate-800">
                    Assign Task
                  </span>
                </Link>
              </div>
            </div>
          </main>

          {/* Footer */}
          <div className="w-full shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
