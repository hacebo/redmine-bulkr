import { requireUserForPage } from "@/lib/auth.server";

export default async function AppHome() {
  const user = await requireUserForPage(); // throws -> redirect by caller
  return <div>Welcome, {user.email}</div>;
}
