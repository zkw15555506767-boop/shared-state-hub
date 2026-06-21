import { BUDGETS } from "./model.js";

export function generateJoinContext(state, options = {}) {
  const budgetName = options.budget ?? "standard";
  const budget = BUDGETS[budgetName] ?? BUDGETS.standard;
  const lines = [];

  lines.push(`# Join Context: ${state.task.title}`);
  lines.push("");
  lines.push("## Task");
  lines.push(`- ID: ${state.task.id}`);
  lines.push(`- Phase: ${state.task.phase}`);
  lines.push(`- Status: ${state.task.status}`);

  addList(lines, "Next Steps", state.task.nextSteps, budget.recentActivity);
  addList(lines, "Blockers", state.task.blockers, budget.recentActivity);

  lines.push("");
  lines.push("## Active Agents");
  if (state.agents.length === 0) {
    lines.push("- No active agents recorded.");
  } else {
    for (const agent of state.agents) {
      lines.push(
        `- ${agent.client}: ${agent.status}` +
          (agent.currentActivity ? ` — ${agent.currentActivity}` : "") +
          (agent.cwd ? ` (${agent.cwd})` : "")
      );
    }
  }

  addClaims(lines, state.claims);
  addList(lines, "Conflict Warnings", state.conflictWarnings, budget.recentActivity);
  addList(lines, "User / Task Context", state.activeContext, budget.context);
  addList(lines, "Recent Activity", state.recentActivity.slice().reverse(), budget.recentActivity);
  addList(lines, "Decisions", state.decisions, budget.decisions);
  addList(lines, "Pitfalls", state.pitfalls, budget.pitfalls);
  addList(lines, "Artifacts", state.artifacts, budget.artifacts);
  addList(lines, "Open Questions", state.openQuestions, budget.recentActivity);

  const suggestedWork = buildSuggestedWork(state);
  addList(lines, "Suggested Safe Work", suggestedWork, 5);

  const avoid = buildAvoidList(state);
  addList(lines, "Avoid", avoid, 5);

  return `${lines.join("\n")}\n`;
}

function addClaims(lines, claims) {
  lines.push("");
  lines.push("## Active Claims");

  if (claims.length === 0) {
    lines.push("- No active claims.");
    return;
  }

  for (const claim of claims) {
    lines.push(
      `- ${claim.client} claimed ${claim.resourceType}:${claim.resource}` +
        (claim.purpose ? ` — ${claim.purpose}` : "") +
        (claim.expiresAt ? ` (expires ${claim.expiresAt})` : "")
    );
  }
}

function addList(lines, title, items, limit) {
  lines.push("");
  lines.push(`## ${title}`);

  const visibleItems = items.filter(Boolean).slice(0, limit);
  if (visibleItems.length === 0) {
    lines.push("- None recorded.");
    return;
  }

  for (const item of visibleItems) {
    lines.push(`- ${item}`);
  }

  const remaining = items.length - visibleItems.length;
  if (remaining > 0) {
    lines.push(`- … ${remaining} more omitted by budget.`);
  }
}

function buildSuggestedWork(state) {
  const suggestions = [];

  if (state.task.nextSteps.length) {
    suggestions.push(...state.task.nextSteps.slice(0, 3));
  }

  if (state.conflictWarnings.length) {
    suggestions.push("Resolve or avoid current claim conflicts before editing files.");
  }

  if (!suggestions.length) {
    suggestions.push("Ask the user which part of the task to continue.");
  }

  return suggestions;
}

function buildAvoidList(state) {
  const avoid = [];

  for (const claim of state.claims) {
    avoid.push(`Do not modify ${claim.resource} without coordinating with ${claim.client}.`);
  }

  if (state.conflictWarnings.length) {
    avoid.push("Do not duplicate work already claimed by another active agent.");
  }

  return avoid;
}
