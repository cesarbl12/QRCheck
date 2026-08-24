import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function upsertUser(username: string, password: string, role: Role) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, role },
    create: { username, passwordHash, role },
  });
  console.log(`Seeded user "${username}" (${role})`);
}

async function main() {
  await upsertUser(
    process.env.ADMIN_USERNAME ?? 'admin',
    process.env.ADMIN_PASSWORD ?? 'admin123',
    Role.ADMIN,
  );
  await upsertUser(
    process.env.SCANNER_USERNAME ?? 'scanner-tablet-1',
    process.env.SCANNER_PASSWORD ?? 'scanner123',
    Role.SCANNER,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
