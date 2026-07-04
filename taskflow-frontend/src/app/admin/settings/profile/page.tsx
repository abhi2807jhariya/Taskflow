import type { Metadata } from "next";
import AdminProfileClient from "./client";
 
export const metadata: Metadata = {
  title:'Admin Profile'
};

export default function AdminProfile() {
  return (
   <>
   <AdminProfileClient/>
   </>
  );
}