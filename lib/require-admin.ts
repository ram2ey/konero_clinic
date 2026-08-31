import "server-only";

import { getSessionUser } from "@/lib/auth/session";

type RequireAdminResult =
  | { authorized: true; userId: string }
  | { authorized: false; message: string };

/**
 * Confirms the request comes from the signed-in doctor_admin.
 *
 * With RLS gone, this is no longer just a "fail fast with a clean
 * message" convenience — together with the explicit `where` clauses in
 * each query, it IS the authorization boundary. Every admin-only Server
 * Action calls this first and passes `userId` into its SQL.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const user = await getSessionUser();

  if (!user) {
    return { authorized: false, message: "You must be signed in to do that." };
  }
  if (user.role !== "doctor_admin") {
    return { authorized: false, message: "You do not have permission to do that." };
  }

  return { authorized: true, userId: user.id };
}
