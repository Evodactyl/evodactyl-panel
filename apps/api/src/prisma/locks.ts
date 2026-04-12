import type { Prisma } from '@evodactyl/db';

type LockableTable = 'users' | 'servers' | 'schedules';

/**
 * Take a `SELECT ... FOR UPDATE` row lock on a parent record inside an open
 * transaction. Used to serialize concurrent writers that need to enforce a
 * "max N children per parent" limit without races.
 *
 * The table name is interpolated from a closed allow-list, so it cannot carry
 * untrusted input; the id is bound as a parameter.
 */
export async function lockRowForUpdate(
    tx: Prisma.TransactionClient,
    table: LockableTable,
    id: number,
): Promise<void> {
    await tx.$queryRawUnsafe(`SELECT id FROM ${table} WHERE id = ? FOR UPDATE`, id);
}
