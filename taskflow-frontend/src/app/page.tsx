import type { Metadata } from "next";
import { redirect } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const metadata: Metadata = {
  title: "TaskFlow",
};

export default async function Home() {
  try {
    const response = await fetch(
      `${API_URL}/auth/setup-status`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Setup status check failed");
    }

    const data = await response.json();

    if (data.isSetupDone) {
      redirect("/login");
    }

    redirect("/setup");
  } catch (error) {
    console.error("Setup status error:", error);
    redirect("/login");
  }
}
