import fs from "node:fs";
import { Readable } from "node:stream";
import { routeRequest } from "./server.js";

const dbPath = "/private/tmp/shared-state-hub-http-fixture.db";
for (const suffix of ["", "-shm", "-wal"]) {
  try {
    fs.rmSync(`${dbPath}${suffix}`);
  } catch {
    // noop
  }
}

const events = JSON.parse(fs.readFileSync("fixtures/demo-events.json", "utf8"));

await request("GET", "/health");
await request("POST", "/events", events);
const dashboard = await request("GET", "/");
if (!dashboard.body.includes("Shared State Hub")) {
  throw new Error("dashboard did not render expected title");
}
const taskPage = await request("GET", "/tasks/task_shared_state_hub");
if (!taskPage.body.includes("接力上下文")) {
  throw new Error("task page did not render expected Chinese handoff context");
}
if (taskPage.body.includes("Codex 自动捕获：npm run")) {
  throw new Error("primary task page exposed developer capture commands");
}
const settingsPage = await request("GET", "/tasks/task_shared_state_hub/settings");
if (!settingsPage.body.includes("设置与诊断") || !settingsPage.body.includes("手动补充进展")) {
  throw new Error("settings page did not render advanced controls");
}
const englishTaskPage = await request("GET", "/tasks/task_shared_state_hub?lang=en");
if (!englishTaskPage.body.includes("Handoff Context")) {
  throw new Error("task page did not render expected English handoff context");
}
await request("GET", "/tasks/active");
await request("GET", "/tasks/task_shared_state_hub/live-state");
const joinContext = await request("GET", "/tasks/task_shared_state_hub/join-context?budget=tiny");

if (!joinContext.body.includes("Join Context: Build Local AI Shared State Hub MVP")) {
  throw new Error("join context response did not include expected title");
}

await requestForm("POST", "/tasks/task_shared_state_hub/update", {
  summary: "User added a checkpoint from the web UI",
  nextSteps: "Verify editable controls",
  returnTo: "/tasks/task_shared_state_hub"
});

const updatedJoinContext = await request("GET", "/tasks/task_shared_state_hub/join-context?budget=standard");
if (!updatedJoinContext.body.includes("Verify editable controls")) {
  throw new Error("task update form did not affect Join Context");
}

await requestForm("POST", "/tasks/task_shared_state_hub/context", {
  summary: "HTTP UI can add context records",
  files: "src/ui.js\nsrc/server.js",
  returnTo: "/tasks/task_shared_state_hub"
});

await requestForm("POST", "/tasks/task_shared_state_hub/decision", {
  decision: "Editable UI uses append-only records",
  returnTo: "/tasks/task_shared_state_hub"
});

await requestForm("POST", "/tasks/task_shared_state_hub/pitfall", {
  pitfall: "Do not mutate raw events for ordinary corrections",
  returnTo: "/tasks/task_shared_state_hub"
});

await requestForm("POST", "/tasks/task_shared_state_hub/artifact", {
  summary: "Editable UI fixture created records",
  artifactType: "test",
  path: "src/http-fixture-test.js",
  returnTo: "/tasks/task_shared_state_hub"
});

const quickRecordContext = await request("GET", "/tasks/task_shared_state_hub/join-context?budget=deep");
for (const expectedText of [
  "HTTP UI can add context records",
  "Editable UI uses append-only records",
  "Do not mutate raw events for ordinary corrections",
  "Editable UI fixture created records"
]) {
  if (!quickRecordContext.body.includes(expectedText)) {
    throw new Error(`quick record did not appear in Join Context: ${expectedText}`);
  }
}

await requestForm("POST", "/claims/claim_001/release", {
  taskId: "task_shared_state_hub",
  sourceClient: "shared-state-hub-ui",
  returnTo: "/tasks/task_shared_state_hub"
});

const releasedState = await request("GET", "/tasks/task_shared_state_hub/live-state");
const parsedReleasedState = JSON.parse(releasedState.body);
if (parsedReleasedState.state.claims.some((claim) => claim.id === "claim_001")) {
  throw new Error("claim release form did not update Live State");
}

await requestForm("POST", "/events/evt_001/redact", {
  taskId: "task_shared_state_hub",
  sourceClient: "shared-state-hub-ui",
  reason: "Fixture redaction",
  returnTo: "/tasks/task_shared_state_hub"
});

const visibleEvents = await request("GET", "/events?task=task_shared_state_hub");
if (visibleEvents.body.includes('"id": "evt_001"')) {
  throw new Error("redacted event appeared in default event list");
}

console.log("OK: HTTP route fixture passed");

async function request(method, url, body) {
  const requestBody = body === undefined ? "" : JSON.stringify(body);
  const req = Readable.from(requestBody ? [requestBody] : []);
  req.method = method;
  req.url = url;
  req.headers = requestBody ? { "content-type": "application/json" } : {};

  const res = {
    statusCode: undefined,
    headers: undefined,
    body: "",
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(chunk) {
      this.body += chunk ?? "";
    }
  };

  await routeRequest({ request: req, response: res, dbPath });

  if (res.statusCode < 200 || res.statusCode >= 400) {
    throw new Error(`${method} ${url} failed: ${res.statusCode} ${res.body}`);
  }

  return res;
}

async function requestForm(method, url, body) {
  const requestBody = new URLSearchParams(body).toString();
  const req = Readable.from([requestBody]);
  req.method = method;
  req.url = url;
  req.headers = { "content-type": "application/x-www-form-urlencoded" };

  const res = {
    statusCode: undefined,
    headers: undefined,
    body: "",
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(chunk) {
      this.body += chunk ?? "";
    }
  };

  await routeRequest({ request: req, response: res, dbPath });

  if (res.statusCode !== 303) {
    throw new Error(`${method} ${url} expected redirect, got: ${res.statusCode} ${res.body}`);
  }

  return res;
}
