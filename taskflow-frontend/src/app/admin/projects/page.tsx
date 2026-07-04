import type { Metadata } from "next";
import ProjectsPage from "./client";
 
export const metadata: Metadata = {
  title:'Project Dashboard'
};

export default function ProjectDashboard() {
  return (
   <>
   <ProjectsPage/>
   </>
  );
}