import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * IMPORTANT:
 * When Prisma prints "Prisma config detected, skipping environment variable loading.",
 * YOU must load the env yourself — done via `import "dotenv/config"` above.
 */
export default defineConfig({
  // Adjust if your schema is elsewhere
  schema: "prisma/schema.prisma",
});
