import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/session";
import { NextResponse } from "next/server";
import { z } from "zod";

const taskTypes = ["DOCS", "PNR", "SMR", "OTHER"] as const;
const taskStatuses = ["PLANNED", "IN_PROGRESS", "DONE", "BLOCKED"] as const;

const taskSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  type: z.enum(taskTypes),
  assigneeId: z.string().nullable().optional(),
  planStart: z.string().optional().nullable(),
  planEnd: z.string().optional().nullable(),
  factStart: z.string().optional().nullable(),
  factEnd: z.string().optional().nullable(),
  status: z.enum(taskStatuses).optional(),
});

function cleanDate(v: string | null | undefined) {
  if (!v || v === "") return null;
  return new Date(v);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, tenantId, session } = await requireTenant();
  if (error) return error;

  const { id } = await params;

  const where: Record<string, unknown> = { projectId: id, tenantId };
  // USER видит только свои задачи
  if (session!.user.role === "USER") {
    where.assigneeId = session!.user.id;
  }

  try {
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        documents: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(tasks);
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

  // Только ADMIN и SUPER_ADMIN могут создавать задачи
  if (session!.user.role !== "ADMIN" && session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const data = taskSchema.parse(body);

    const project = await prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    // Если указан ответственный — проверяем, что он из нашей компании
    if (data.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assigneeId, tenantId },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: "Сотрудник не найден" },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId: id,
        tenantId,
        title: data.title,
        type: data.type,
        assigneeId: data.assigneeId ?? null,
        status: data.status ?? "PLANNED",
        planStart: cleanDate(data.planStart),
        planEnd: cleanDate(data.planEnd),
        factStart: cleanDate(data.factStart),
        factEnd: cleanDate(data.factEnd),
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}