import type { Metadata } from "next";
import EditAdminProfileClient from "./client";
 
export const metadata: Metadata = {
  title:'Edit Admin Profile'
};

export default function EditAdminProfile() {
  return (
   <>
   <EditAdminProfileClient/>
   </>
  );
}