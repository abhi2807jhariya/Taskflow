import type { Metadata } from "next";

import TaskDetailPage from "./client";

export const metadata: Metadata = {
  title: "Task Details",
};

export default function Page() {
  return <TaskDetailPage />;
}
