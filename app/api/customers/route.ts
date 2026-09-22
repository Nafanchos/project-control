import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Имя обязательно"),
  inn: z.string().optional(),
  contact: z.string().optional(),
});

export async function GET() {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const role = session!.user.role;
  const userId = session!.user.id;

  try {
    // USER видит только заказчиков, где у него есть хотя бы одна задача
    if (role === "USER") {
      const customers = await prisma.customer.findMany({
        where: {
          tenantId,
          projects: {
            some: {
              tasks: { some: { assigneeId: userId } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(customers);
    }

    // ADMIN и SUPER_ADMIN видят всех заказчиков компании
    const customers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(customers);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  // Создавать заказчиков может только ADMIN
  if (session!.user.role !== "ADMIN" && session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = customerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: { ...data, tenantId },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}