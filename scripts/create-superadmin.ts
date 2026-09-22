import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Использование: npx tsx scripts/create-superadmin.ts <email> <password>");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`Пользователь с email ${email} уже существует`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      tenantId: null,
    },
  });

  console.log("✅ Супер-админ создан:");
  console.log("   ID:", user.id);
  console.log("   Email:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());