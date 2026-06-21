function emptyState() {
  return {
    task: {
      id: "task_unknown",
      title: "Untitled task",
      phase: "unknown",
      status: "active",
      nextSteps: [],
      blockers: []
    },
    agents: [],
    claims: [],
    activeContext: [],
    recentActivity: [],
    decisions: [],
    pitfalls: [],
    artifacts: [],
    conflictWarnings: [],
    openQuestions: []
  };
}

export function reduceEvents(events) {
  const state = emptyState();
  const agents = new Map();
  const claims = new Map();
  const visibleEvents = getVisibleEvents(events);

  const sortedEvents = [...visibleEvents].sort((left, right) =>
    new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );

  for (const event of sortedEvents) {
    const client = event.source?.client ?? "unknown";
    const sessionId = event.source?.sessionId;
    const agentKey = `${client}:${sessionId ?? "default"}`;

    if (event.taskId && state.task.id === "task_unknown") {
      state.task.id = event.taskId;
    }

    switch (event.type) {
      case "task.created":
      case "task.updated":
        applyTaskUpdate(state, event);
        break;
      case "agent.session_started":
      case "agent.heartbeat":
        agents.set(agentKey, upsertAgent(agents.get(agentKey), event, "active"));
        pushRecent(state, event, describeAgentEvent(event));
        break;
      case "agent.session_stopped":
        agents.set(agentKey, upsertAgent(agents.get(agentKey), event, "offline"));
        pushRecent(state, event, describeAgentEvent(event));
        break;
      case "user.prompt_submitted":
        applyUserPrompt(state, event);
        pushRecent(state, event, `User provided context via ${client}`);
        break;
      case "context.added":
        addUnique(state.activeContext, event.payload?.summary ?? event.payload?.content);
        pushRecent(state, event, `Context added by ${client}`);
        break;
      case "task.claimed":
        claims.set(event.payload?.claimId ?? event.id, normalizeClaim(event));
        pushRecent(state, event, `${client} claimed ${event.payload?.resource ?? "work"}`);
        break;
      case "task.released":
        releaseClaim(claims, event);
        pushRecent(state, event, `${client} released ${event.payload?.claimId ?? event.payload?.resource ?? "work"}`);
        break;
      case "tool.started":
        agents.set(agentKey, upsertAgent(agents.get(agentKey), event, "active"));
        pushRecent(state, event, `${client} started ${event.payload?.tool ?? "tool"}`);
        break;
      case "tool.completed":
        applyToolResult(state, event);
        break;
      case "file.read":
        pushRecent(state, event, `${client} read ${formatFiles(event)}`);
        break;
      case "file.edited":
        applyArtifact(state, event, `${client} edited ${formatFiles(event)}`);
        break;
      case "artifact.created":
        applyArtifact(state, event, event.payload?.summary ?? `${client} created artifact`);
        break;
      case "decision.recorded":
        addUnique(state.decisions, event.payload?.decision ?? event.payload?.summary);
        pushRecent(state, event, `${client} recorded a decision`);
        break;
      case "pitfall.recorded":
        addUnique(state.pitfalls, event.payload?.pitfall ?? event.payload?.summary);
        pushRecent(state, event, `${client} recorded a pitfall`);
        break;
      default:
        pushRecent(state, event, `${client} emitted ${event.type}`);
        break;
    }
  }

  state.agents = Array.from(agents.values()).sort((left, right) =>
    left.client.localeCompare(right.client)
  );
  state.claims = Array.from(claims.values()).filter((claim) => claim.status === "active");
  state.conflictWarnings = detectConflicts(state.claims);

  return state;
}

export function getVisibleEvents(events) {
  const redactedEventIds = getRedactedEventIds(events);
  return events.filter((event) => !redactedEventIds.has(event.id));
}

export function getRedactedEventIds(events) {
  const redactedEventIds = new Set();

  for (const event of events) {
    if (event.type === "event.redacted" && event.payload?.targetEventId) {
      redactedEventIds.add(event.payload.targetEventId);
    }
  }

  return redactedEventIds;
}

function applyTaskUpdate(state, event) {
  const payload = event.payload ?? {};

  state.task = {
    ...state.task,
    id: event.taskId ?? payload.id ?? state.task.id,
    title: payload.title ?? state.task.title,
    phase: payload.phase ?? state.task.phase,
    status: payload.status ?? state.task.status,
    nextSteps: mergeLists(state.task.nextSteps, payload.nextSteps),
    blockers: mergeLists(state.task.blockers, payload.blockers)
  };

  if (payload.openQuestions) {
    state.openQuestions = mergeLists(state.openQuestions, payload.openQuestions);
  }

  pushRecent(state, event, payload.summary ?? `Task updated: ${state.task.title}`);
}

function applyUserPrompt(state, event) {
  const payload = event.payload ?? {};

  addUnique(state.activeContext, payload.summary);
  addUnique(state.activeContext, payload.userIntent);

  if (Array.isArray(payload.context)) {
    for (const item of payload.context) addUnique(state.activeContext, item);
  }

  if (Array.isArray(payload.files)) {
    for (const file of payload.files) addUnique(state.activeContext, `File context: ${file}`);
  }
}

function applyToolResult(state, event) {
  const payload = event.payload ?? {};
  const client = event.source?.client ?? "unknown";
  const status = payload.status ?? "completed";
  const label = payload.summary ?? `${client} completed ${payload.tool ?? "tool"} with status ${status}`;

  pushRecent(state, event, label);

  if (status === "failed" || status === "error") {
    addUnique(state.pitfalls, payload.summary ?? `${payload.tool ?? "tool"} failed`);
  }

  if (payload.nextSteps) {
    state.task.nextSteps = mergeLists(state.task.nextSteps, payload.nextSteps);
  }
}

function applyArtifact(state, event, fallbackSummary) {
  const payload = event.payload ?? {};
  const artifact = payload.summary ?? fallbackSummary;

  addUnique(state.artifacts, artifact);
  pushRecent(state, event, artifact);
}

function upsertAgent(existing, event, status) {
  const payload = event.payload ?? {};

  return {
    client: event.source?.client ?? existing?.client ?? "unknown",
    sessionId: event.source?.sessionId ?? existing?.sessionId,
    connectorLevel: event.source?.connectorLevel ?? existing?.connectorLevel,
    cwd: event.source?.cwd ?? existing?.cwd,
    status: payload.status ?? status,
    currentActivity: payload.currentActivity ?? payload.summary ?? existing?.currentActivity,
    lastSeenAt: event.timestamp
  };
}

function normalizeClaim(event) {
  const payload = event.payload ?? {};

  return {
    id: payload.claimId ?? event.id,
    taskId: event.taskId,
    client: event.source?.client ?? "unknown",
    agentId: event.source?.agentId,
    resource: payload.resource ?? "unknown",
    resourceType: payload.resourceType ?? "task",
    purpose: payload.purpose,
    status: "active",
    createdAt: event.timestamp,
    expiresAt: payload.expiresAt
  };
}

function releaseClaim(claims, event) {
  const claimId = event.payload?.claimId;
  const resource = event.payload?.resource;

  for (const [key, claim] of claims.entries()) {
    if ((claimId && claim.id === claimId) || (resource && claim.resource === resource)) {
      claims.set(key, { ...claim, status: "released", releasedAt: event.timestamp });
    }
  }
}

function detectConflicts(claims) {
  const byResource = new Map();
  const warnings = [];

  for (const claim of claims) {
    const existing = byResource.get(claim.resource);
    if (existing && existing.client !== claim.client) {
      warnings.push(`${claim.resource} is claimed by both ${existing.client} and ${claim.client}`);
    } else {
      byResource.set(claim.resource, claim);
    }
  }

  return warnings;
}

function pushRecent(state, event, message) {
  if (!message) return;
  state.recentActivity.push(`${event.timestamp} · ${message}`);
}

function addUnique(list, value) {
  if (!value || typeof value !== "string") return;
  if (!list.includes(value)) list.push(value);
}

function mergeLists(existing, incoming) {
  const next = [...existing];
  const items = Array.isArray(incoming) ? incoming : incoming ? [incoming] : [];
  for (const item of items) addUnique(next, item);
  return next;
}

function formatFiles(event) {
  const files = event.evidence?.files ?? event.payload?.files ?? [];
  return files.length ? files.join(", ") : "files";
}

function describeAgentEvent(event) {
  const client = event.source?.client ?? "unknown";
  const activity = event.payload?.currentActivity ?? event.payload?.summary;

  if (event.type === "agent.session_started") {
    return `${client} started a session${activity ? ` — ${activity}` : ""}`;
  }

  if (event.type === "agent.session_stopped") {
    return `${client} stopped a session${activity ? ` — ${activity}` : ""}`;
  }

  return `${client} heartbeat${activity ? ` — ${activity}` : ""}`;
}
