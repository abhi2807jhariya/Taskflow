import type { Metadata } from "next";
import CreateProjectPage from "./client";
 
export const metadata: Metadata = {
  title:'Create Project'
};

export default function ProjectDashboard() {
  return (
   <>
   <CreateProjectPage/>
   </>
  );
}