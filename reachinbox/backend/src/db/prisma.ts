import { PrismaClient } from "@prisma/client";

// Single shared instance across app + worker processes (each process gets its own,
// but within a process we avoid opening multiple pools on hot-reload).
export const prisma = new PrismaClient();
