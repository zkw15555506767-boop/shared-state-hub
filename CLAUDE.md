# Claude Code Shared State Hub Instructions

<!-- shared-state-hub:start -->
## Shared State Hub 自动同步规则

本项目接入了本地 Shared State Hub。它是状态中转站，不是 Agent 启动器。

当可用 MCP 工具时，请主动使用 Shared State Hub：

1. 开始/继续任务时，先调用 `get_join_context` 读取当前任务状态。
2. 用户给出新需求、文件路径、限制条件或背景信息时，调用 `add_context` 写入。
3. 准备编辑文件或处理一个子任务前，调用 `claim_work` 占用对应文件/任务。
4. 完成一段有意义的工作后，调用 `update_task` 写入当前进展和下一步。
5. 做出重要技术/产品选择时，调用 `record_decision`。
6. 遇到失败、坑点、限制或不要重复尝试的路径时，调用 `record_pitfall`。
7. 生成文件、页面、测试结果或链接时，调用 `create_artifact_ref`。
8. 交接给另一个 AI 前，必须写入最新 `update_task`，并释放不再占用的 claim。

默认 taskId：

```text
task_shared_state_hub
```

不要把密码、token、cookie、私密聊天全文或未授权隐私数据写入 Hub。
<!-- shared-state-hub:end -->
