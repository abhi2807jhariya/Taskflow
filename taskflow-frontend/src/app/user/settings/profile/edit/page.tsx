import type { Metadata } from "next";
import EditUserProfilePage from "./client";
 
export const metadata: Metadata = {
  title: {
    default: "User Profile edit",
    template: "%s | TaskFlow",
  },
};

export default function UserProfile() {
  return (
   <>
   <EditUserProfilePage/>
   </>
  );
}