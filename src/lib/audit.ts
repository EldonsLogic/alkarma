import { prisma } from "@/lib/prisma";

export async function audit(
  userEmail: string | null | undefined,
  action: string,
  entityType: string,
  entityId: string,
  after?: object,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userEmail: userEmail ?? null,
        action,
        entityType,
        entityId,
        after: after ? JSON.stringify(after) : null,
      },
    });
  } catch {
    // non-fatal — never block the main operation
  }
}
