import type { Metadata } from "next";
import UserProfileClient from "./client";
 
export const metadata: Metadata = {
  title: {
    default: "User Profile",
    template: "%s | TaskFlow",
  },
};

export default function UserProfile() {
  return (
   <>
   <UserProfileClient/>
   </>
  );
}