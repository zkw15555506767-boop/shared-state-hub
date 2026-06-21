# 本地存储与归档

Shared State Hub 只在当前设备保存数据，不会自动同步到云端或其他电脑。

## 数据放在哪里

```text
~/Library/Application Support/Shared State Hub/
├── data/shared-state-hub.db  任务索引、事件摘要、Live State、Join Context
├── archive/                  自动捕捉事件的本地 JSONL 归档
└── assets/                   未来由用户选择保存的附件
```

SQLite 用于快速读取任务状态；原始事件信封放到本机归档，避免同一份 JSON 在数据库里重复保存。读取事件时 Hub 会重建同样的事件对象，因此不会改变任务、接力上下文或 MCP 的使用效果。

## 30 天保留规则

- 原始 JSONL 归档默认保留 30 天；
- 到期后只删除归档原文；
- SQLite 中的任务摘要、决定、阻塞、文件引用和接力上下文会继续保留；
- 不会自动上传、同步或删除你的任务索引。

## 查看与维护

在项目目录运行：

```bash
npm run storage:status  # 查看数据库、归档大小与事件数量
npm run storage:compact # 迁移旧版重复 raw JSON 到本机归档
npm run storage:prune   # 删除超过 30 天的归档原文
npm run storage:vacuum  # 回收 SQLite 已释放的磁盘空间
```

日常不需要手动运行这些命令。Hub 启动时会进行兼容迁移和过期归档清理；`vacuum` 只在需要立刻回收磁盘空间时使用。
