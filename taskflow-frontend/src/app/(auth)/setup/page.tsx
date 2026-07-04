import type { Metadata } from "next";
import SetupForm from "./client";

export const metadata: Metadata = {
  title: "Setup",
};

export default function SetupPage() {
  return (
    <>
      <SetupForm />
    </>
  );
}
