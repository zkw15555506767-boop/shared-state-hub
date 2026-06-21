import { generateJoinContext } from "./join-context.js";
import { getVisibleEvents } from "./reducer.js";

const COPY = {
  zh: {
    appName: "Shared State Hub",
    tagline: "让 Codex、Claude Code 和其他 AI 接同一棒。",
    dashboardLead: "这里显示当前正在同步的任务。点进任务页即可查看接力摘要、最近进展和手动补充入口。",
    activeTasks: "正在同步的任务",
    noTasks: "还没有记录任务。先让一个 Agent 写入任务，或者导入 demo 数据。",
    taskCount: "个任务",
    openTask: "打开任务",
    back: "← 返回任务列表",
    currentTask: "当前任务",
    phase: "阶段",
    status: "状态",
    nextSteps: "下一步",
    blockers: "阻塞点",
    noItems: "暂无记录",
    handoffContext: "接力上下文",
    handoffHelp: "这是给另一个 AI 继续工作时看的摘要。可以复制，也可以让 Codex / Claude 通过 MCP 自动读取。",
    copy: "复制",
    copied: "已复制",
    syncStatus: "同步状态",
    activeAgents: "已连接/最近活跃的 AI",
    occupiedWork: "正在占用的工作",
    warnings: "冲突提醒",
    manualUpdate: "手动补充进展",
    manualUpdateHelp: "如果自动提取不够好，可以在这里补一句。系统会追加记录，不会改历史。",
    summary: "一句话说明",
    summaryPlaceholder: "例如：Codex 已完成 UI 改版，下一步让 Claude Code 测试接力",
    nextStepsPlaceholder: "每行一个下一步",
    blockersPlaceholder: "每行一个阻塞点",
    questionsPlaceholder: "每行一个待确认问题",
    openQuestions: "待确认问题",
    addProgress: "记录进展",
    quickRecords: "快速记录",
    quickRecordsHelp: "把未来接力时一定要知道的信息单独记下来。",
    context: "上下文",
    contextHint: "用户要求、文件路径、约束",
    detail: "详情",
    files: "相关文件",
    decision: "决定",
    decisionHint: "我们决定了什么？",
    pitfall: "坑点",
    pitfallHint: "以后不要再踩什么坑？",
    artifact: "产物",
    artifactHint: "产生了什么文件/链接/说明？",
    artifactType: "类型",
    path: "路径",
    url: "链接",
    record: "记录",
    recentActivity: "最近发生",
    hide: "隐藏",
    hideReason: "从接力视图隐藏",
    release: "释放",
    releaseClaim: "释放占用",
    noAgents: "还没有 AI 活跃记录",
    noClaims: "没有占用中的工作",
    noEvents: "还没有时间线记录",
    language: "English",
    languageUrlSuffix: "lang=en",
    settings: "设置与诊断",
    settingsLead: "这里用于检查连接、补充记录和管理历史；日常无需打开。",
    backToTask: "← 返回任务",
    automaticSync: "自动同步",
    automaticSyncHelp: "Hub 会在后台监听 Codex App 和 Claude Code 的新会话。它们都可以读写同一份任务状态。",
    activity: "最近同步",
    allGood: "一切正常",
    needsSetup: "需要设置",
    openSettings: "查看设置与诊断",
    privacyNote: "提示：这里只保存你允许 Agent 写入的状态；当前版本不会后台偷录屏或读取私聊。"
    ,
    autoCapture: "自动捕获",
    autoCaptureHelp: "Codex App watcher 和 Claude Code watcher 监听本机 session 日志；Claude Code hook 作为补充捕获提示词和工具事件。",
    connector: "连接器",
    captureState: "状态",
    lastCapture: "最近捕获",
    notStarted: "未启动",
    runCodexWatcher: "Codex 自动捕获：npm run capture:codex",
    installClaudeHook: "Claude 自动捕获：npm run capture:install:claude"
  },
  en: {
    appName: "Shared State Hub",
    tagline: "A shared handoff layer for Codex, Claude Code, and other AI agents.",
    dashboardLead: "This page shows tasks currently synchronized through the Hub. Open a task to view handoff context, recent activity, and quick record controls.",
    activeTasks: "Active Tasks",
    noTasks: "No tasks yet. Ask an agent to write a task or import demo events.",
    taskCount: "task(s)",
    openTask: "Open task",
    back: "← Back to tasks",
    currentTask: "Current Task",
    phase: "Phase",
    status: "Status",
    nextSteps: "Next Steps",
    blockers: "Blockers",
    noItems: "None recorded",
    handoffContext: "Handoff Context",
    handoffHelp: "This is the summary another AI should read before continuing. Copy it, or let Codex / Claude read it through MCP.",
    copy: "Copy",
    copied: "Copied",
    syncStatus: "Sync Status",
    activeAgents: "Connected / Recently Active AI",
    occupiedWork: "Claimed Work",
    warnings: "Conflict Warnings",
    manualUpdate: "Add Progress",
    manualUpdateHelp: "If automatic extraction misses something, add it here. This appends a record and does not rewrite history.",
    summary: "Summary",
    summaryPlaceholder: "Example: Codex finished the UI redesign; Claude Code should test handoff next",
    nextStepsPlaceholder: "One next step per line",
    blockersPlaceholder: "One blocker per line",
    questionsPlaceholder: "One open question per line",
    openQuestions: "Open Questions",
    addProgress: "Record Progress",
    quickRecords: "Quick Records",
    quickRecordsHelp: "Capture facts future agents must know during handoff.",
    context: "Context",
    contextHint: "User request, file path, or constraint",
    detail: "Details",
    files: "Files",
    decision: "Decision",
    decisionHint: "What did we decide?",
    pitfall: "Pitfall",
    pitfallHint: "What should future agents avoid?",
    artifact: "Artifact",
    artifactHint: "What file/link/note was produced?",
    artifactType: "Type",
    path: "Path",
    url: "URL",
    record: "Record",
    recentActivity: "Recent Activity",
    hide: "Hide",
    hideReason: "Hide from handoff view",
    release: "Release",
    releaseClaim: "Release claim",
    noAgents: "No active AI recorded",
    noClaims: "No claimed work",
    noEvents: "No timeline events yet",
    language: "中文",
    languageUrlSuffix: "lang=zh",
    settings: "Settings & Diagnostics",
    settingsLead: "Use this page to inspect connections, add corrections, and manage history. Daily work should not require it.",
    backToTask: "← Back to task",
    automaticSync: "Automatic Sync",
    automaticSyncHelp: "The Hub listens for new Codex App and Claude Code sessions in the background. Both can read and write the same task state.",
    activity: "Recent sync",
    allGood: "Everything is healthy",
    needsSetup: "Needs setup",
    openSettings: "Open settings & diagnostics",
    privacyNote: "Note: the Hub stores state agents write into it. This prototype does not silently record your screen or private chats.",
    autoCapture: "Auto Capture",
    autoCaptureHelp: "The Codex App watcher and Claude Code watcher tail local session logs; the Claude Code hook supplements prompts and tool events.",
    connector: "Connector",
    captureState: "State",
    lastCapture: "Last Capture",
    notStarted: "Not started",
    runCodexWatcher: "Codex auto capture: npm run capture:codex",
    installClaudeHook: "Claude auto capture: npm run capture:install:claude"
  }
};

export function renderDashboard(tasks, options = {}) {
  const lang = normalizeLang(options.lang);
  const t = COPY[lang];

  return layout(
    t.appName,
    lang,
    `
      <section class="hero">
        <div>
          <p class="eyebrow">${escapeHtml(t.appName)}</p>
          <h1>${escapeHtml(t.tagline)}</h1>
          <p>${escapeHtml(t.dashboardLead)}</p>
        </div>
        ${renderLanguageSwitch("/", lang, t)}
      </section>

      <section class="card">
        <div class="section-header">
          <h2>${escapeHtml(t.activeTasks)}</h2>
          <span class="pill">${tasks.length} ${escapeHtml(t.taskCount)}</span>
        </div>
        ${
          tasks.length
            ? `<div class="task-list">${tasks.map((task) => renderTaskRow(task, lang, t)).join("")}</div>`
            : `<p class="muted">${escapeHtml(t.noTasks)}</p>`
        }
      </section>
    `
  );
}

export function renderTaskDetail(state, events, options = {}) {
  const lang = normalizeLang(options.lang);
  const t = COPY[lang];
  const joinContext = generateJoinContext(state, { budget: "standard" });
  const taskUrl = `/tasks/${encodeURIComponent(state.task.id)}`;
  const taskUrlWithLang = withLang(taskUrl, lang);
  const settingsUrl = withLang(`${taskUrl}/settings`, lang);

  return layout(
    state.task.title,
    lang,
    `
      <nav class="top-nav">
        <a href="${withLang("/", lang)}">${escapeHtml(t.back)}</a>
        <div class="nav-actions"><a class="language-switch" href="${escapeHtml(settingsUrl)}">${escapeHtml(t.settings)}</a>${renderLanguageSwitch(taskUrl, lang, t)}</div>
      </nav>

      <section class="hero compact">
        <div>
          <p class="eyebrow">${escapeHtml(t.currentTask)}</p>
          <h1>${escapeHtml(state.task.title)}</h1>
          <p>${escapeHtml(t.phase)}：${escapeHtml(state.task.phase)} · ${escapeHtml(t.status)}：${escapeHtml(state.task.status)}</p>
        </div>
      </section>

      <div class="overview-grid primary-grid">
        <section class="card focus-card">
          <h2>${escapeHtml(t.currentTask)}</h2>
          <div class="meta-grid">
            <div><span>${escapeHtml(t.phase)}</span><strong>${escapeHtml(state.task.phase)}</strong></div>
            <div><span>${escapeHtml(t.status)}</span><strong>${escapeHtml(state.task.status)}</strong></div>
          </div>
          <h3>${escapeHtml(t.nextSteps)}</h3>
          ${renderList(state.task.nextSteps, t)}
          <h3>${escapeHtml(t.blockers)}</h3>
          ${renderList(state.task.blockers, t)}
        </section>

        <section class="card focus-card">
          <div class="section-header">
            <div>
              <h2>${escapeHtml(t.handoffContext)}</h2>
              <p class="muted">${escapeHtml(t.handoffHelp)}</p>
            </div>
            <button type="button" data-copy-target="join-context" data-copy-text="${escapeHtml(t.copy)}" data-copied-text="${escapeHtml(t.copied)}">${escapeHtml(t.copy)}</button>
          </div>
          <pre id="join-context">${escapeHtml(joinContext)}</pre>
        </section>
      </div>

      <section class="card sync-card">
        <div class="section-header relaxed">
          <div><h2>${escapeHtml(t.automaticSync)}</h2><p class="muted">${escapeHtml(t.automaticSyncHelp)}</p></div>
          <a class="language-switch" href="${escapeHtml(settingsUrl)}">${escapeHtml(t.openSettings)} →</a>
        </div>
        ${renderSyncHealth(options.captureStatus, t)}
      </section>

      <section class="card">
        <h2>${escapeHtml(t.activity)}</h2>
        ${renderActivity(getVisibleEvents(events), state.task.id, t, lang, 6)}
      </section>
    `
  );
}

export function renderTaskSettings(state, events, options = {}) {
  const lang = normalizeLang(options.lang);
  const t = COPY[lang];
  const taskUrl = `/tasks/${encodeURIComponent(state.task.id)}`;
  const taskUrlWithLang = withLang(taskUrl, lang);

  return layout(
    t.settings,
    lang,
    `
      <nav class="top-nav"><a href="${escapeHtml(taskUrlWithLang)}">${escapeHtml(t.backToTask)}</a>${renderLanguageSwitch(`${taskUrl}/settings`, lang, t)}</nav>
      <section class="hero compact"><div><p class="eyebrow">${escapeHtml(t.settings)}</p><h1>${escapeHtml(state.task.title)}</h1><p>${escapeHtml(t.settingsLead)}</p></div></section>
      <div class="overview-grid">
        <section class="card"><h2>${escapeHtml(t.syncStatus)}</h2>${renderCaptureStatus(options.captureStatus, t)}<p class="muted">${escapeHtml(t.privacyNote)}</p></section>
        <section class="card"><h2>${escapeHtml(t.manualUpdate)}</h2><p class="muted">${escapeHtml(t.manualUpdateHelp)}</p>
          <form method="post" action="/tasks/${encodeURIComponent(state.task.id)}/update"><input type="hidden" name="returnTo" value="${escapeHtml(taskUrlWithLang)}">${field("summary", t.summary, t.summaryPlaceholder)}<div class="form-grid">${field("phase", t.phase, "", state.task.phase)}${field("status", t.status, "", state.task.status)}</div>${textArea("nextSteps", t.nextSteps, t.nextStepsPlaceholder, 4)}${textArea("blockers", t.blockers, t.blockersPlaceholder, 3)}${textArea("openQuestions", t.openQuestions, t.questionsPlaceholder, 3)}<button type="submit">${escapeHtml(t.addProgress)}</button></form>
        </section>
      </div>
      <section class="card"><h2>${escapeHtml(t.quickRecords)}</h2><div class="record-grid">
        ${renderQuickRecordForm(state.task.id, lang, "context", t.context, [field("summary", t.context, t.contextHint), textArea("content", t.detail, "", 3), textArea("files", t.files, t.files, 3)], t)}
        ${renderQuickRecordForm(state.task.id, lang, "decision", t.decision, [field("decision", t.decision, t.decisionHint), field("summary", t.summary, "")], t)}
        ${renderQuickRecordForm(state.task.id, lang, "pitfall", t.pitfall, [field("pitfall", t.pitfall, t.pitfallHint), field("summary", t.summary, "")], t)}
        ${renderQuickRecordForm(state.task.id, lang, "artifact", t.artifact, [field("summary", t.artifact, t.artifactHint), field("artifactType", t.artifactType, "file / url / note"), field("path", t.path, "/path/to/file"), field("url", t.url, "https://...")], t)}
      </div></section>
      <section class="card"><h2>${escapeHtml(t.recentActivity)}</h2>${renderActivity(getVisibleEvents(events), state.task.id, t, lang, 100)}</section>
    `
  );
}

function renderTaskRow(task, lang, t) {
  return `
    <a class="task-row" href="${withLang(`/tasks/${encodeURIComponent(task.id)}`, lang)}">
      <div>
        <strong>${escapeHtml(task.title)}</strong>
        <p>${escapeHtml(t.phase)}：${escapeHtml(task.phase)} · ${escapeHtml(t.status)}：${escapeHtml(task.status)}</p>
      </div>
      <span>${escapeHtml(t.openTask)} →</span>
    </a>
  `;
}

function renderAgent(agent) {
  return `<li><strong>${escapeHtml(agent.client)}</strong><span>${escapeHtml(agent.status)}${agent.currentActivity ? ` · ${escapeHtml(agent.currentActivity)}` : ""}</span></li>`;
}

function renderClaim(claim, t, lang) {
  return `
    <li>
      <strong>${escapeHtml(claim.client)}</strong>
      <span>${escapeHtml(claim.resourceType)} · ${escapeHtml(claim.resource)}${claim.purpose ? ` · ${escapeHtml(claim.purpose)}` : ""}</span>
      <form class="inline-form" method="post" action="/claims/${encodeURIComponent(claim.id)}/release" title="${escapeHtml(t.releaseClaim)}">
        <input type="hidden" name="taskId" value="${escapeHtml(claim.taskId)}">
        <input type="hidden" name="returnTo" value="${escapeHtml(withLang(`/tasks/${encodeURIComponent(claim.taskId)}`, lang))}">
        <input type="hidden" name="sourceClient" value="shared-state-hub-ui">
        <button type="submit">${escapeHtml(t.release)}</button>
      </form>
    </li>
  `;
}

function renderEvent(event, taskId, t, lang) {
  const summary = event.payload?.summary ?? event.payload?.decision ?? event.payload?.pitfall ?? event.payload?.content;
  return `
    <li>
      <div class="event-head">
        <span>${escapeHtml(formatEventType(event.type, t))}</span>
        <strong>${escapeHtml(event.source?.client ?? "unknown")}</strong>
        <time>${escapeHtml(formatTime(event.timestamp))}</time>
      </div>
      ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
      ${event.type !== "event.redacted" ? renderRedactForm(event, taskId, t, lang) : ""}
    </li>
  `;
}

function renderRedactForm(event, taskId, t, lang) {
  return `
    <form class="inline-form subtle" method="post" action="/events/${encodeURIComponent(event.id)}/redact">
      <input type="hidden" name="taskId" value="${escapeHtml(taskId)}">
      <input type="hidden" name="returnTo" value="${escapeHtml(withLang(`/tasks/${encodeURIComponent(taskId)}`, lang))}">
      <input type="hidden" name="sourceClient" value="shared-state-hub-ui">
      <input name="reason" placeholder="${escapeHtml(t.hideReason)}" value="${escapeHtml(t.hideReason)}">
      <button type="submit">${escapeHtml(t.hide)}</button>
    </form>
  `;
}

function renderQuickRecordForm(taskId, lang, kind, title, fields, t) {
  return `
    <form class="mini-form" method="post" action="/tasks/${encodeURIComponent(taskId)}/${kind}">
      <h3>${escapeHtml(title)}</h3>
      <input type="hidden" name="returnTo" value="${escapeHtml(withLang(`/tasks/${encodeURIComponent(taskId)}`, lang))}">
      <input type="hidden" name="sourceClient" value="shared-state-hub-ui">
      ${fields.join("")}
      <button type="submit">${escapeHtml(t.record)} ${escapeHtml(title)}</button>
    </form>
  `;
}

function renderCaptureStatus(status, t) {
  const connectors = status?.connectors ?? {};
  const rows = [
    ["Codex App", connectors["codex-app"]],
    ["Claude Code Watcher", connectors["claude-code-watcher"]],
    ["Claude Code", connectors["claude-code-hook"]]
  ];

  return `
    <div class="capture-table">
      <div class="capture-row capture-head">
        <span>${escapeHtml(t.connector)}</span>
        <span>${escapeHtml(t.captureState)}</span>
        <span>${escapeHtml(t.lastCapture)}</span>
      </div>
      ${rows
        .map(([name, connector]) => {
          const state = connector?.status ?? t.notStarted;
          const last = connector?.lastCapturedAt ?? connector?.lastScanAt ?? connector?.updatedAt ?? "—";
          return `
            <div class="capture-row">
              <strong>${escapeHtml(name)}</strong>
              <span class="status-dot ${statusClass(state)}">${escapeHtml(state)}</span>
              <time>${escapeHtml(last)}</time>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderSyncHealth(status, t) {
  const connectors = status?.connectors ?? {};
  const rows = [
    ["Codex App", connectors["codex-app"]],
    ["Claude Code", connectors["claude-code-watcher"]]
  ];
  const healthy = rows.every(([, connector]) => ["running", "captured", "scanned"].includes(connector?.status));

  return `
    <div class="health-summary ${healthy ? "healthy" : "attention"}">
      <strong>${escapeHtml(healthy ? t.allGood : t.needsSetup)}</strong>
      <span>${escapeHtml(healthy ? t.automaticSync : t.openSettings)}</span>
    </div>
    <div class="sync-rows">
      ${rows
        .map(([name, connector]) => {
          const state = connector?.status ?? t.notStarted;
          const last = connector?.lastCapturedAt ?? connector?.lastScanAt ?? connector?.updatedAt;
          return `<div class="sync-row"><strong>${escapeHtml(name)}</strong><span class="status-dot ${statusClass(state)}">${escapeHtml(state)}</span><time>${escapeHtml(last ? formatTime(last) : "—")}</time></div>`;
        })
        .join("")}
    </div>
  `;
}

function renderActivity(events, taskId, t, lang, limit) {
  const items = limit ? events.slice(-limit) : events;
  if (!items.length) return `<p class="muted">${escapeHtml(t.noEvents)}</p>`;
  return `<ol class="timeline">${items
    .slice()
    .reverse()
    .map((event) => renderEvent(event, taskId, t, lang))
    .join("")}</ol>`;
}

function field(name, label, placeholder, value = "") {
  return `
    <label>
      ${escapeHtml(label)}
      <input name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}">
    </label>
  `;
}

function textArea(name, label, placeholder, rows) {
  return `
    <label>
      ${escapeHtml(label)}
      <textarea name="${escapeHtml(name)}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"></textarea>
    </label>
  `;
}

function renderList(items, t) {
  if (!items.length) return `<p class="muted">${escapeHtml(t.noItems)}</p>`;
  return `<ul class="plain-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function statusClass(value) {
  if (["running", "captured", "scanned"].includes(value)) return "ok";
  if (["error", "missing_sessions_dir"].includes(value)) return "bad";
  return "idle";
}

function renderLanguageSwitch(basePath, lang, t) {
  const separator = basePath.includes("?") ? "&" : "?";
  return `<a class="language-switch" href="${escapeHtml(`${basePath}${separator}${t.languageUrlSuffix}`)}">${escapeHtml(t.language)}</a>`;
}

function withLang(path, lang) {
  return lang === "en" ? `${path}${path.includes("?") ? "&" : "?"}lang=en` : path;
}

function normalizeLang(lang) {
  return lang === "en" ? "en" : "zh";
}

function formatEventType(type, t) {
  const zhNames = {
    "agent.session_started": "AI 开始工作",
    "agent.heartbeat": "AI 状态更新",
    "agent.session_stopped": "AI 停止工作",
    "user.prompt_submitted": "用户输入",
    "context.added": "新增上下文",
    "tool.started": "工具开始",
    "tool.completed": "工具完成",
    "file.read": "读取文件",
    "file.edited": "修改文件",
    "task.created": "创建任务",
    "task.updated": "更新进展",
    "task.claimed": "占用工作",
    "task.released": "释放占用",
    "artifact.created": "新增产物",
    "decision.recorded": "记录决定",
    "pitfall.recorded": "记录坑点",
    "event.redacted": "隐藏记录"
  };
  if (t === COPY.zh) return zhNames[type] ?? type;
  return type.replaceAll(".", " ");
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString();
}

function layout(title, lang, body) {
  return `<!doctype html>
<html lang="${lang === "en" ? "en" : "zh-CN"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f3ee;
      --panel: #fffaf3;
      --panel-soft: #f1e8dc;
      --text: #211b16;
      --muted: #7a6f64;
      --accent: #7c3aed;
      --accent-strong: #5b21b6;
      --good: #047857;
      --border: #e3d8ca;
      --shadow: rgba(54, 39, 22, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(124, 58, 237, 0.18), transparent 32rem),
        linear-gradient(135deg, #fff8ed, var(--bg));
      color: var(--text);
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 28px 20px 64px;
    }
    a { color: var(--accent-strong); text-decoration: none; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { font-size: clamp(32px, 5vw, 56px); line-height: 1.04; letter-spacing: -0.055em; margin-bottom: 16px; }
    h2 { font-size: 22px; letter-spacing: -0.02em; }
    h3 { color: var(--accent-strong); font-size: 13px; margin: 22px 0 10px; text-transform: uppercase; letter-spacing: 0.08em; }
    .hero {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      margin: 18px 0 22px;
      padding: 32px;
      border: 1px solid var(--border);
      border-radius: 30px;
      background: rgba(255, 250, 243, 0.82);
      box-shadow: 0 24px 80px var(--shadow);
    }
    .hero.compact h1 { font-size: clamp(28px, 4vw, 42px); }
    .eyebrow {
      color: var(--accent-strong);
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .top-nav, .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 14px;
    }
    .nav-actions { display: flex; align-items: center; gap: 10px; }
    .section-header.relaxed { align-items: flex-start; }
    .language-switch, .pill, button {
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #ffffffb8;
      color: var(--accent-strong);
      padding: 8px 14px;
      font: inherit;
      font-weight: 700;
      white-space: nowrap;
    }
    button {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
      cursor: pointer;
    }
    button:hover { background: var(--accent-strong); }
    .pill {
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 24px;
      background: rgba(255, 250, 243, 0.92);
      padding: 22px;
      margin-bottom: 18px;
      box-shadow: 0 12px 36px rgba(54, 39, 22, 0.06);
    }
    .focus-card { min-height: 360px; }
    .overview-grid {
      display: grid;
      grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
      gap: 18px;
    }
    .task-list, .record-grid {
      display: grid;
      gap: 14px;
    }
    .record-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .task-row {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding: 18px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: white;
      align-items: center;
    }
    .task-row:hover { border-color: #c4b5fd; transform: translateY(-1px); }
    .muted, .task-row p { color: var(--muted); margin-bottom: 0; line-height: 1.55; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    .meta-grid div {
      border-radius: 18px;
      background: white;
      border: 1px solid var(--border);
      padding: 14px;
    }
    .meta-grid span { color: var(--muted); display: block; font-size: 12px; margin-bottom: 6px; }
    .meta-grid strong { font-size: 18px; }
    pre {
      overflow: auto;
      white-space: pre-wrap;
      max-height: 520px;
      padding: 16px;
      border-radius: 18px;
      background: #211b16;
      color: #fff7ed;
      border: 1px solid #3b2f26;
      line-height: 1.5;
    }
    .plain-list, .clean-list {
      display: grid;
      gap: 9px;
      padding-left: 18px;
    }
    .clean-list {
      list-style: none;
      padding-left: 0;
    }
    .clean-list li {
      display: grid;
      gap: 6px;
      padding: 12px;
      border-radius: 16px;
      background: white;
      border: 1px solid var(--border);
    }
    .clean-list span { color: var(--muted); }
    .timeline {
      display: grid;
      gap: 12px;
      padding-left: 0;
      list-style: none;
    }
    .timeline li {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: white;
      padding: 14px;
    }
    .event-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
    }
    .event-head span {
      color: var(--accent-strong);
      font-weight: 800;
    }
    .capture-table {
      display: grid;
      gap: 8px;
      margin: 16px 0;
    }
    .health-summary, .sync-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-radius: 18px;
      padding: 14px 16px;
    }
    .health-summary { margin: 16px 0 12px; border: 1px solid var(--border); background: #fff; }
    .health-summary.healthy { border-color: #86efac; background: #f0fdf4; color: #166534; }
    .health-summary.attention { border-color: #fde68a; background: #fffbeb; color: #92400e; }
    .sync-rows { display: grid; gap: 8px; }
    .sync-row { display: grid; grid-template-columns: 1fr auto 1fr; background: white; border: 1px solid var(--border); }
    .sync-row time { color: var(--muted); text-align: right; font-size: 13px; }
    .capture-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1.4fr;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: white;
      color: var(--muted);
      font-size: 13px;
    }
    .capture-head {
      background: transparent;
      border: 0;
      padding-bottom: 0;
      font-weight: 800;
      color: var(--accent-strong);
    }
    .status-dot {
      width: fit-content;
      border-radius: 999px;
      padding: 4px 9px;
      background: #f1e8dc;
      color: var(--muted);
      font-weight: 800;
    }
    .status-dot.ok {
      background: #dcfce7;
      color: #166534;
    }
    .status-dot.bad {
      background: #fee2e2;
      color: #991b1b;
    }
    .hint-box {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    .hint-box code {
      display: block;
      padding: 10px 12px;
      border-radius: 12px;
      background: #211b16;
      color: #fff7ed;
      overflow: auto;
    }
    form {
      display: grid;
      gap: 12px;
    }
    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    input, textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: white;
      color: var(--text);
      padding: 11px 12px;
      font: inherit;
      font-weight: 500;
    }
    textarea { resize: vertical; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .mini-form {
      border: 1px solid var(--border);
      border-radius: 20px;
      background: #fffdf8;
      padding: 18px;
    }
    .mini-form h3 { margin-top: 0; }
    .inline-form {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      margin-top: 8px;
    }
    .inline-form input {
      width: 220px;
      padding: 8px 10px;
    }
    .inline-form.subtle button {
      background: transparent;
      color: var(--muted);
      border-color: var(--border);
    }
    @media (max-width: 860px) {
      .hero, .top-nav, .section-header { display: grid; }
      .overview-grid, .record-grid, .form-grid, .meta-grid { grid-template-columns: 1fr; }
      .capture-row { grid-template-columns: 1fr; }
      .inline-form { display: grid; }
    }
  </style>
  <script>
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-copy-target]");
      if (!button) return;
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;
      await navigator.clipboard.writeText(target.textContent);
      button.textContent = button.dataset.copiedText || "Copied";
      setTimeout(() => {
        button.textContent = button.dataset.copyText || "Copy";
      }, 1200);
    });
  </script>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
