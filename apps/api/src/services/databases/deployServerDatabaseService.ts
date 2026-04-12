import { config } from '../../config/index.js';
import { DisplayException } from '../../errors/index.js';
import { prisma } from '../../prisma/client.js';
import { lockRowForUpdate } from '../../prisma/locks.js';
import { createDatabaseRecord, generateUniqueDatabaseName, provisionDatabaseOnHost } from './databaseManagementService.js';

/**
 * Deploy a new database for a server, automatically selecting a database host.
 * Mirrors app/Services/Databases/DeployServerDatabaseService.php
 *
 * The per-server `database_limit` check + panel record insert run inside a
 * transaction that takes a `FOR UPDATE` row lock on the server, so concurrent
 * requests for the same server cannot both squeak past the limit. The slow
 * remote MySQL host operations run *after* the transaction commits.
 */
export async function deployServerDatabase(
    server: { id: number; node_id: number; database_limit?: number | null },
    data: { database: string; remote: string },
): Promise<any> {
    if (!data.database) {
        throw new DisplayException('A database name is required.', 422);
    }
    if (!data.remote) {
        throw new DisplayException('A remote connection string is required.', 422);
    }

    const hosts = await prisma.database_hosts.findMany();

    if (hosts.length === 0) {
        throw new DisplayException(
            'No database hosts are configured on the system. A database cannot be created.',
            500,
        );
    }

    // Prefer hosts attached to the same node
    const nodeHosts = hosts.filter((h) => h.node_id === server.node_id);

    if (nodeHosts.length === 0 && !config.evodactyl.clientFeatures.databases.allowRandom) {
        throw new DisplayException("No suitable database host could be found for the server's node.", 500);
    }

    const selectedHost =
        nodeHosts.length > 0
            ? nodeHosts[Math.floor(Math.random() * nodeHosts.length)]
            : hosts[Math.floor(Math.random() * hosts.length)];

    const recordData = {
        database_host_id: selectedHost.id,
        database: generateUniqueDatabaseName(data.database, server.id),
        remote: data.remote,
    };

    const { dbRecord, plainPassword } = await prisma.$transaction(async (tx) => {
        await lockRowForUpdate(tx, 'servers', server.id);

        if (server.database_limit != null) {
            const currentCount = await tx.databases.count({
                where: { server_id: server.id },
            });
            if (currentCount >= server.database_limit) {
                throw new DisplayException(
                    'Cannot create additional databases on this server: limit has been reached.',
                    400,
                );
            }
        }

        return createDatabaseRecord(tx, server, recordData);
    });

    await provisionDatabaseOnHost(dbRecord, plainPassword);
    return dbRecord;
}
