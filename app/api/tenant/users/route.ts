import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email("Некорректный email"),
  name: z.string().optional(),
  password: z.string().min(6, "Минимум 6 символов"),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export async function GET() {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  if (session!.user.role !== "ADMIN" && session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  if (session!.user.role !== "ADMIN" && session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createUserSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}