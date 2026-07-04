import type { Metadata } from "next";
import ChangePasswordClient from "./client";
 
export const metadata: Metadata = {
  title:'Change Password'
};

export default function ChangePasswordPage() {
  return (
   <>
   <ChangePasswordClient/>
   </>
  );
}