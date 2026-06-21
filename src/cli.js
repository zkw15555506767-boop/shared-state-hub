#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { validateEvents } from "./model.js";
import { reduceEvents } from "./reducer.js";
import { generateJoinContext } from "./join-context.js";
import { DEFAULT_DB_PATH, initDatabase, insertEvent, insertEvents, listEvents, upsertSnapshot } from "./store.js";
import { startServer } from "./server.js";
import { generateConnectorGuide, SUPPORTED_CONNECTORS } from "./connector-guides.js";

const [command, filePath, ...args] = process.argv.slice(2);

try {
  if (!command) {
    printUsage();
    process.exit(1);
  }

  if (command === "init-db") {
    const dbPath = readOption(args, "--db") ?? filePath ?? DEFAULT_DB_PATH;
    console.log(`Initialized database: ${initDatabase(dbPath)}`);
    process.exit(0);
  }

  if (command === "serve") {
    const dbPath = readOption(args, "--db") ?? DEFAULT_DB_PATH;
    const port = readOption(args, "--port") ?? "43177";
    const host = readOption(args, "--host") ?? "127.0.0.1";
    startServer({ dbPath, port, host });
    await new Promise(() => {});
  }

  if (command === "connector") {
    const client = filePath;
    const shouldPrint = args.includes("--print") || !args.length;
    const dbPath = readOption(args, "--db") ?? DEFAULT_DB_PATH;

    if (!client || !SUPPORTED_CONNECTORS.has(client)) {
      throw new Error(`connector must be one of: ${Array.from(SUPPORTED_CONNECTORS).join(", ")}`);
    }

    if (!shouldPrint) {
      throw new Error("Only --print is supported. This prototype does not modify agent config.");
    }

    console.log(generateConnectorGuide(client, { dbPath }));
    process.exit(0);
  }

  if (command === "list-events") {
    const dbPath = readOption(args, "--db") ?? DEFAULT_DB_PATH;
    const taskId = readOption(args, "--task");
    console.log(JSON.stringify(listEvents({ taskId, dbPath }), null, 2));
    process.exit(0);
  }

  if (command === "db-live-state") {
    const dbPath = readOption(args, "--db") ?? DEFAULT_DB_PATH;
    const taskId = readOption(args, "--task");
    const state = reduceEvents(listEvents({ taskId, dbPath }));
    if (state.task.id !== "task_unknown") {
      upsertSnapshot(state.task.id, state, dbPath);
    }
    console.log(JSON.stringify(state, null, 2));
    process.exit(0);
  }

  if (command === "db-join") {
    const dbPath = readOption(args, "--db") ?? DEFAULT_DB_PATH;
    const taskId = readOption(args, "--task");
    const budget = readOption(args, "--budget") ?? "standard";
    const state = reduceEvents(listEvents({ taskId, dbPath }));
    console.log(generateJoinContext(state, { budget }));
    process.exit(0);
  }

  if (!filePath) {
    printUsage();
    process.exit(1);
  }

  const events = readEvents(filePath);
  const errors = validateEvents(events);

  if (command === "check") {
    if (errors.length) {
      console.error(errors.join("\n"));
      process.exit(1);
    }
    console.log(`OK: ${events.length} events`);
    process.exit(0);
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  if (command === "reduce") {
    console.log(JSON.stringify(reduceEvents(events), null, 2));
    process.exit(0);
  }

  if (command === "join") {
    const budget = readOption(args, "--budget") ?? "standard";
    console.log(generateJoinContext(reduceEvents(events), { budget }));
    process.exit(0);
  }

  if (command === "record-event") {
    const dbPath = readOption(args, "--db") ?? DEFAULT_DB_PATH;
    for (const event of events) insertEvent(event, dbPath);
    console.log(`Recorded ${events.length} event(s) to ${dbPath}`);
    process.exit(0);
  }

  if (command === "import-events") {
    const dbPath = readOption(args, "--db") ?? DEFAULT_DB_PATH;
    insertEvents(events, dbPath);
    console.log(`Imported ${events.length} event(s) to ${dbPath}`);
    process.exit(0);
  }

  printUsage();
  process.exit(1);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function readEvents(filePath) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
}

function readOption(args, optionName) {
  const index = args.indexOf(optionName);
  if (index === -1) return undefined;
  return args[index + 1];
}

function printUsage() {
  console.log(`Usage:
  node src/cli.js check <events.json>
  node src/cli.js reduce <events.json>
  node src/cli.js join <events.json> [--budget tiny|standard|deep]
  node src/cli.js init-db [db-path]
  node src/cli.js serve [--host 127.0.0.1] [--port 43177] [--db path]
  node src/cli.js connector codex|claude-code|cursor|trae --print [--db path]
  node src/cli.js import-events <events.json> [--db path]
  node src/cli.js record-event <events.json> [--db path]
  node src/cli.js list-events [--task task_id] [--db path]
  node src/cli.js db-live-state [--task task_id] [--db path]
  node src/cli.js db-join [--task task_id] [--budget tiny|standard|deep] [--db path]
`);
}
