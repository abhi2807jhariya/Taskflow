import type { Metadata } from "next";
import UsersPage from "./client";
 
export const metadata: Metadata = {
  title:'User'
};

export default function AdminUser() {
  return (
   <>
   <UsersPage/>
   </>
  );
}