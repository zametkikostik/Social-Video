import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@social.video';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const username = process.env.SEED_ADMIN_USERNAME || 'admin';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', isVerified: true, passwordHash },
    create: {
      email,
      username,
      displayName: 'Admin',
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
    },
  });
  console.log('✓ Admin:', admin.email);

  await prisma.channel.upsert({
    where: { slug: 'official' },
    update: {},
    create: {
      name: 'Official',
      slug: 'official',
      description: 'Official Social-Video channel',
      ownerId: admin.id,
      isVerified: true,
      isPublic: true,
    },
  });
  console.log('✓ Channel: official');

  const modHash = await bcrypt.hash('Mod123!', 12);
  await prisma.user.upsert({
    where: { email: 'mod@social.video' },
    update: { role: 'MODERATOR', isVerified: true },
    create: {
      email: 'mod@social.video',
      username: 'moderator',
      displayName: 'Moderator',
      passwordHash: modHash,
      role: 'MODERATOR',
      isVerified: true,
    },
  });
  console.log('✓ Moderator: mod@social.video');
  console.log(`\nAdmin login: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
