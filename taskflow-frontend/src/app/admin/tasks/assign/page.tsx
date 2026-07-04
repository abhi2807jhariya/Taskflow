import type { Metadata } from "next";
import AssignTaskPageClient from "./client";

export const metadata: Metadata = {
  title: "Assign Task",
};

export default function AssignTaskPage() {
  return (
    <>
      <AssignTaskPageClient />
    </>
  );
}
