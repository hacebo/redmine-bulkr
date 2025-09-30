import { redirect } from "next/navigation";

export default async function ProtectedHome() {
  redirect("/time-tracking");
}
