import type { Metadata } from "next";

import UserTaskEditPage from "./client";

export const metadata: Metadata = {
  title: "Edit My Task Status",
};

export default function Page() {
  return <UserTaskEditPage />;
}
