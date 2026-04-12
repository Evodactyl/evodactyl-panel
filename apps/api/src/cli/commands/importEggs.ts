import { promises as fs } from 'node:fs';
import path from 'node:path';
import { prisma } from '../../prisma/client.js';
import { importEgg, parseEggJson } from '../../services/eggs/sharing/eggImporterService.js';

/**
 * Batch import egg JSON files from a directory (non-recursive by default; pass
 * --recursive to walk subdirectories). Each file is parsed, its nest resolved
 * by the embedded `meta.nest_id` or `--nest` fallback, and imported via the
 * same service the admin UI uses.
 *
 * Usage:
 *   bun run cli import:eggs <directory> [--nest=<id>] [--recursive]
 *
 * If --nest is omitted, the command reads the top-level meta.nest_id from
 * each egg JSON. If that is also missing, it falls back to the first nest
 * whose name matches the egg's declared author/category convention, and
 * failing that, the first nest in the database.
 */
export async function importEggsCommand(args: string[]): Promise<number> {
    const dir = args.find((a) => !a.startsWith('--'));
    if (!dir) {
        console.error('Usage: bun run cli import:eggs <directory> [--nest=<id>] [--recursive]');
        return 1;
    }

    const recursive = args.includes('--recursive');
    const nestOverride = parseNestOverride(args);

    const absDir = path.resolve(dir);
    const files = await collectJsonFiles(absDir, recursive);

    if (files.length === 0) {
        console.error(`No .json files found in ${absDir}${recursive ? ' (recursive)' : ''}.`);
        return 1;
    }

    console.log(`Importing ${files.length} egg file(s) from ${absDir}...`);

    const fallbackNestId = nestOverride ?? (await firstNestId());

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const content = await fs.readFile(file, 'utf8');
            const parsed = parseEggJson(content);
            const nestId = nestOverride ?? parsed?.meta?.nest_id ?? fallbackNestId;

            if (!nestId) {
                console.log(`  ⚠️  ${path.relative(absDir, file)} — no nest id; pass --nest=<id>`);
                skipped++;
                continue;
            }

            await importEgg(content, nestId);
            imported++;
            console.log(`  ✓ ${path.relative(absDir, file)}`);
        } catch (err) {
            failed++;
            console.log(`  ✗ ${path.relative(absDir, file)} — ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    console.log('');
    console.log(`Imported: ${imported}   Skipped: ${skipped}   Failed: ${failed}`);
    return failed > 0 ? 1 : 0;
}

function parseNestOverride(args: string[]): number | undefined {
    for (const a of args) {
        const match = /^--nest=(\d+)$/.exec(a);
        if (match) return Number(match[1]);
    }
    return undefined;
}

async function collectJsonFiles(dir: string, recursive: boolean): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (recursive) files.push(...(await collectJsonFiles(full, true)));
            continue;
        }
        if (entry.isFile() && entry.name.endsWith('.json')) {
            files.push(full);
        }
    }
    return files.sort();
}

async function firstNestId(): Promise<number | undefined> {
    const nest = await prisma.nests.findFirst({ orderBy: { id: 'asc' } });
    return nest?.id;
}
