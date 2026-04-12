import crypto from 'node:crypto';
import type { Prisma } from '@evodactyl/db';
import mysql from 'mysql2/promise';
import { config } from '../../config/index.js';
import { DisplayException } from '../../errors/index.js';
import { decrypt, encrypt } from '../../lib/encryption.js';
import { prisma } from '../../prisma/client.js';

/**
 * Regex to validate database names are in the expected s{serverId}_{name} format.
 */
const MATCH_NAME_REGEX = /^(s[\d]+_)(.*)$/;

/**
 * Generate a random string with special characters, similar to Laravel's
 * Utilities::randomStringWithSpecialCharacters.
 */
function randomStringWithSpecialCharacters(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}

/**
 * Generate a random alphanumeric string.
 */
function randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}

/**
 * Generate a unique database name for a server.
 */
export function generateUniqueDatabaseName(name: string, serverId: number): string {
    const prefix = `s${serverId}_`;
    const maxNameLength = 48 - prefix.length;
    return prefix + name.substring(0, maxNameLength);
}

/**
 * Create a dynamic MySQL connection to a database host.
 */
async function createHostConnection(hostId: number): Promise<mysql.Connection> {
    const host = await prisma.database_hosts.findUniqueOrThrow({
        where: { id: hostId },
    });

    return mysql.createConnection({
        host: host.host,
        port: host.port,
        user: host.username,
        password: decrypt(host.password),
    });
}

/**
 * Execute raw SQL operations on a database host to create a database, user, and grant permissions.
 */
async function executeHostOperations(
    connection: mysql.Connection,
    operations: {
        type: 'createDatabase' | 'createUser' | 'assignUser' | 'dropDatabase' | 'dropUser' | 'flush';
        database?: string;
        username?: string;
        remote?: string;
        password?: string;
        maxConnections?: number | null;
    }[],
): Promise<void> {
    for (const op of operations) {
        switch (op.type) {
            case 'createDatabase':
                await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${op.database}\``);
                break;
            case 'createUser': {
                let sql = `CREATE USER \`${op.username}\`@\`${op.remote}\` IDENTIFIED BY ?`;
                const params: (string | number)[] = [op.password!];
                if (op.maxConnections && op.maxConnections > 0) {
                    sql += ` WITH MAX_USER_CONNECTIONS ${op.maxConnections}`;
                }
                await connection.execute(sql, params);
                break;
            }
            case 'assignUser':
                await connection.execute(
                    `GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, REFERENCES, INDEX, LOCK TABLES, CREATE ROUTINE, ALTER ROUTINE, EXECUTE, CREATE TEMPORARY TABLES, CREATE VIEW, SHOW VIEW, EVENT, TRIGGER ON \`${op.database}\`.* TO \`${op.username}\`@\`${op.remote}\``,
                );
                break;
            case 'dropDatabase':
                await connection.execute(`DROP DATABASE IF EXISTS \`${op.database}\``);
                break;
            case 'dropUser':
                await connection.execute(`DROP USER IF EXISTS \`${op.username}\`@\`${op.remote}\``);
                break;
            case 'flush':
                await connection.execute('FLUSH PRIVILEGES');
                break;
        }
    }
}

type DatabaseInput = {
    database: string;
    database_host_id: number;
    remote?: string;
    max_connections?: number | null;
};

/**
 * Create the panel-side `databases` row for a new server database. Does not
 * touch the remote MySQL host. Accepts a transaction client so that the row
 * can be created atomically with a parent-row lock + count when enforcing
 * per-server limits.
 *
 * Returns both the created record and the *plain-text* password so the host
 * provisioning step (run after the transaction commits) can create the MySQL
 * user.
 */
export async function createDatabaseRecord(
    client: Prisma.TransactionClient,
    server: { id: number },
    data: DatabaseInput,
): Promise<{ dbRecord: any; plainPassword: string }> {
    if (!config.evodactyl.clientFeatures.databases.enabled) {
        throw new DisplayException('The database feature is not enabled.', 400);
    }

    if (!data.database || !MATCH_NAME_REGEX.test(data.database)) {
        throw new Error('The database name must be prefixed with "s{server_id}_".');
    }

    const exists = await client.databases.findFirst({
        where: {
            server_id: server.id,
            database: data.database,
        },
    });

    if (exists) {
        throw new DisplayException('A database with that name already exists for this server.', 409);
    }

    const username = `u${server.id}_${randomString(10)}`;
    const plainPassword = randomStringWithSpecialCharacters(24);
    const encryptedPassword = encrypt(plainPassword);

    const dbRecord = await client.databases.create({
        data: {
            server_id: server.id,
            database_host_id: data.database_host_id,
            database: data.database,
            username,
            password: encryptedPassword,
            remote: data.remote ?? '%',
            max_connections: data.max_connections ?? 0,
        },
    });

    return { dbRecord, plainPassword };
}

/**
 * Provision the actual MySQL database, user, and grants on the remote host.
 * On failure attempts to roll back both the host state and the panel record.
 *
 * Run this *after* the panel-record transaction commits so that we never hold
 * a panel DB transaction open across slow remote DDL.
 */
export async function provisionDatabaseOnHost(
    dbRecord: {
        id: number;
        database_host_id: number;
        database: string;
        username: string;
        remote: string;
        max_connections: number | null;
    },
    plainPassword: string,
): Promise<void> {
    let connection: mysql.Connection | null = null;
    try {
        connection = await createHostConnection(dbRecord.database_host_id);

        await executeHostOperations(connection, [
            { type: 'createDatabase', database: dbRecord.database },
            {
                type: 'createUser',
                username: dbRecord.username,
                remote: dbRecord.remote,
                password: plainPassword,
                maxConnections: dbRecord.max_connections,
            },
            {
                type: 'assignUser',
                database: dbRecord.database,
                username: dbRecord.username,
                remote: dbRecord.remote,
            },
            { type: 'flush' },
        ]);
    } catch (error) {
        try {
            if (connection) {
                await executeHostOperations(connection, [
                    { type: 'dropDatabase', database: dbRecord.database },
                    { type: 'dropUser', username: dbRecord.username, remote: dbRecord.remote },
                    { type: 'flush' },
                ]);
            }
        } catch {
            // Ignore cleanup errors
        }

        await prisma.databases.delete({ where: { id: dbRecord.id } }).catch(() => {});

        throw error;
    } finally {
        if (connection) {
            await connection.end().catch(() => {});
        }
    }
}

/**
 * Create a new database linked to a specific host without a per-server limit
 * check. Used by the application API where admins create databases directly.
 * For the client API, use `deployServerDatabase`, which enforces the limit
 * inside a transaction.
 *
 * Mirrors app/Services/Databases/DatabaseManagementService.php::create()
 */
export async function createDatabase(
    server: { id: number },
    data: DatabaseInput,
): Promise<any> {
    const { dbRecord, plainPassword } = await createDatabaseRecord(prisma, server, data);
    await provisionDatabaseOnHost(dbRecord, plainPassword);
    return dbRecord;
}

/**
 * Delete a database from the host server and the panel.
 * Mirrors app/Services/Databases/DatabaseManagementService.php::delete()
 */
export async function deleteDatabase(database: {
    id: number;
    database_host_id: number;
    database: string;
    username: string;
    remote: string;
}): Promise<void> {
    let connection: mysql.Connection | null = null;
    try {
        connection = await createHostConnection(database.database_host_id);

        await executeHostOperations(connection, [
            { type: 'dropDatabase', database: database.database },
            { type: 'dropUser', username: database.username, remote: database.remote },
            { type: 'flush' },
        ]);
    } finally {
        if (connection) {
            await connection.end().catch(() => {});
        }
    }

    await prisma.databases.delete({
        where: { id: database.id },
    });
}
