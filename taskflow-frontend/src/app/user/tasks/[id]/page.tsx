import type { Metadata } from "next";

import UserTaskDetailPage from "./client";

export const metadata: Metadata = {
  title: "My Task Details",
};

export default function Page() {
  return <UserTaskDetailPage />;
}
