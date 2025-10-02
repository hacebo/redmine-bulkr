"use server";

import { logout } from "@/lib/services/auth";

export async function logoutAction() {
    await logout();
}
