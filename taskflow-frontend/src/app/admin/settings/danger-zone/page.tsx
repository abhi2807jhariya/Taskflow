import type { Metadata } from "next";
import DangerZoneClient from "./client";
 
export const metadata: Metadata = {
  title:'Danger Zone'
};

export default function DangerZone() {
  return (
   <>
   <DangerZoneClient/>
   </>
  );
}