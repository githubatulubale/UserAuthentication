import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { verifySessionToken } from "@/lib/auth";

async function DashboardContent() {
  // Wait for an actual user request instead of prerendering
  await connection();

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/login");
  }

  const userId = await verifySessionToken(token);

  if (!userId) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Welcome to Dashboard!</h1>
      <p>You are successfully logged in.</p>
      <p>User ID: {userId}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <DashboardContent />
    </Suspense>
  );
}