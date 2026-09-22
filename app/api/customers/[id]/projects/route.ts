import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "Имя проекта обязательно"),
  description: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const { id } = await params;
  const role = session!.user.role;
  const userId = session!.user.id;

  try {
    // USER видит только проекты, где у него есть хотя бы одна задача
    if (role === "USER") {
      const projects = await prisma.project.findMany({
        where: {
          customerId: id,
          tenantId,
          tasks: { some: { assigneeId: userId } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(projects);
    }

    // ADMIN и SUPER_ADMIN видят все проекты заказчика
    const projects = await prisma.project.findMany({
      where: { customerId: id, tenantId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  // Создавать проекты может только ADMIN
  if (session!.user.role !== "ADMIN" && session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = projectSchema.parse(body);

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) {
      return NextResponse.json(
        { error: "Заказчик не найден" },
        { status: 404 }
      );
    }

    const project = await prisma.project.create({
      data: { ...data, customerId: id, tenantId },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}