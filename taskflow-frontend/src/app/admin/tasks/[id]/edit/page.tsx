import type { Metadata } from "next";

import EditTaskPage from "./client";

export const metadata: Metadata = {
  title: "Edit Task",
};

export default function Page() {
  return <EditTaskPage />;
}
