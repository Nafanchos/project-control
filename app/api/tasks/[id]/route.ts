import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

const taskTypes = ["DOCS", "PNR", "SMR", "OTHER"] as const;
const taskStatuses = ["PLANNED", "IN_PROGRESS", "DONE", "BLOCKED"] as const;

// Схема для ADMIN — может менять всё
const adminUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(taskTypes).optional(),
  assigneeId: z.string().nullable().optional(),
  planStart: z.string().optional().nullable(),
  planEnd: z.string().optional().nullable(),
  factStart: z.string().optional().nullable(),
  factEnd: z.string().optional().nullable(),
  status: z.enum(taskStatuses).optional(),
});

// Схема для USER — только статус и факт-даты
const userUpdateSchema = z.object({
  factStart: z.string().optional().nullable(),
  factEnd: z.string().optional().nullable(),
  status: z.enum(taskStatuses).optional(),
});

function cleanDate(v: string | null | undefined) {
  if (!v || v === "") return null;
  return new Date(v);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const { id } = await params;
  const role = session!.user.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  try {
    // Находим задачу с учётом прав
    const where: Record<string, unknown> = { id, tenantId };
    if (!isAdmin) {
      where.assigneeId = session!.user.id;
    }

    const existing = await prisma.task.findFirst({ where });
    if (!existing) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    const body = await req.json();

    let updateData: Record<string, unknown> = {};

    if (isAdmin) {
      const data = adminUpdateSchema.parse(body);

      if (data.title !== undefined) updateData.title = data.title;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.planStart !== undefined) updateData.planStart = cleanDate(data.planStart);
      if (data.planEnd !== undefined) updateData.planEnd = cleanDate(data.planEnd);
      if (data.factStart !== undefined) updateData.factStart = cleanDate(data.factStart);
      if (data.factEnd !== undefined) updateData.factEnd = cleanDate(data.factEnd);

      if (data.assigneeId !== undefined) {
        if (data.assigneeId === null) {
          updateData.assigneeId = null;
        } else {
          // Проверяем, что ответственный из нашей компании
          const assignee = await prisma.user.findFirst({
            where: { id: data.assigneeId, tenantId },
          });
          if (!assignee) {
            return NextResponse.json(
              { error: "Сотрудник не найден" },
              { status: 400 }
            );
          }
          updateData.assigneeId = data.assigneeId;
        }
      }
    } else {
      // USER — только статус и факт-даты
      const data = userUpdateSchema.parse(body);

      if (data.status !== undefined) updateData.status = data.status;
      if (data.factStart !== undefined) updateData.factStart = cleanDate(data.factStart);
      if (data.factEnd !== undefined) updateData.factEnd = cleanDate(data.factEnd);
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const role = session!.user.role;
  // Удалять задачи могут только ADMIN и SUPER_ADMIN
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const existing = await prisma.task.findFirst({ where: { id, tenantId } });
    if (!existing) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}