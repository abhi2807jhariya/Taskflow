import type { Metadata } from "next";
import ViewProjectPage from "./client";

export const metadata: Metadata = {
  title: "View Project",
};

export default function ProjectDetailsPage() {
  return (
    <>
      <ViewProjectPage />
    </>
  );
}
