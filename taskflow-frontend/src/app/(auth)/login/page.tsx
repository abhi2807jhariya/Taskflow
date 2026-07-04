import type { Metadata } from "next";
import LoginPageClient from "./client";
 
export const metadata: Metadata = {
  title: {
    default: "TaskFlow Login",
    template: "%s | TaskFlow",
  },
};

export default function LoginPage() {
  return (
   <>
   <LoginPageClient/>
   </>
  );
}