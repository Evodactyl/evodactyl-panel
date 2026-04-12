import net from 'node:net';
import { config } from '../../config/index.js';
import { prisma } from '../../prisma/client.js';

/**
 * Pre-flight connectivity check. Verifies:
 *   1. MySQL is reachable and the `panel` database is accessible
 *   2. Prisma migrations have been applied (or at least the baseline exists)
 *   3. Redis is reachable if SESSION_DRIVER=redis (TCP probe — no client dep)
 *   4. SMTP host resolves if MAIL_HOST is set to something non-example
 *
 * Exits 0 if every check passes, 1 if any check fails. Safe to run repeatedly.
 *
 * Usage: bun run cli db:check
 */
export async function dbCheckCommand(_args: string[]): Promise<number> {
    let anyFailed = false;

    const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
        process.stdout.write(`  ${label.padEnd(40)} `);
        try {
            await fn();
            process.stdout.write('✅\n');
        } catch (err) {
            anyFailed = true;
            process.stdout.write(`❌\n      ${err instanceof Error ? err.message : String(err)}\n`);
        }
    };

    console.log('Running pre-flight checks...\n');

    await check('MySQL connectivity', async () => {
        await prisma.$queryRaw`SELECT 1`;
    });

    await check('Prisma migration history', async () => {
        const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
            SELECT migration_name FROM _prisma_migrations ORDER BY started_at LIMIT 1
        `;
        if (rows.length === 0) {
            throw new Error(
                'No migrations applied. Run `bun run --filter=@evodactyl/db migrate` (or resolve-baseline if upgrading).',
            );
        }
    });

    if (config.session.driver === 'redis') {
        await check('Redis reachable (TCP)', async () => {
            await probeTcp(config.redis.host, config.redis.port, 2000);
        });
    }

    if (config.mail.host && config.mail.host !== 'smtp.example.com') {
        await check('SMTP host resolves', async () => {
            const { lookup } = await import('node:dns/promises');
            await lookup(config.mail.host);
        });
    }

    console.log('');
    if (anyFailed) {
        console.log('One or more checks failed. Fix the issues above before starting the Panel.');
        return 1;
    }
    console.log('All checks passed.');
    return 0;
}

function probeTcp(host: string, port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
            socket.destroy();
            reject(new Error(`Timed out connecting to ${host}:${port} after ${timeoutMs}ms`));
        }, timeoutMs);
        socket.once('connect', () => {
            clearTimeout(timer);
            socket.end();
            resolve();
        });
        socket.once('error', (err) => {
            clearTimeout(timer);
            reject(new Error(`Cannot reach ${host}:${port}: ${err.message}`));
        });
        socket.connect(port, host);
    });
}
