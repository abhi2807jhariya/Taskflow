"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import axios from "axios";

import Header from "@/src/components/layout/Header";
import UserSidebar from "@/src/components/layout/UserSidebar";
import Footer from "@/src/components/layout/Footer";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

interface StoredUser {
  fullName?: string;
  name?: string;
  profileImage?: string | null;
  role?: string;
}

interface ProfileResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
    profileImage?: string | null;
    role: string;
    status: string;
  };
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [userName, setUserName] =
    useState("User");

  const [profileImage, setProfileImage] =
    useState<string | null>(null);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  useEffect(() => {
    const clearLoginData = () => {
      localStorage.removeItem(
        "taskflow_token",
      );
      localStorage.removeItem(
        "taskflow_user",
      );
      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");

      sessionStorage.removeItem(
        "taskflow_token",
      );
      sessionStorage.removeItem(
        "taskflow_user",
      );
      sessionStorage.removeItem(
        "accessToken",
      );
      sessionStorage.removeItem("token");
    };

    const verifyUser = async () => {
      const token =
        localStorage.getItem(
          "taskflow_token",
        ) ||
        sessionStorage.getItem(
          "taskflow_token",
        ) ||
        localStorage.getItem(
          "accessToken",
        ) ||
        sessionStorage.getItem(
          "accessToken",
        ) ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

      if (!token) {
        clearLoginData();
        router.replace("/login");
        return;
      }

      try {
        const setupResponse =
          await axios.get(
            `${API_URL}/auth/setup-status`,
          );

        if (
          !setupResponse.data.isSetupDone
        ) {
          clearLoginData();
          router.replace("/login");
          return;
        }

        const profileResponse =
          await axios.get<ProfileResponse>(
            `${API_URL}/auth/profile`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

        const currentUser =
          profileResponse.data.user;

        if (
          currentUser.status !== "active"
        ) {
          clearLoginData();
          router.replace("/login");
          return;
        }

        if (
          currentUser.role.toLowerCase() !==
          "user"
        ) {
          clearLoginData();
          router.replace("/login");
          return;
        }

        setUserName(
          currentUser.fullName || "User",
        );

        setProfileImage(
          currentUser.profileImage || null,
        );

        const updatedUser: StoredUser = {
          fullName:
            currentUser.fullName,
          profileImage:
            currentUser.profileImage ||
            null,
          role: currentUser.role,
        };

        const savedInLocalStorage =
          localStorage.getItem(
            "taskflow_token",
          ) ||
          localStorage.getItem(
            "accessToken",
          ) ||
          localStorage.getItem(
            "token",
          );

        if (savedInLocalStorage) {
          localStorage.setItem(
            "taskflow_user",
            JSON.stringify(updatedUser),
          );
        } else {
          sessionStorage.setItem(
            "taskflow_user",
            JSON.stringify(updatedUser),
          );
        }

        setCheckingAuth(false);
      } catch (error) {
        console.error(
          "User authentication failed:",
          error,
        );

        clearLoginData();
        router.replace("/login");
      }
    };

    verifyUser();
  }, [router]);

  useEffect(() => {
  const handleProfileUpdated = (
    event: Event,
  ) => {
    const profileEvent =
      event as CustomEvent<{
        fullName?: string;
        profileImage?: string | null;
      }>;

    const updatedUser =
      profileEvent.detail;

    setUserName(
      updatedUser.fullName || "User",
    );

    setProfileImage(
      updatedUser.profileImage || null,
    );
  };

  window.addEventListener(
    "taskflow-profile-updated",
    handleProfileUpdated,
  );

  return () => {
    window.removeEventListener(
      "taskflow-profile-updated",
      handleProfileUpdated,
    );
  };
}, []);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />

          <p className="mt-4 text-sm font-medium text-slate-500">
            Verifying your account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="relative z-50 shrink-0">
        <Header
          userName={userName}
          profileImage={profileImage}
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64
            bg-slate-950 pt-16
            transition-transform duration-300
            md:relative md:translate-x-0 md:pt-0
            ${
              sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full"
            }
          `}
        >
          <UserSidebar />
        </aside>

        {/* Page content */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
            {children}
          </main>

          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}