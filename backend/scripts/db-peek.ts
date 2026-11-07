import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const tables = await prisma.$queryRaw<{ table_name: string }[]>`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`;

console.log("tables:", tables.map((row) => row.table_name).join(", ") || "(none)");

console.log("users:", await prisma.user.count());
console.log("workspaces:", await prisma.workspace.count());
console.log("projects:", await prisma.project.count());
console.log("tasks:", await prisma.task.count());
console.log("activities:", await prisma.activity.count());
console.log("conversations:", await prisma.aIConversation.count());

await prisma.$disconnect();
