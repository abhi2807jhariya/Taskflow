import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Assign Task",
};

export default function AssignTaskPage() {
  redirect("/admin/tasks/assign");
}
