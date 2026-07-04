import type { Metadata } from "next";
import EditUserPage from "./client";
 
export const metadata: Metadata = {
  title:'Edit User'
};

export default function EditUser() {
  return (
   <>
   <EditUserPage/>
   </>
  );
}