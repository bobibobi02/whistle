import { prisma } from '@/lib/db';

export async function enrollUser(experimentKey: string, userId: string) {
  // 1. Check if the user is already enrolled in this experiment
  const existing = await prisma.experimentEnrollment.findFirst({
    where: {
      userId,
      experiment: {
        key: experimentKey,
      },
    },
  });

  if (existing) return existing;

  // 2. Get experiment by key
  const experiment = await prisma.experiment.findUnique({
    where: { key: experimentKey },
  });

  if (!experiment) throw new Error(`Experiment ${experimentKey} not found`);

  // 3. Pick a variant randomly
  const variant = Math.random() < 0.5 ? 'A' : 'B';

  // 4. Save enrollment
  return prisma.experimentEnrollment.create({
    data: {
      userId,
      experimentId: experiment.id,
      variant,
    },
  });
}
