import type { Metadata } from "next";
import EditProjectPage from "./client";

export const metadata: Metadata = {
  title: "Edit Project",
};

export default function ProjectEditPage() {
  return (
    <>
      <EditProjectPage />
    </>
  );
}
