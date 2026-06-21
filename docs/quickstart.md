# 5 分钟快速上手

这份指南只做一件事：让你把 **Codex App 的工作交给 Claude Code 继续做**。不需要了解 MCP、Watcher 或数据库。

## 开始前

目前首个版本面向 **macOS**。你的电脑需要：

- Node.js 20 或更高版本；
- `sqlite3`（macOS 通常已自带）；
- 已安装 Codex App，以及 Claude Code（想体验两者接力时需要）。

## 第一次安装：复制这四行

打开 macOS 的“终端”，依次复制执行：

```bash
git clone https://github.com/zkw15555506767-boop/shared-state-hub.git
cd shared-state-hub
npm install
npm run setup
```

最后一行会告诉你将要做哪些设置。输入 `y` 后，它会：

- 连接 Codex App 与 Claude Code；
- 启动本地后台服务；
- 自动开始监听两边之后产生的新会话；
- 备份原有设置，不覆盖你原来配置的其他 MCP。

安装完成后，**可以关闭终端**。Hub 会在登录 macOS 后自动运行。

> 如果你已经下载了本项目，也可以在项目目录直接执行 `npm run setup`。

## 确认安装成功

在浏览器打开：

```text
http://127.0.0.1:43177/
```

你会看到 Shared State Hub 页面。只要 **Codex App** 和 **Claude Code** 显示为 `running`、`captured` 或刚刚有活动时间，就表示自动同步已启动。

如果你刚完成安装，请：

1. 退出并重新打开 Codex App；
2. 新开一个 Claude Code 会话。

这样两个工具都会加载新安装的 MCP 连接。

## 试一次真实接力

### 1. 先在 Codex App 里说

新开一个任务后，把下面这句话发给 Codex：

```text
请使用 Shared State Hub 创建或更新一个任务，任务名是“快速接力测试”。记录：我已在 Codex 完成第一步；下一步请 Claude Code 查看接力上下文后继续。
```

等待 Codex 回复完成。刷新 Hub 网页后，你应该能看到新的任务或最近活动。

### 2. 再在 Claude Code 里说

打开 Claude Code，把下面这句话发给它：

```text
请使用 Shared State Hub 查看“快速接力测试”的接力上下文。告诉我 Codex 已经做到哪里，然后继续完成下一步。
```

如果 Claude Code 能复述 Codex 的进展并继续工作，接力就成功了。🎉

## 日常使用

之后不需要再运行安装命令：

- 在 Codex App 或 Claude Code 中正常工作；
- 要交接时说“请读取 Shared State Hub 的接力上下文并继续”；
- 想查看进度时打开 `http://127.0.0.1:43177/`；
- 需要补充或隐藏某条记录时，进入任务页的“设置与诊断”。

## 遇到问题？

先在项目目录运行：

```bash
npm run app:status
```

如果网页打不开，重新执行：

```bash
npm run setup
```

这会更新 Hub 自己的后台服务与连接配置，原有其他 MCP 设置不会被删除。

## 高级操作（暂时可以跳过）

```bash
npm run app:open       # 打开 Hub 网页
npm run app:stop       # 暂停后台服务，数据仍保留
npm run app:uninstall  # 移除 Hub 自己的配置和服务
```

开发与测试命令请看 [README](../README.md)。
