import type { Metadata } from "next";
import TasksPage from "./client";

export const metadata: Metadata = {
  title: "Tasks",
};

export default function AdminTasksPage() {
  return (
    <>
      <TasksPage />
    </>
  );
}
