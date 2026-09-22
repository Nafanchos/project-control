import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";

export async function GET() {
  const { error, tenantId } = await requireTenant();
  if (error) return error;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Компания не найдена" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}