import type { Metadata } from "next";
import AdminDashboard from "./client";
 
export const metadata: Metadata = {
  title:'Admin Dashboard'
};

export default function AdminDashboardPage() {
  return (
   <>
   <AdminDashboard/>
   </>
  );
}