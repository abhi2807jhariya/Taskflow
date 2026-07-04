import type { Metadata } from "next";

import ProjectMembersPage from "./client";

export const metadata: Metadata = {
  title: "Project Assigned Members",
};

export default function Page() {
  return <ProjectMembersPage />;
}
