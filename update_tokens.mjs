import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.m_User.findMany({ where: { UserToken: null } });
  for (const u of users) {
    await prisma.m_User.update({
      where: { UserId: u.UserId },
      data: { UserToken: crypto.randomUUID() }
    });
  }
  console.log(`Updated ${users.length} users.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
