import type { Metadata } from "next";
import UserTasks from "./client";

export const metadata: Metadata = {
  title: "My Tasks",
};

export default function UserTasksPage() {
  return (
    <>
      <UserTasks />
    </>
  );
}
