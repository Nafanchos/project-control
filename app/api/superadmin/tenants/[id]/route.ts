import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { s3, BUCKET } from "@/lib/s3";
import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    // Удаляем все файлы компании из B2
    try {
      let continuationToken: string | undefined = undefined;
      do {
        const list: ListObjectsV2CommandOutput = await s3.send(
          new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: `${id}/`,
            ContinuationToken: continuationToken,
          })
        );

        const keys = (list.Contents ?? [])
          .map((obj) => ({ Key: obj.Key ?? "" }))
          .filter((o) => o.Key !== "");

        if (keys.length > 0) {
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: BUCKET,
              Delete: { Objects: keys },
            })
          );
        }

        continuationToken = list.NextContinuationToken;
      } while (continuationToken);
    } catch (err) {
      console.warn("Не удалось удалить файлы из B2:", err);
    }

    // Удаляем саму компанию — каскадно всё связанное
    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}