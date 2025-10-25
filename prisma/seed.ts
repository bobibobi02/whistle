import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      password: 'hashedpass',
      badge: 'Top Poster',
      flair: '🌟 OG Member',
    },
  });

  const sub = await prisma.subforum.create({
    data: { name: 'general' },
  });

  for (let i = 0; i < 5; i++) {
    const post = await prisma.post.create({
      data: {
        title: `Sample Post ${i}`,
        content: 'This is some content.',
        authorId: user.id,
        subforumId: sub.id,
      },
    });

    await prisma.comment.create({
      data: {
        content: 'Sample comment',
        postId: post.id,
        authorId: user.id,
      },
    });
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
