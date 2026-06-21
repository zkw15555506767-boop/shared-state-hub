#!/usr/bin/env node
import { DEFAULT_ARCHIVE_RETENTION_DAYS, getArchiveStats, pruneEventArchives } from "./archive.js";
import { compactLegacyRawEvents, getEventStorageStats, vacuumDatabase } from "./store.js";

const command = process.argv[2] ?? "status";
const dbPath = readOption("--db") ?? process.env.HUB_DB;
const retentionDays = readOption("--retention-days") ?? process.env.HUB_ARCHIVE_RETENTION_DAYS ?? DEFAULT_ARCHIVE_RETENTION_DAYS;

try {
  const storage = getEventStorageStats({ dbPath });

  if (command === "status") {
    print({ storage, archive: getArchiveStats({ archiveDir: storage.archiveDir }), retentionDays: Number(retentionDays) });
  } else if (command === "compact") {
    const compacted = compactLegacyRawEvents({ dbPath });
    print({ compacted, storage: getEventStorageStats({ dbPath }), archive: getArchiveStats({ archiveDir: storage.archiveDir }) });
  } else if (command === "prune") {
    const pruned = pruneEventArchives({ archiveDir: storage.archiveDir, retentionDays });
    print({ pruned, storage: getEventStorageStats({ dbPath }), archive: getArchiveStats({ archiveDir: storage.archiveDir }) });
  } else if (command === "vacuum") {
    print({ storage: vacuumDatabase({ dbPath }), archive: getArchiveStats({ archiveDir: storage.archiveDir }) });
  } else {
    console.error("Usage: node src/storage-cli.js [status|compact|prune|vacuum] [--db path] [--retention-days 30]");
    process.exit(1);
  }
} catch (error) {
  console.error(`Shared State Hub storage: ${error.message}`);
  process.exit(1);
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}
