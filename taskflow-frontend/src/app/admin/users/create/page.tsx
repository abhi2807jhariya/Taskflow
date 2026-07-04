import type { Metadata } from "next";
import CreateUserPage from "./client";
 
export const metadata: Metadata = {
  title:'Create User'
};

export default function CreateUser() {
  return (
   <>
   <CreateUserPage/>
   </>
  );
}