"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { LoaderCircle } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

function clearAuthStorage() {
  localStorage.removeItem("taskflow_token");
  localStorage.removeItem("taskflow_user");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");

  sessionStorage.removeItem("taskflow_token");
  sessionStorage.removeItem("taskflow_user");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("token");
}

function getToken() {
  return (
    localStorage.getItem("taskflow_token") ||
    sessionStorage.getItem("taskflow_token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        /*
         * Pehle check hoga ki TaskFlow setup hai
         * ya database reset/delete ho chuka hai.
         */
        const setupResponse = await axios.get(
          `${API_URL}/auth/setup-status`,
        );

        if (!setupResponse.data.isSetupDone) {
          clearAuthStorage();
          router.replace("/setup");
          return;
        }

        /*
         * Setup complete hai to admin token check hoga.
         */
        const token = getToken();

        if (!token) {
          clearAuthStorage();
          router.replace("/login");
          return;
        }

        /*
         * Backend se current account verify hoga.
         */
        const profileResponse = await axios.get(
          `${API_URL}/auth/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const user = profileResponse.data?.user;

        if (!user) {
          clearAuthStorage();
          router.replace("/login");
          return;
        }

        if (
          user.role?.toLowerCase() !== "admin"
        ) {
          clearAuthStorage();
          router.replace("/login");
          return;
        }

        if (
          user.status?.toLowerCase() !== "active"
        ) {
          clearAuthStorage();
          router.replace("/login");
          return;
        }

        /*
         * Backend ka latest admin data storage me
         * update hoga.
         */
        const storedInLocal =
          localStorage.getItem(
            "taskflow_token",
          ) ||
          localStorage.getItem(
            "accessToken",
          ) ||
          localStorage.getItem("token");

        if (storedInLocal) {
          localStorage.setItem(
            "taskflow_user",
            JSON.stringify(user),
          );
        } else {
          sessionStorage.setItem(
            "taskflow_user",
            JSON.stringify(user),
          );
        }

        setCheckingAuth(false);
      } catch (error) {
        console.error(
          "Admin verification failed:",
          error,
        );

        clearAuthStorage();
        router.replace("/login");
      }
    };

    void verifyAdmin();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <LoaderCircle className="h-10 w-10 animate-spin text-blue-600" />

        <p className="mt-4 text-sm font-semibold text-slate-500">
          Verifying administrator account...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}