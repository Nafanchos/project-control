import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }) };
  }
  return { session };
}

export async function requireTenant() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Не авторизован" }, { status: 401 }) };
  }
  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return {
      error: NextResponse.json(
        { error: "Пользователь не привязан к компании" },
        { status: 403 }
      ),
    };
  }
  return { session, tenantId };
}