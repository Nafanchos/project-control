import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  slug: z
    .string()
    .min(1, "Слаг обязателен")
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис"),
  adminEmail: z.string().email("Некорректный email"),
  adminPassword: z.string().min(6, "Минимум 6 символов"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, customers: true } } },
  });
  return NextResponse.json(tenants);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createTenantSchema.parse(body);

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: data.slug },
    });
    if (existingTenant) {
      return NextResponse.json(
        { error: "Компания с таким slug уже существует" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.adminEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.adminPassword, 10);

    const tenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        users: {
          create: {
            email: data.adminEmail,
            passwordHash,
            role: "ADMIN",
          },
        },
      },
      include: { users: true },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}