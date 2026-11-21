import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Администратор";

  if (!email || !password) {
    throw new Error("Укажите ADMIN_EMAIL и ADMIN_PASSWORD в .env");
  }
  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD должен быть не короче 10 символов");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Регистрация закрыта: единственный пользователь создаётся только здесь.
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  console.log(`Пользователь готов: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
