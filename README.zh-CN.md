<p align="right"><a href="README.md">English</a> | <strong>简体中文</strong></p>

<div align="center">
  <h1>🔄 Shared State Hub</h1>
  <p><strong>让 Codex App、Claude Code 和其他 AI Agent 接同一棒。</strong></p>
  <p>一个本地优先、可审计的 AI 工作状态中转站：自动捕捉、共享状态、按需接力。</p>
  <p>
    <img alt="macOS" src="https://img.shields.io/badge/platform-macOS-black?style=flat-square">
    <img alt="本地优先" src="https://img.shields.io/badge/storage-local--first-0f766e?style=flat-square">
    <img alt="MCP" src="https://img.shields.io/badge/protocol-MCP-7c3aed?style=flat-square">
    <img alt="Node.js 20+" src="https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square">
  </p>
</div>

![Shared State Hub 概览](docs/assets/cross-agent-handoff-overview.jpg)

Shared State Hub 不是 Agent 启动器，也不是云端聊天记录仓库。它是本地状态中转站：Codex App 与 Claude Code 读写同一份追加式事件记录、实时状态与精简接力上下文。

## 🌟 为什么是 Shared State，而不只是 Memory？

当每个人身边都有多个本地 Agent，真正决定工作产出上限的，不是拥有多少模型，而是它们能否无缝协作。

现在多数产品在做“记忆框架”或“记忆共享”——它们更像回顾过去：记住偏好、总结历史，却很难让 Agent 实时接上正在发生的工作。

Codex 不知道 Claude Code 刚刚处理了什么；另一个 Agent 不知道你上传了哪些文件、代码 Diff 到了哪里、什么决策已经做过、哪个步骤正被占用。每次切换，都在重复解释上下文。

**Shared State Hub 想解决的不是“记住”，而是“接力”。** 它把任务状态、上下文引用、文件变更、决策、阻塞点和下一步变成一个本地、可审计、实时更新的共享状态层。一个 Agent 停下，另一个 Agent 可以立刻从正确的位置继续。

> 用完你的用你的，爽之！⚡

### 📌 接下来

- 🧩 接入更多 Agent 与本地工具
- 🕸️ 自动识别本机 Agent、项目与会话，并推荐正确的共享任务
- 🔄 让 Agent 基于可验证的状态持续协作，而不是只依赖长对话记忆

少重复一次上下文，多完成一段真实工作。

```text
Codex App 会话日志      Claude Code 会话日志      MCP 工具
          │                       │                    │
          └──────────────┬────────┴──────────────┬─────┘
                         ▼                       ▼
                    标准化 Hub 事件      用户补充记录
                         │
                         ▼
                SQLite 追加式事件记录
                         │
                         ▼
                实时状态 + 接力上下文
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   本地 Web 管理页                      MCP 读取接口
```

## ✨ 你能得到什么？

| 以前 | 使用 Shared State Hub 后 |
| --- | --- |
| 每个 Agent 各自带着碎片上下文开始工作 | 一份共享的任务状态、决策、阻塞点与下一步 |
| 从 Codex 切到 Claude 时需要重复解释 | Claude 读取精简接力上下文后直接继续 |
| 会话历史埋在不同产品的日志里 | 重要工作变为可查看的本地事件和派生视图 |
| 自动捕捉难以信任 | 本地 SQLite、默认脱敏摘要、用户可见历史 |

## 功能

- **本地优先**：事件保存到本地 SQLite。
- **MCP 服务**：Agent 可通过 MCP 读写任务状态。
- **Codex App watcher**：尽力从本地 Codex 会话 JSONL 日志捕捉输入、状态和工具调用。
- **Claude Code watcher**：尽力从本地 Claude Code 会话日志捕捉输入、状态和工具结果。
- **中英文 Web UI**：默认中文，可通过 `?lang=en` 查看英文。
- **追加式控制模型**：修正和隐藏也是事件，不会悄悄改写历史。
- **隐私默认值**：默认只保存摘要，并脱敏疑似密钥与截断过长内容。

## 🎨 产品展示

### 1. 跨 Agent 接力，而不是另一个聊天孤岛

Codex App、Claude Code 与其他支持 MCP 的工具可把 Hub 当作共享检查点。首个版本自动捕捉 Codex App 与 Claude Code；其他 MCP 客户端可通过同一任务状态 API 加入。

### 2. 一眼确认连接器是否正在工作

![Shared State Hub 同步状态与自动捕捉面板](docs/assets/dashboard-sync-status.jpg)

仪表盘显示任务进度、连接器健康度、最近活动与最近捕捉时间，不需要记住 watcher 命令。

### 3. 在真实工作流里验证接力

![Claude Code 读取 Codex 的 Shared State Hub 上下文](docs/assets/codex-claude-handoff-proof.jpg)

工作从一个 Agent 交给另一个时，接手方读取精简接力上下文，而不是重新回放整段聊天记录。

### 4. 保留可审计的时间线

![Shared State Hub 事件时间线](docs/assets/auditable-event-timeline.jpg)

每条自动捕捉或主动写入的更新都会成为追加式事件。用户可以查看、补充或从未来接力中隐藏信息，而不是静默改写历史。

## 5 分钟开始使用

首个版本面向 **macOS**，需要 Node.js 20+、`sqlite3`、Codex App；想体验双向接力时还需要 Claude Code。

```bash
git clone https://github.com/zkw15555506767-boop/shared-state-hub.git
cd shared-state-hub
npm install
npm run setup
```

安装器会先预览将做的操作。确认后，它会备份原有设置、连接 Codex App 与 Claude Code，并启动本地后台服务。之后可以关闭终端。

打开：

```text
http://127.0.0.1:43177/
```

完整的中文新手体验请看 [5 分钟快速上手](docs/quickstart.md)。

## 在 Codex App 与 Claude Code 中怎么用？

安装完成后，直接像平时一样使用任意一个 Agent。本地 watcher 会自动把新的用户输入、会话活动和支持的工具事件写进 Hub，**不需要**每次都说“请记录这件事”。

当你在 Codex App 或 Claude Code 中开始新任务、或接着别的 Agent 的工作时，只需要发这一句：

```text
开始工作前，请使用 Shared State Hub 读取当前任务和最新接力上下文。告诉我上一位 Agent 做到哪里，再从那里继续。
```

它会让接手的 Agent 读取一份精简、相关的检查点，而不是把上一段完整聊天全部塞进上下文。同一句话同时适用于 Codex App 和 Claude Code。

> 自动捕捉负责把活动**写入** Hub；开始工作的这句话负责让下一个 Agent 从 Hub **读取**最新检查点。

## 日常使用

- 正常在 Codex App 或 Claude Code 中工作；
- 开始或继续工作时，说“请读取 Shared State Hub 的接力上下文并继续”；
- 查看进度时打开本地网页；
- 需要补充或隐藏记录时，进入任务页的“设置与诊断”。

## 它如何工作？

Hub 将多种来源标准化为同一条事件流：

| 来源 | 机制 | 捕捉内容 |
| --- | --- | --- |
| Codex App | `~/.codex/sessions` 下的本地 JSONL watcher | 用户输入、助手状态、工具调用 |
| Claude Code | `~/.claude/projects` 下的本地 JSONL watcher | 用户输入、助手更新、工具结果 |
| MCP 客户端 | stdio MCP 服务 | 显式任务更新、决策、占用、坑点 |
| Web UI | 本地 HTTP 表单 | 人工补充进展、上下文、决策与产物 |

这些事件会生成：

- **Event Log**：追加式历史记录；
- **Live State**：当前任务、Agent、占用、提醒和下一步；
- **Join Context**：给接手 Agent 的限额摘要。

## 常用命令

```bash
npm run app:status    # 查看后台服务状态
npm run app:open      # 打开 Hub 网页
npm run app:stop      # 暂停后台服务，数据仍保留
npm run app:uninstall # 移除 Hub 自己的配置与服务
```

## 隐私与限制

- 默认 `HUB_CAPTURE_MODE=summary`，只保存脱敏后的简短摘要。
- API Key、Token、Authorization 等疑似敏感信息会被脱敏。
- Codex App 与 Claude Code 的自动捕捉依赖本地会话日志格式，属于尽力而为的连接器。
- Web UI 仅面向本机，当前没有多人同步或云端后端。

开发者 API、测试命令与完整英文技术说明请查看 [English README](README.md)。
