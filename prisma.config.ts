import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // @ts-expect-error — Prisma 7 migrate.adapter not in types yet
  migrate: {
    adapter: () => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is not set");
      return new PrismaPg({ connectionString: url });
    },
  },
});
