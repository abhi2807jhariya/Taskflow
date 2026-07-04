import { redirect } from "next/navigation";

export default function LegacyAssignTaskPage() {
  redirect("/admin/tasks/assign");
}
