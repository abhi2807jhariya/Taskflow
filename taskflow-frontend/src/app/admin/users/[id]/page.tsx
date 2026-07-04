import type { Metadata } from "next";
import ViewUserPage from "./client";
 
export const metadata: Metadata = {
  title:'View User'
};

export default function ViewUser() {
  return (
   <>
   <ViewUserPage/>
   </>
  );
}