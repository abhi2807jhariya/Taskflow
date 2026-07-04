import type { Metadata } from "next";
import UserDashboard from "./client";

export const metadata: Metadata = {
  title: "User Dashboard",
};

export default function UserDashboardPage() {
  return (
    <>
      <UserDashboard />
    </>
  );
}
