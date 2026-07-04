"use client";

import { LogOut } from "lucide-react";

interface LogoutProps {
  onBeforeLogout?: () => void;
}

export default function Logout({
  onBeforeLogout,
}: LogoutProps) {
  const handleLogout = () => {
    // Pehle dropdown close hoga
    onBeforeLogout?.();

    // Local storage clear
    localStorage.removeItem("taskflow_token");
    localStorage.removeItem("taskflow_user");

    // Session storage clear
    sessionStorage.removeItem("taskflow_token");
    sessionStorage.removeItem("taskflow_user");

    // Hard redirect to login page
    window.location.replace("/login");
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-slate-100 cursor-pointer"
    >
      <LogOut className="w-4 h-4" />
      Logout
    </button>
  );
}