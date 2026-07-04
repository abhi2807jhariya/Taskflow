import type { Metadata } from "next";
import UserProjects from "./client";

export const metadata: Metadata = {
  title: "My Projects",
};

export default function UserProjectsPage() {
  return (
    <>
      <UserProjects />
    </>
  );
}
