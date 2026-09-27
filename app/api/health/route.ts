import { prisma } from "@/lib/prisma";
import { s3, BUCKET } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    vercel: "ok",
  };

  // Проверка Neon
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.database = {
      status: "ok",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err) {
    result.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Проверка B2
  const b2Start = Date.now();
  try {
    await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        MaxKeys: 1,
      })
    );
    result.storage = {
      status: "ok",
      latencyMs: Date.now() - b2Start,
    };
  } catch (err) {
    result.storage = {
      status: "error",
      latencyMs: Date.now() - b2Start,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return NextResponse.json(result);
}