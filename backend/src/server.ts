import "dotenv/config";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("PostgreSQL connected successfully");

    const server = app.listen(PORT, () => {
      console.log(`NexusFlow API running at http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      console.log("Shutting down NexusFlow API...");

      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start NexusFlow API:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();