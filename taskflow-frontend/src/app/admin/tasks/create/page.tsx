import type { Metadata } from "next";
import CreateTaskPage from "./client";
 
export const metadata: Metadata = {
  title:'Create Task'
};

export default function CreateTask() {
  return (
   <>
   <CreateTaskPage/>
   </>
  );
}