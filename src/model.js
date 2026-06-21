export const EVENT_TYPES = new Set([
  "agent.session_started",
  "agent.heartbeat",
  "agent.session_stopped",
  "user.prompt_submitted",
  "context.added",
  "tool.started",
  "tool.completed",
  "file.read",
  "file.edited",
  "task.created",
  "task.updated",
  "task.claimed",
  "task.released",
  "artifact.created",
  "decision.recorded",
  "pitfall.recorded",
  "event.corrected",
  "event.redacted"
]);

export const BUDGETS = {
  tiny: {
    recentActivity: 3,
    context: 3,
    decisions: 2,
    pitfalls: 2,
    artifacts: 2
  },
  standard: {
    recentActivity: 8,
    context: 6,
    decisions: 5,
    pitfalls: 5,
    artifacts: 5
  },
  deep: {
    recentActivity: 20,
    context: 15,
    decisions: 12,
    pitfalls: 12,
    artifacts: 12
  }
};

export function validateEvent(event) {
  const errors = [];

  if (!event || typeof event !== "object") {
    return ["event must be an object"];
  }

  if (!event.id || typeof event.id !== "string") {
    errors.push("id must be a string");
  }

  if (!EVENT_TYPES.has(event.type)) {
    errors.push(`type must be one of: ${Array.from(EVENT_TYPES).join(", ")}`);
  }

  if (!event.timestamp || Number.isNaN(Date.parse(event.timestamp))) {
    errors.push("timestamp must be an ISO-compatible string");
  }

  if (!event.source || typeof event.source !== "object") {
    errors.push("source must be an object");
  } else {
    if (!event.source.client || typeof event.source.client !== "string") {
      errors.push("source.client must be a string");
    }
  }

  if (event.visibility && !["private", "task", "project", "global"].includes(event.visibility)) {
    errors.push("visibility must be private, task, project, or global");
  }

  if (event.risk && !["low", "medium", "high"].includes(event.risk)) {
    errors.push("risk must be low, medium, or high");
  }

  return errors;
}

export function validateEvents(events) {
  if (!Array.isArray(events)) {
    return ["events file must contain a JSON array"];
  }

  return events.flatMap((event, index) =>
    validateEvent(event).map((error) => `events[${index}]: ${error}`)
  );
}
