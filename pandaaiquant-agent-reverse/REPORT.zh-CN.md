# PandaAI（pandaaiquant.com）Agent 工作流逆向报告

> 目标：`https://www.pandaaiquant.com/`
> 方法：REA 6.8.0（Reverse Engineer Anything）+ 公开静态资产 + 公开文档
> 范围：未登录可访问的页面、公开静态 JS、公开文档；**未绕过登录/付费墙，未调用 `/pandaApi` 业务接口，未抓取付费数据**
> 日期：2026-10-27
> 工作目录：`/home/duansx/Desktop/pandaaiquant-rea`

---

## 0. 结论摘要

1. **主站是 Nuxt SSR 应用**，统一走 `/pandaApi` 网关；登录态同时使用 `token`（localStorage/sessionStorage）、`auth_token`（cookie）和 `Authorization` 头。
2. **Qube 不是主站的一个页面，而是挂在 `/agent_quant/` 的独立 React Router 7 应用**。未登录时访问 `/agent_quant/` 会跳到 `/login?redirect=...`；公开的 App Shell 只包含 `root` 与 `index-redirect` 两个路由，`index-redirect` 再指向 `/chat`。真正的 `/chat` 路由在登录后才下发，我没有绕过。
3. **Qube 的 Agent 是“会话 + run + 可恢复事件流 + 审批 + 产物/版本”的模型**。公开的 `chat-api` 已还原出 run 创建、取消、重试、编辑重发、反馈、产物、5 类审批和会话管理的完整 REST 契约。
4. **Qube 前端 i18n 中暴露了 101 个 Agent 工具名和 47 个能力名**，覆盖策略生成/回测/优化/版本、因子生成/分析/优化/版本、A股/期货/基金/港美股数据、QuantSkill、仿真账户、聚宽/PTrade/QMT 转写等。
5. **QuantFlow 是另一套“代码工作流”应用**：Vue 3 + Vue Router + Monaco + `marimo-iframe` 画布/Notebook。它的 Agent 走 `/pandaApi/quantflow/api/workflow-graph/stream`，把自然语言生成/修改 workflow JSON 图，再同步到画布和 Notebook，最后运行工作流并轮询日志。
6. **QuantFlow 的图生成协议已还原到阶段机级别**：`architect → workflow_init → workflow_layout → workflow_generating → code_merged → workflow_structure_complete → result → workflow_complete_success → END`，并带 `workflow_json`、`workflow_progress`、`revision_id`、`content_hash`、`node_desc_map` 等字段。
7. **EVO / A2A 目前只有公开文档**：EVO 是云端持久化工作站 + 自研 Harness；A2A 是多 Agent 协作设计，文档标注“即将上线”。两者都需要登录，未做实现层逆向。

---

## 1. 合规边界

本次只做了以下事情：

- 读取 `robots.txt`、`sitemap.xml`、公开页面 HTML。
- 读取公开静态 JS/CSS 资产（`/_nuxt/*`、`/agent_quant/assets/*`、`/quantflow/assets/*`）。
- 用无登录的 Chromium 打开公开文档页，做被动 CDP 观测。
- 读取公开文档正文。
- 对所有证据做本地静态分析。

没有做以下事情：

- 没有登录、没有注册、没有使用他人账号。
- 没有调用 `/pandaApi/`、`/wxapi/`、`/vivisorApi/`、`/ipayApi/`、`/front/` 等 robots 禁止的业务接口。
- 没有尝试绕过 Qube 的 `/chat` 登录路由。
- 没有抓取付费数据、没有调用 MCP 数据服务、没有使用任何密钥。
- 没有复制或再分发受版权保护的源代码/素材；报告只总结接口、字段、状态机和产品流程。

> 结论性质：接口/字段/阶段名属于**公开客户端代码中的可观测事实**；后端编排、数据库结构、提示词、模型路由属于**推断或未知**，报告中已分别标注。

---

## 2. 资产地图与技术栈

| 资产 | 入口 | 技术栈 | 公开程度 | 本次观察 |
|---|---|---|---|---|
| 主站 | `https://www.pandaaiquant.com/` | Nuxt（SSR），`x-powered-by: Nuxt`，构建版本 `2026.6.4.5`，buildId `c4bfbc8c-2938-404d-91cb-f4a93425a3aa` | 公开 | 文档应用路由视图 54 条（共享主站 bundle）；统一 `/pandaApi` 客户端 |
| Qube | `/agent_quant/` | React + React Router 7（Remix 风格 SSR）+ TanStack Query + Base UI/Radix + i18next | App Shell 公开，`/chat` 登录后 | 40 个公开 chunk，约 1.36 MB；`chat-api` 8.6 KB |
| QuantFlow | `/quantflow/` | Vue 3 + Vue Router + Element Plus + Monaco + `marimo-iframe` + Vite | 公开 | 173 个公开资源，约 18.3 MB；工作流编辑器路由 `/workflow/editor` |
| EVO | `/evo` | 入口门页 + 登录后云端工作站 | 门页公开，工作站登录 | 门页 `noindex`，只做了文档层分析 |
| 数据服务 | `/data-service`、`/docs/api` | `panda_data` Python SDK + MCP | 文档公开，数据需账号/订阅 | 未调用任何数据接口 |
| 公开文档 | `/docs/*` | 主站 Nuxt 文档站 | 公开 | 抓取 20+ 篇 Qube/EVO/A2A/策略文档 |

### 2.1 主站路由与外部应用边界

主站路由表里可以看到 `/agent_quant`、`/evo`、`/quantflow`、`/factorhub/fourthFactorCompetition`、`/contest` 被排除在 SPA 内部导航之外：

```js
/^\/(agent_quant|evo|quantflow|factorhub\/fourthFactorCompetition|contest)(\/|$)/
```

也就是说，这些路径是**独立应用**，不是主站 Nuxt 路由的一部分。主站登录跳转逻辑又会专门处理 `/agent_quant` 与 `/evo` 的回跳，说明它们是主站 SSO 的下游应用。

主站公开配置里还出现了：

- `version: "2026.6.4.5"`
- `conversationalPocUrl: ""`（回退到 `/agent_quant/`）
- `workflowUrl: ""`（回退到主站根）
- `traceEndpoint: "http://192.168.1.3:8300/api/trace/collect"`（疑似开发环境遗留的本地 trace 地址）

最后一条是公开 HTML 中的配置，不代表生产后端；报告中只作为观察记录。

---

## 3. Qube Agent 工作流

### 3.1 产品链路（公开文档）

Qube 文档把研究链路分成三条：

| 链路 | 流程 | 涉及模块 |
|---|---|---|
| 策略研究 | 需求 → 代码 → 回测 → 版本 → 调优 → 沉淀 | 对话工作台、策略库、运行历史、调优任务 |
| 因子研究 | 因子构建 → 因子分析 → 因子选股 → 回测复验 | 对话工作台、因子库、策略库、运行历史 |
| 能力复用与行情 | 标准化分析能力复用、实时行情 | 技能库、Qube 行情 |

对话工作台负责“从 0 到 1”的生成与验证；长期沉淀交给策略库/因子库/运行历史/调优任务/仿真盘。这个产品分工与前端代码中的模块命名（`strategyLibrary`、`factorLibrary`、`strategyRun`、`optimization`、`simulationAccount`）能对应上。

### 3.2 入口与鉴权

未登录访问：

```text
GET /agent_quant/  -> 200 App Shell
  -> 客户端跳转 /login?redirect=https://www.pandaaiquant.com/agent_quant/
  -> 登录成功后回到 /agent_quant/
  -> index-redirect 路由跳转 /chat
```

公开 JSON 中的路由 manifest 只包含：

- `root`
- `routes/index-redirect`（源码：`<Navigate to="/chat" replace />` 等价逻辑）

这说明 `/chat` 路由不在未登录的公开 manifest 中，而是在登录后才下发/渲染。我没有尝试构造登录态去拿 `/chat` chunk。

Qube 前端自己暴露的鉴权文案：

- `auth.checking`: "Checking authentication"
- `auth.requiredTitle`: "Main-site authentication required"
- `auth.requiredDescription`: "Open Qube from the main site so the Java gateway can inject your token…"
- `auth.goToMainSite`: "Return to main site"
- `auth.gateway`: "Java gateway"

公开代码中可见的鉴权路径：

```text
GET /pandaApi/agent_quant/api/auth/me
login URL: /login
token storage: localStorage/sessionStorage key "token"
main site cookie: auth_token
headers: Authorization: <token>
```

结论：Qube 使用主站 SSO + Java 网关注入 token 的模式；Qube 自己不做账号密码登录。这个设计也解释了为什么 `/agent_quant/` 未登录会回主站 `/login`。

### 3.3 会话 / Run 生命周期（公开契约）

Qube 的 `chat-api` 已经把 REST 契约暴露得很完整。所有路径都相对于 `/pandaApi/agent_quant`，所以完整地址是 `/pandaApi/agent_quant/api/chat/...`。

核心生命周期：

```text
创建会话
  POST /api/chat/conversations
  -> conversation_id

读取历史
  GET /api/chat/conversations/{conversation_id}/messages?limit=&before_sequence=
  -> messages[]（每条 message 含 parts[]）

发起一次 Agent 运行
  POST /api/chat/runs
  body:
    input
    model
    reasoning_effort
    approval_mode            // 默认 "auto"
    active_strategy_id
    active_strategy_dirty    // 默认 false
    active_factor_id
    active_factor_dirty      // 默认 false
    active_simulation_account_id
    quant_skill_id?          // resend 显式带；create run 由 ...t 透传
  -> run_id

运行中
  客户端消费有序事件（sequence）
  事件携带 mutations:
    { op: "create", part: { part_id, category: "text"|"activity"|"card", ... } }
    { op: "append", part_id, field: "content", delta }
    { op: "patch", part_id, patch }
  事件携带 redis_stream_id，用于断线续传
  终止事件:
    run.completed
    run.failed
    run.cancelled

运行结束
  parts 中 status=running 的项被折叠为 completed/failed/cancelled
  写入 end_sequence / finished_at
```

客户端还保存：

- `lastSequence`
- `lastRedisId`
- 服务端投影字段 `last_projected_sequence`、`last_projected_redis_id`

这三个字段说明 Qube 的 run 事件是**可恢复的**：刷新/重连后可以从最后序号继续，而不是只能重新生成。

> 说明：公开壳只包含事件折叠器（`chat-api`）与 UI 文案，真正的传输层在登录后的 `/chat` 路由中；我没有抓取该路由，因此不能断言它是 SSE、WebSocket 还是 fetch-stream。可以确定的是“有序事件 + Redis stream ID + 断线重连”的语义。

### 3.4 Run 控制

| 操作 | 方法/路径 | 关键字段 |
|---|---|---|
| 创建 run | `POST /api/chat/runs` | `input`、`model`、`reasoning_effort`、`approval_mode`、活动策略/因子/仿真账户 |
| 重试 run | `POST /api/chat/runs/{run_id}/retry` | `model`、`reasoning_effort`、`approval_mode` |
| 取消 run | `POST /api/chat/runs/{run_id}/cancel` | — |
| 编辑后重发 | `POST /api/chat/messages/{message_id}/resend` | `input`、`model`、`reasoning_effort`、`approval_mode`、活动策略/因子/仿真账户、`quant_skill_id` |
| 反馈 | `PUT /api/chat/messages/{message_id}/feedback` | `feedback` |
| 完成已读 | `POST /api/chat/conversations/{conversation_id}/completion/read` | 可选 `run_id` |
| 失败已读 | `POST /api/chat/conversations/{conversation_id}/failure/read` | 可选 `run_id` |

### 3.5 审批模型

`approval_mode` 只有两种 UI 语义：

- `auto`：自动执行（文档称“自动”）
- `approve`：关键节点等待确认（文档称“批准”）

审批不是一种，而是五类：

| 审批类型 | 读取草稿/详情 | 提交决定 | 说明 |
|---|---|---|---|
| 策略创建 | `GET /api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/draft` | `POST .../resolve` | 决定时可附带回测参数 |
| 策略回测 | — | `POST /api/chat/runs/{run_id}/strategy-run-approvals/{approval_id}/resolve` | 决定是否运行回测 |
| 策略变更 | `GET /api/chat/runs/{run_id}/strategy-mutation-approvals/{approval_id}/detail` | `POST .../resolve` | approve 时可带 `name`、`description`、`backtest` |
| 策略版本 | `GET /api/chat/runs/{run_id}/strategy-version-approvals/{approval_id}/detail` | `POST .../resolve` | approve 时可带版本 `name` |
| 因子创建 | `GET /api/chat/runs/{run_id}/factor-create-approvals/{approval_id}/draft` | `POST .../resolve` | 决定是否创建因子 |

前端 i18n 还暴露了这些审批状态：

- 策略创建/回测：`pending`、`approving`、`approved`、`cancelled`、`failed`
- 策略变更：`updated`、`deleted`、`cancelled`、`failed`
- 策略版本：`pending`、`creating`、`created`、`renaming`、`renamed`、`deleting`、`deleted`、`restoring`、`restored`、`cancelled`、`failed`
- 因子审批：`run`、`update`、`delete`、`versionCreate`、`versionRename`、`versionDelete`、`versionRestore` 等

这比“自动/批准”两个按钮复杂得多：**审批是 run 内部的领域事件**，不是简单的请求前确认。

### 3.6 产物、版本与回测/因子/调优/仿真

Qube 的产物模型（公开代码）：

```text
GET    /api/chat/conversations/{conversation_id}/artifacts
POST   /api/chat/conversations/{conversation_id}/artifacts
DELETE /api/chat/conversations/{conversation_id}/artifacts/{artifact_type}/{artifact_id}
GET    /api/strategy-drafts/{draft_id}
```

`artifact_type` 至少覆盖策略与因子；`strategy-drafts` 用于策略创建审批的草稿读取。

文档层的完整链路：

1. **策略生成**：自然语言 → 代码 → 语法/接口校验 → 回测 → 结果四步读（核心指标 → 净值曲线 → 持仓与标的 → 交易时间线）。
2. **版本**：每次有效改动保存为独立版本，区分人工修改与系统优化，可回退/对比。
3. **AI 优化 vs 参数调优**：
   - AI 优化：改逻辑，生成一个新版本并重跑。
   - 参数调优：搜索参数组合，生成调优任务，结果在调优任务页查看。
4. **因子研究**：因子生成 → IC/Rank IC/ICIR/分层收益 → 因子版本 → 建选股策略/期货策略 → 回测复验。
5. **仿真盘**：绑定已保存的策略版本，用实时行情 + 虚拟资金模拟撮合；检验信号触发、报单成交、持仓与资金占用。

前端 i18n 中的因子分析阶段（可直接对应后端任务进度）：

```text
task_start → factor_build → market_data → clean → returns
→ grouping → analysis → summary → complete
```

对应中文/英文标签：任务排队、构建因子、对齐行情、清洗标准化、计算收益、因子分组、收益与 IC、汇总图表、分析完成。

### 3.7 Agent 工具与能力（101 / 47）

公开前端 i18n 中有两组注册表：

- `activityNames.tools`：101 个工具名
- `activityNames.capabilities`：47 个能力名

它们是客户端渲染“处理过程”时使用的动作名，**不等同于后端全部工具目录**，但足以还原 Qube Agent 的能力边界。

工具按领域分组（完整列表见附录 A）：

| 领域 | 代表工具 |
|---|---|
| 策略生成/草稿 | `generateCnStockStrategy`、`createCnStockStrategyDraft`、`validateCnStockStrategyDraft`、`applyCnStockStrategyPatch`、`generateCnEtfStrategy`、`generateFutureStrategy`、`generateHkStrategy`、`generateUsStrategy` |
| 策略回测/历史 | `runCnStockStrategyBacktest`、`runStrategyBacktest`、`getStrategyBacktestResult`、`listStrategyBacktestHistory`、`cancelStrategyBacktests` |
| 策略版本 | `listStrategyVersions`、`createStrategyVersion`、`renameStrategyVersion`、`deleteStrategyVersion`、`restoreStrategyVersion` |
| 策略优化/调参 | `optimizeCurrentStrategy`、`getStrategyOptimizationContext`、`generateStrategyParameterCandidates`、`createStrategyParameterTuning`、`getStrategyParameterTuning`、`listParameterTuningTasks` |
| 因子生成/分析 | `generateCnStockFactor`、`generateFutureFactor`、`createFactorDraft`、`validateFactorDraft`、`runFactorAnalysis`、`getFactorAnalysisResult`、`optimizeCurrentFactor` |
| 因子版本 | `listFactorVersions`、`createFactorVersion`、`renameFactorVersion`、`deleteFactorVersion`、`restoreFactorVersion` |
| 数据查询 | `queryCnStockData`、`queryCnFutureData`、`queryCnFundData`、`queryHkData`、`queryUsData`、`resolveDataAsset`、`getDataMethodDocumentation`、`searchTools` |
| QuantSkill | `searchQuantSkills`、`readQuantSkillFile`、`writeQuantSkillFile`、`runQuantSkill` |
| 仿真账户 | `listSimulationAccounts`、`requestSimulationAccountSelection`、`createSimulationAccount`、`editSimulationAccount`、`deleteSimulationAccount` |
| 策略转写 | `transcribeStrategy`（聚宽/PTrade/QMT） |
| 研究/库 | `listRecentResearchRuns`、`listStrategies`、`listFactors`、`getFactor`、`requestFactorSelection`、`requestStrategySelection` |

47 个能力名（完整列表见附录 B）更像“Agent 可加载的能力包”，例如：

- `strategyLibrary`、`strategyRun`、`strategyManage`、`strategyOptimize`、`strategyParameterTuning`
- `strategyCuratedTemplate`、`strategyCuratedTemplateReferenceGenerate`
- `factorLibrary`、`factorRun`、`factorManage`、`factorOptimize`、`factorVersion`
- `dataCnStock`、`dataCnFuture`、`dataCnFund`、`dataHk`、`dataUs`
- `quantSkills`、`transcription`
- `simulationAccount`
- A股/期货/ETF/港美股策略与因子的 `authoring` / `codegen` 能力

### 3.8 UI 交互与状态

输入栏（公开 i18n）：

- 模型选择（`GET /api/chat/models`，模型列表由服务端返回）
- 思考力度：`none / minimal / low / medium / high / xhigh / max`
- 操作权限：`auto`（自动）/ `approve`（批准）
- 斜杠唤起 QuantSkill
- 发送/停止生成

处理过程（activity）：

- `thinking`、`capabilityLoad`、`toolCall`、`subagent`、`delegation`、`retry`
- `activityActionsSummary`: "Performed {{count}} actions: {{actions}}"
- `activityStageRunning`: "In progress: {{event}}"

连接状态：

- `streamFailed`: "Live response connection failed"
- `connection.retrying`: "The live connection was interrupted. Reconnecting ({{attempt}}/{{total}})…"
- `connection.recovered`: "Live connection restored"
- `connection.failed`: "We couldn't restore the live connection. Please refresh…"

这进一步确认 Qube 的 run 是**长连接/可恢复流**，而不是一次性 HTTP 响应。

### 3.9 安全观察（不构成利用）

- Qube 前端把 `token` 放在 localStorage/sessionStorage；主站还使用 `auth_token` cookie。任何 XSS 都会直接触及会话。
- `Authorization` 头直接拼接 token，没有看到额外的客户端签名/HMAC。
- 审批接口以 `run_id + approval_id` 定位；如果后端只靠前端传参而不校验 run 归属，会有 IDOR 风险。本次没有做任何越权测试，只记录客户端契约。
- `/pandaApi/agent_quant/api/auth/me` 返回用户信息；Qube 依赖主站 Java 网关注入 token。这个链路的安全性主要取决于网关与 cookie 策略。

### 3.10 Qube 未验证部分

- `/chat` 路由的完整 UI/传输层（登录后才下发）。
- 后端 run 编排、工具调度、提示词、模型路由、Redis 事件结构。
- 实际模型列表与算力扣减规则。
- 审批的 `decision` 完整枚举（代码只显式处理 `approve`；`reject` 由状态文案推断）。
- 数据接口与 MCP 服务（需要账号/订阅，未调用）。

---

## 4. QuantFlow 代码 / Agent 工作流

### 4.1 应用结构

QuantFlow 是独立 Vue 3 应用，入口 `/quantflow/`，构建产物在 `/quantflow/assets/`。公开路由包括：

```text
/workflow/editor       工作流编辑器（核心）
/workflow/official     官方模板
/workflow/subscribed   已订阅模板
/workflow/created      我创建的
/creator               策略创建器
/creator/list
/creator/created
/creator/edit/:id
/charts
/chatpro
/upload
/pay /new-pay /tqx-pay /tqx-pay-cancel /tqx-pay-success
/debug/api-logs
```

工作流编辑器由以下几层组成：

1. **画布**：节点/边、分组、拖拽、缩放、运行按钮。
2. **Monaco 编辑器**：节点代码编辑。
3. **Notebook iframe**：类名为 `iframe.marimo-iframe`，与画布做双向同步。
4. **AI 助手侧栏**：自然语言生成/修改工作流、代码修复、因子/回测/技能助手。
5. **运行面板**：运行状态、日志、输出、历史。

### 4.2 图生成阶段机（核心发现）

QuantFlow 的“AI 生成工作流”走：

```text
POST /pandaApi/quantflow/api/workflow-graph/stream
Headers:
  Content-Type: application/json
  uid: <localStorage.userid>
  Authorization: <localStorage.token>
Body:
  model                    // "PandaAI-CQ2" / "PandaAI-CQ1"
  message                  // 用户自然语言
  workflow_session_id?     // 续聊/续生成
  base_workflow_id?        // 基于已有工作流
  existing_workflow?       // 当前画布序列化结果
```

响应是 SSE（`fetch` + `ReadableStream` + `TextDecoder`，按 `data: {json}` 解析），事件字段：

```text
stage / type:
  architect
  workflow_init
  workflow_layout
  workflow_generating
  code_merged
  workflow_structure_complete
  result
  workflow_complete_success
  END

data:
  workflow_json            // 当前完整/增量工作流图
  workflow_progress        // 0..1
  node_desc_map            // 节点 uuid -> 描述/耗时
  revision_id              // 版本
  content_hash             // 内容哈希
  total_time
  workflow_session_id
  action                   // 例如 "run_workflow"
  workflow_run_id
  workflow_id

顶层:
  content                  // 文本增量（用于聊天）
  error
```

阶段语义（按代码中的处理）：

| 阶段 | 作用 |
|---|---|
| `architect` | 理解需求、拆解工作流结构 |
| `workflow_init` | 初始化节点集合，前端建立 `workflowData.nodes`（`waiting` 状态） |
| `workflow_layout` | 布局/连线 |
| `workflow_generating` | 生成节点内容/代码 |
| `code_merged` | 合并代码 |
| `workflow_structure_complete` | 结构完成 |
| `result` | 结果文本/摘要 |
| `workflow_complete_success` | 成功完成，进度置 1 |
| `END` | 收尾：总耗时、revision、content_hash、最终 `workflow_json` 同步到画布/Notebook |

`workflow_json` 会通过 `window.setWorkflowDataFromSSE` 同步到画布；`workflow_progress=1` 时执行最终同步，并调用 `editorSyncWorkflowToNotebook` 把节点同步到 Notebook。

### 4.3 版本 / 会话 / checkpoint

QuantFlow 把一次 AI 生成的结果做成可回滚的 revision：

```text
POST /pandaApi/quantflow/api/workflow-graph/sessions/bind-workflow
GET  /pandaApi/quantflow/api/workflow-graph/sessions/list
GET  /pandaApi/quantflow/api/workflow-graph/sessions/query
POST /pandaApi/quantflow/api/workflow-graph/sessions/checkpoint
```

前端在消息中保存：

- `revisionId`
- `contentHash`
- `workflowSessionId`
- `workflowData`（progress、nodes、endMessage、totalTime）

当用户点击历史版本标签时，会用 `session_id + revision_id` 拉取 checkpoint 的 `workflow_json`，恢复到画布。内容哈希用于判断当前画布是否与该版本一致。

### 4.4 节点系统与代码同步

节点目录由服务端驱动，前端只负责注册/渲染。公开代码中的节点模型：

```text
node = {
  type / nodeType,
  name,
  display_name,
  group_name,
  plugin_source,          // "CUSTOM" / "subscribed" / ...
  raw_data: {
    inputSchema,          // JSON Schema
    outputSchema,
    type,
    nodeType,
    inputSchemaKey
  },
  box_color,
  properties: {
    custom_code,
    ...
  }
}
```

关键行为：

- `registerCustomNodeWithSchema(name, schema)`：用 `input_schema` / `output_schema` 注册自定义节点。
- `ensureCustomNodeRegistered(name, title)`：缺失时用空 schema 兜底注册。
- `parseAndValidateNodeCode(code, cellName, workflowName)`：
  - 调用 `POST /api/notebook/cell/parse-and-validate`（`basePath: app_api`）
  - 返回 `valid`、`errors`、`plugin_type` / `class_name`、`display_name`、`group_name`、`input_schema`、`output_schema`
  - 通过后注册节点并创建到画布
- `POST /api/notebook/node-source/batch`：批量获取节点源码。
- 节点源码写入 `properties.custom_code`，并触发画布重绘。

Notebook 同步协议（`window.postMessage`）：

```text
PANDA_GRAPH_NODE_IDS_QUERY / PANDA_GRAPH_NODE_IDS_REPLY
PANDA_NOTEBOOK_FULL_SYNC_REQUEST
PANDA_DRAG_START / PANDA_DRAG_MOVE / PANDA_DRAG_END
PANDA_DROP_SUCCESS / PANDA_DROP_FAILED
PANDA_UPDATE_CELL_CODE
PANDA_NODE_APPLY
PANDA_NODES_SOURCE_CODE_RESPONSE
PANDA_RUN_WORKFLOW
```

这说明画布节点与 Notebook cell 是**一一映射**的：拖拽节点会创建 cell，修改 cell 会回写节点 `custom_code`，AI 生成节点会同步到 Notebook，Notebook 里也可以触发 `PANDA_RUN_WORKFLOW` 运行整张图。

### 4.5 工作流运行 / 日志 / 输出

运行相关端点：

```text
POST   /api/workflow/run_with_store          // 启动运行（带存储）
GET    /api/workflow/run                     // 查询运行状态（workflow_run_id + last_log_id）
GET    /api/workflow/run/log                 // 拉取日志（workflow_run_id + last_sequence + log_level + work_node_id）
POST   /api/workflow/run/terminate_with_store// 终止运行
GET    /api/workflow/run/snapshot            // 运行快照
GET    /api/workflow/run/output?output_obj_id=...
GET    /pandaApi/quantflow/api/workflow/run/list
POST   /api/workflow/save
GET    /api/workflow/query?workflow_id=
GET    /api/workflow/all
DELETE /api/workflow/delete
```

> 方法按公开代码中的 `httpGet` / `httpPost` / `httpDelete` 调用形态标注；带参数的端点可能被网关改写或随后端版本变化，未做运行时逐个验证。

运行逻辑（公开代码）：

1. `run_with_store` 启动，返回 code/status；`401` 会触发登录，`403` 提示权限不足。
2. 前端用 `pollTimer` 轮询 `/api/workflow/run`，带 `workflow_run_id` 和 `last_log_id`。
3. 日志面板用 `/api/workflow/run/log`，带 `last_sequence` 做增量拉取，并支持按节点/日志级别过滤。
4. 运行结束后加载 `output_obj_id` 对应的输出，并可用 snapshot 回放。
5. 终止走 `/api/workflow/run/terminate_with_store`。

也就是说，QuantFlow 的“运行”不是一条长连接，而是**启动 + 轮询日志 + 输出对象**；而“AI 生成图”和“AI 对话”才是 SSE。

### 4.6 多路 Assistant SSE

QuantFlow 前端至少有这些流式助手端点：

| 端点 | 用途 |
|---|---|
| `/pandaApi/quantflow/api/chat/workflow-assistant-stream` | 工作流助手（自然语言改图/问答） |
| `/pandaApi/quantflow/api/chat/backtest-assistant-stream` | 回测助手 |
| `/pandaApi/quantflow/api/chat/backtest-hk-assistant-stream` | 港股回测助手（TQX 版本） |
| `/pandaApi/quantflow/api/chat/backtest-us-assistant-stream` | 美股回测助手（TQX 版本） |
| `/pandaApi/quantflow/api/chat/skill-assistant-stream` | QuantSkill 助手 |
| `/pandaApi/quantflow/api/chat/factor-assistant-stream` | 因子助手 |
| `/pandaApi/quantflow/api/chat/factor-explorer-assistant-stream` | 因子探索（ChatPro） |
| `/pandaApi/quantflow/api/chat/market-data-assistant-stream` | 行情数据助手 |
| `/pandaApi/quantflow/api/chat/code-assistant-stream` | 代码助手 |
| `/pandaApi/quantflow/api/chat/custom-stock-assistant-stream` | 自定义个股助手 |
| `/pandaApi/quantflow/api/workflow-live-trading/chat-stream` | 实盘/仿真交易对话 |
| `/pandaApi/quantflow/api/workflow-competition/chat-stream` | 比赛模式对话（TQX） |
| `/pandaApi/quantflow/api/workflow-live-trading/chat-stream-dev` | 开发/未登录模式的交易对话 |

统一的 SSE 解析方式（公开代码）：

```text
fetch(...).body.getReader()
TextDecoder
正则: /^data:\s*(\{.*}$)/gm
JSON.parse(...)
字段: content / session_id / error / tools_called
结束: [DONE]
```

部分助手使用屏幕标记来分段：

```text
<NEXT SCREEN> ... </NEXT SCREEN>
<LEFT SCREEN> ... </LEFT SCREEN>
<RIGHT SCREEN> ... </RIGHT SCREEN>
```

前端会把这些标记去掉/转换为画布/侧栏不同区域的内容。`ChatPro` 的因子探索助手用 `<NEXT SCREEN>` 把内容拆成后续屏幕。

### 4.7 模型 / 认证 / 网关

公开代码中的模型选项：

- `PandaAI-CQ2`（默认）
- `PandaAI-CQ1`
- TQX 版本显示为 `TQX-CQ2` / `TQX-CQ1`

请求头：

```text
uid: <localStorage.userid>
Authorization: <localStorage.token>
Content-Type: application/json
```

实盘/仿真交易对话额外带：

```text
quantflow-auth: 2
```

工作流运行在 `401` 时触发登录，`403` 提示“权限不足”；说明工作流执行受账号/订阅/配额控制。

公开代码中的网关前缀映射（`buildUrl`）：

```text
basePath: "app_api"    -> /pandaApi/quantflow + path
basePath: "panda_api"  -> path 原样（代码中通常已写全 /pandaApi/quantflow/...）
basePath: "online_api" -> /pandaApi + path
basePath: "relative"   -> path 原样
默认（未指定）          -> /pandaApi/quantflow + path
```

### 4.8 QuantFlow 的“代码工作流”本质

把上面的信息串起来，QuantFlow 的 Agent 不是“直接生成一段 Python”，而是：

```text
自然语言
  -> workflow-graph/stream（架构师阶段机）
  -> workflow_json（节点 + 边）
  -> 每个节点的 input_schema/output_schema + custom_code
  -> 画布 / Notebook 双向同步
  -> workflow/save 持久化
  -> workflow/run_with_store 执行
  -> run/log 轮询 + output_obj_id 取结果
  -> revision_id / content_hash / checkpoint 版本回滚
```

这就是它和 Qube 的最大区别：

- **Qube**：对话式、以“策略/因子产物”为中心，审批嵌入 run。
- **QuantFlow**：画布式、以“工作流图 + 节点代码”为中心，Agent 直接产出可执行的图。

### 4.9 公开帮助文档中的提示词与技能目录（重要修正）

QuantFlow 的公开资产里有一个帮助文档组件 `assets/TqxHelpDocs-BdJkiJIa.js`（23,376 bytes，SHA-256 `3de4bfcf115b6947fc2490d438ea3bae3a0c5499835cbbc5d5f3c266b7b84422`）。它内置并允许下载四份 Markdown：

- `SKILLS_OVERVIEW_tqx.md` / `SKILLS_OVERVIEW_tqx_zh_TW.md`
- `SYSTEM_PROMPT_tqx.md` / `SYSTEM_PROMPT_tqx_zh_TW.md`

文档描述了服务端 `_build_prompt` 的拼装顺序：日期头 → 身份/常驻指令 → `<available_skills>` 技能目录 → 工具使用规则与模式 → 基础角色提示词 → 主任务/指南 → 注入上下文（记忆/历史/前序结果）→ 语言锁定。

技能目录公开了 `tqx_stock_market`、`tqx_stock_indicator`、`tqx_stock_analysis`、`tqx_stock_reference`、`analysis_technical`、`compute_python`、`data_merge`、`factor_*`、`model_*`、`workflow_*`、`plugin_*`、`backtest_*`、`rag_api`、`rag_factor`、`fx_rates`、`load_result` 以及 `srs_xxx` 结果串联约定；文档还提到服务端 `agent_runtime/orchestrator.py` 和 supervisor/worker 的额外提示词层。

需要区分：

- 这是“系统提示词说明/帮助文档”，不是完整的服务端提示词字符串；
- 工具的实际实现、调度、模型路由仍在服务端；
- Qube 公开壳没有等价的提示词文档，只有 i18n 工具名/能力名和用户卡片 prompt 建议；登录后的 `/chat` chunk 可能还有 UI 相关提示词，需要授权访问才能确认。

---

## 5. EVO 与 A2A（文档层）

### 5.1 EVO

公开文档描述：

- EVO 是“真实运行在云端、与账号绑定的持久化量化研究环境”。
- 浏览器只是入口；计算、存储、开发环境、量化服务在云端。
- 核心是 PandaAI 自研的 **EVO Harness**：面向量化研究深度定制的智能体运行与编排框架。
- 能力包括：云端 IDE/终端、项目级 Python 环境、依赖管理、官方量化 Skills/工具、用户自定义 Skills/工具、上传/下载工作区。
- 入口 `/evo` 需登录；未登录访问会先校验主站登录状态，不启动服务器，不产生计算费用。

本次只验证到 `/evo` 的登录门页（`noindex`，带 `BOOT` 配置与倒计时），没有进入云端工作站，因此 Harness 的内部实现未逆向。

### 5.2 A2A 办公室

公开文档描述（页面标注“即将上线”）：

- 多 Agent 协作系统：主持人拆解任务 → 专业 Agent 并行执行 → 交叉复核 → 最终结论。
- 默认团队：投研主持人、行情 Agent、资讯 Agent、基本面 Agent、风控 Agent。
- 控制台：下达指令、任务明细、定时任务、接入外部 Agent（A2A 协议）。
- 过程通常 1–2 分钟；支持手机推送与定时复跑。
- 每次任务按参与 Agent 的模型调用计算算力；定时任务每次执行单独计费。

这是产品设计文档，不是本次从代码还原的实现。

---

## 6. 如果要重建一套类似系统

下面是从这次逆向中抽象出的**最小可行架构**，不是对原系统的复制：

### 6.1 控制面

- 统一网关：`/api` 或 `/pandaApi`，负责 SSO、租户、配额、审计。
- 会话服务：conversation / message / part。
- Run 服务：run 状态机、事件序列、取消/重试。
- 审批服务：approval 表（run_id、type、payload、decision、status）。
- 产物服务：strategy/factor artifact、draft、version。
- 工作流服务：workflow graph、revision、checkpoint、run、log、output。

### 6.2 运行时

Qube 型：

```text
用户输入
  -> 规划器（理解意图、选择能力）
  -> 工具调用（数据/策略/因子/回测/技能）
  -> 产物草稿（代码/参数）
  -> 校验
  -> 审批（auto/approve）
  -> 回测/因子分析
  -> 版本
  -> 优化/调参/仿真
```

QuantFlow 型：

```text
用户输入
  -> 架构师（architect）
  -> 图结构（workflow_init/layout）
  -> 节点代码生成（workflow_generating/code_merged）
  -> 图完成（workflow_structure_complete/result）
  -> 画布/Notebook 同步
  -> 运行（run_with_store）
  -> 日志轮询 + 输出对象
  -> revision/checkpoint 回滚
```

### 6.3 事件与存储

- run 事件表：`sequence`、`event_type`、`mutations`、`redis_stream_id`、`created_at`。
- 事件折叠：`text/activity/card` 三类 part；`create/append/patch` 三种 mutation。
- 断线续传：客户端保存 `last_sequence` + `last_stream_id`。
- 工作流：`workflow_json` + `revision_id` + `content_hash` + `node_desc_map`。
- 输出：`output_obj_id`（大对象单独存储，不塞进 run 记录）。

### 6.4 前端状态机

Qube：

```text
idle -> creating_run -> streaming(parts) -> awaiting_approval?
  -> running_tool -> backtest/factor -> completed | failed | cancelled
  -> artifacts/versions
```

QuantFlow：

```text
idle -> generating(stage) -> graph_ready -> syncing_canvas/notebook
  -> running -> polling_logs -> output_ready
  -> revision/checkpoint
```

### 6.5 不建议直接照搬的点

- 不要把 token 只放 localStorage；优先 HttpOnly + SameSite cookie + CSRF 防护。
- 审批接口必须校验 `run_id`/`approval_id` 的归属，避免 IDOR。
- 工作流节点代码执行必须做沙箱/资源配额/依赖白名单；`/python/execute` 这类端点风险很高。
- 事件流要有幂等、去重、断线续传和终态补偿。
- 大对象（回测输出、图表、Notebook）不要塞进聊天消息表。

---

## 7. 证据与复现

### 7.1 REA 环境

```bash
# 系统 Node 18 不满足 REA 要求，使用本地 Node 24.22.1
export PATH=/tmp/opencode/node/bin:$PATH
npm install -g rea-agents@latest
rea --version --json
# {"name":"rea-agents","version":"6.8.0","runtime":{"id":"node","version":"24.22.1"},...}
```

### 7.2 实际使用的 REA 流程

```bash
# 1) 启动带 CDP 的 Chromium（独立 profile）
/snap/bin/chromium --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/opencode/rea-browser-profile about:blank

# 2) 打开公开文档页并被动观测
rea list-browser-targets http://127.0.0.1:9222 \
  --allowed-origins https://www.pandaaiquant.com --json

rea inspect-web-page http://127.0.0.1:9222 <TARGET_ID> \
  --allowed-origins https://www.pandaaiquant.com \
  --observation-ms 2000 --include-script-sources --json \
  > captures/docs-qube-page.json

# 3) 把捕获到的脚本导出为静态应用目录
rea export-web-scripts /abs/captures/docs-qube-page.json /abs/exported/docs-qube

# 4) 静态应用分析 + 路由视图
rea analyze-javascript-application /abs/exported/docs-qube \
  --detail summary --evidence_output captures/docs-qube-app-evidence.json \
  --view '{"kind":"javascript-routes","collection":"routes","offset":0,"limit":200}' \
  --json > captures/docs-qube-app-summary.json

# 5) QuantFlow 全量公开资产分析
rea analyze-javascript-application /abs/apps/quantflow \
  --detail summary --evidence_output captures/quantflow-app-evidence.json \
  --view '{"kind":"javascript-routes","collection":"routes","offset":0,"limit":300}' \
  --json > captures/quantflow-app-summary.json

# 6) Qube 公开壳的定向分析
rea analyze-javascript-application /abs/apps/agent_quant \
  --source-path assets/chat-api-BkRzIk_k.js \
  --source-path assets/index-redirect-C-0hC5Fc.js \
  --source-path assets/auth-provider-C7ie0Npj.js \
  --source-path assets/backtest-params-VEgzLRnx.js \
  --source-path assets/translate-api-error-6HzPqpg-.js \
  --detail summary --analysis-timeout-ms 600000 \
  --evidence_output captures/agent-quant-api-evidence.json \
  --view '{"kind":"javascript-routes","collection":"routes","offset":0,"limit":100}' \
  --json > captures/agent-quant-api-summary.json
```

### 7.3 关键产物

| 文件 | 内容 |
|---|---|
| `apps/agent_quant/` | Qube 公开 App Shell 与 40 个静态资源 |
| `apps/quantflow/` | QuantFlow 173 个公开静态资源 |
| `pages/*.txt` | Qube/EVO/A2A/策略文档正文 |
| `captures/docs-qube-page.json` | `/docs/qube` 的 CDP 页面观测（含脚本源码） |
| `captures/docs-evo-page.json` | `/docs/evo` |
| `captures/docs-a2a-page.json` | `/docs/a2a-office` |
| `captures/agent_quant-page.json` | `/agent_quant/` 未登录重定向观测 |
| `captures/docs-qube-app-evidence.json` | REA 文档应用图证据（54 路由，约 99 MB） |
| `captures/quantflow-app-evidence.json` | REA QuantFlow 应用图证据（146 个 JS，约 225 MB） |
| `captures/agent-quant-api-evidence.json` | REA Qube chat-api/auth/backtest 证据（约 13 MB） |
| `research/qube_agent_tools.json` | 101 工具 + 47 能力 |
| `research/qube_chat_endpoints.json` | Qube chat/approval/artifact 端点 |
| `research/quantflow_endpoints.json` | QuantFlow 54 个公开端点 |
| `research/evidence-index.json` | 证据文件大小/SHA-256/evidence_id |

### 7.4 REA 证据 ID

| 证据 | evidence_id |
|---|---|
| 文档应用路由视图 | `ev_d6051c208006f58145aa6fc8a37d9d4c572365df8f750d5a6a00769c229bb81f` |
| 文档应用图 | `ev_04f7e3763d7c94290543ad1ea345e0848efe6efeae6f054158a3d64a4fb8b631` |
| QuantFlow 路由视图 | `ev_6a99dfd3ec5a842c26689d2707ef059ffaacd6377736892524d0f264293355ec` |
| QuantFlow 应用图 | `ev_12bfd1c6aa70ebd7606a826b613f6413fd18dd257a4f4b21a77f2e5f1457a1fa` |
| Qube API 壳 | `ev_65157905a88f355e0d9b0efad038bfc6d040ded155d7e1ee4110e5bb1989335a` |

### 7.5 本次分析的局限

- Qube 的完整应用分析在 300 s provider 超时；`captures/agent-quant-shell-summary.json` 保留了 59 MB 的 partial observation。随后用定向 source-path 分析了 `chat-api`/`auth`/`backtest` 等关键文件，并直接静态阅读公开壳。
- 没有登录，因此没有 `/chat` 的 UI、传输层、真实 SSE/WS 事件样本。
- 没有调用任何业务 API，所有接口行为来自客户端代码，不是运行时验证。
- 没有 source map；代码是生产 minified bundle。
- 公开文档与实际行为可能存在差异（例如文档称 Qube 免登录试用，但实测 `/agent_quant/` 未登录会跳登录）。
- 本报告不包含后端实现、数据库 schema、完整服务端提示词、模型路由、密钥或付费数据。QuantFlow 公开帮助文档包含提示词分层说明和技能目录，已在 4.9 单列；这仍不是完整服务端 prompt 或工具实现。

---

## 8. 结论

- **Qube 的核心是“可恢复 run + 审批 + 产物/版本”**，而不是普通的聊天接口。它的 101 个工具名和 5 类审批说明这是一个深度领域 Agent，而不是通用问答。
- **QuantFlow 的核心是“自然语言 → workflow JSON 图 → 节点代码 → Notebook/画布 → 运行日志”**。`workflow-graph/stream` 的阶段机和 revision/checkpoint 是它最关键的设计。
- **两套系统共享同一种工程思路**：把 Agent 产出的中间物（策略/因子/工作流/代码）持久化为可版本化、可审批、可回滚的对象；把执行拆成可观测的 run；把大结果放到独立对象存储。
- **EVO/A2A 目前更多是产品设计层**：EVO 的 Harness 与 A2A 的多 Agent 协作都需要登录/尚未上线，本次只能确认公开入口与文档描述。
- **QuantFlow 的公开帮助文档暴露了提示词分层和技能目录**：这是“客户端可见提示词”的边界案例，但仍不是完整服务端 prompt，也不是工具实现。
- 如果目标是学习/互操作，最有价值的部分是：run 事件折叠模型、审批领域事件、Qube 工具注册表、QuantFlow 图生成阶段机与 Notebook 同步协议。

---


---

## 附录 A：Qube 101 个 Agent 工具（公开前端 i18n）

> 来源：`apps/agent_quant/assets/input-BSBalGud.js` 的 `activityNames.tools`。这些是客户端可渲染的动作名，不等同于后端完整工具目录。


### 策略生成 / 管理（28）

- `applyFutureStrategyPatch` — Apply futures strategy patch
- `getFutureStrategy` — View futures strategy
- `createFutureStrategyDraft` — Create futures strategy draft
- `getFutureStrategyDraft` — View futures strategy draft
- `validateFutureStrategyDraft` — Validate futures strategy draft
- `searchStrategyReferences` — Search strategy references
- `loadStrategyReferences` — Load strategy references
- `requestStrategySelection` — Select strategy
- `updateStrategySettings` — Update strategy settings
- `deleteStrategy` — Delete strategy
- `getStrategyCodeEditContext` — Get strategy edit context
- `editCurrentStrategyCode` — Edit current strategy code
- `optimizeCurrentStrategy` — Optimize current strategy
- `generateSelectedStrategyFromReference` — Generate from curated reference
- `generateFutureStrategy` — Create futures strategy
- `generateHkStrategy` — Create HK strategy
- `generateUsStrategy` — Create US strategy
- `getCnStockStrategy` — Read A-share strategy details
- `generateCnStockStrategy` — Create A-share strategy
- `createCnStockStrategyDraft` — Create A-share strategy draft
- `generateCnEtfStrategy` — Create ETF strategy
- `createCnEtfStrategyDraft` — Create ETF strategy draft
- `getCnStockStrategyDraft` — Read A-share strategy draft
- `validateCnStockStrategyDraft` — Validate A-share strategy draft
- `applyCnStockStrategyPatch` — Repair A-share strategy draft
- `getCnEtfStrategyDraft` — View ETF strategy draft
- `validateCnEtfStrategyDraft` — Validate ETF strategy draft
- `applyCnEtfStrategyPatch` — Repair ETF strategy draft


### 策略版本（5）

- `listStrategyVersions` — Read strategy versions
- `createStrategyVersion` — Create strategy version
- `renameStrategyVersion` — Rename strategy version
- `deleteStrategyVersion` — Delete strategy version
- `restoreStrategyVersion` — Restore strategy version


### 回测 / 运行历史（6）

- `updateCnStockStrategyBacktestParams` — Update A-share strategy backtest parameters
- `runStrategyBacktest` — Run strategy backtest
- `getStrategyBacktestResult` — Get strategy backtest result
- `listStrategyBacktestHistory` — List strategy backtest history
- `cancelStrategyBacktests` — Cancel strategy backtests
- `runCnStockStrategyBacktest` — Run A-share strategy backtest


### 优化（6）

- `applyFactorOptimizationPatch` — Apply factor optimization patch
- `applyCnStockStrategyOptimizationPatch` — Apply A-share strategy optimization patch
- `applyFutureStrategyOptimizationPatch` — Apply futures strategy optimization patch
- `getFactorOptimizationContext` — Get factor optimization context
- `getStrategyOptimizationContext` — Get strategy optimization context
- `applyCnEtfStrategyOptimizationPatch` — Apply ETF strategy optimization patch


### 参数调优（4）

- `listParameterTuningTasks` — List parameter-tuning tasks
- `generateStrategyParameterCandidates` — Generate strategy parameter candidates
- `createStrategyParameterTuning` — Create strategy parameter tuning
- `getStrategyParameterTuning` — Get strategy parameter tuning


### 因子（29）

- `applyFactorPatch` — Apply factor patch
- `cancelFactorAnalyses` — Cancel factor analyses
- `getFactorCodeEditContext` — Get factor edit context
- `editCurrentFactorCode` — Edit current factor code
- `optimizeCurrentFactor` — Optimize current factor
- `createFactorDraft` — Create factor draft
- `getFactorDraft` — View factor draft
- `validateFactorDraft` — Validate factor draft
- `searchFactorReferences` — Search factor references
- `loadFactorReferences` — Load factor references
- `generateCnStockFactor` — Create A-share factor
- `generateFutureFactor` — Create futures factor
- `generateHkFactor` — Create HK factor
- `generateUsFactor` — Create US factor
- `getCnStockFactor` — Get A-share factor
- `getFutureFactor` — Get futures factor
- `getFactorAnalysisResult` — Get factor analysis result
- `updateFactorSettings` — Update factor settings
- `deleteFactor` — Delete factor
- `requestFactorSelection` — Select factor
- `listFactors` — Read factor library
- `getFactor` — Read factor details
- `runFactorAnalysis` — Run factor analysis
- `listFactorAnalysisHistory` — Read factor analysis history
- `listFactorVersions` — Read factor versions
- `createFactorVersion` — Create factor version
- `renameFactorVersion` — Rename factor version
- `deleteFactorVersion` — Delete factor version
- `restoreFactorVersion` — Restore factor version


### 数据（8）

- `queryCnStockData` — Query A-share data
- `queryCnFutureData` — Query futures data
- `queryCnFundData` — Query fund data
- `queryHkData` — Query HK data
- `queryUsData` — Query US data
- `resolveDataAsset` — Resolve data asset
- `getDataMethodDocumentation` — Get data method documentation
- `searchTools` — Search data tools


### QuantSkill（4）

- `searchQuantSkills` — Search quant skills
- `readQuantSkillFile` — Read quant skill file
- `writeQuantSkillFile` — Write quant skill file
- `runQuantSkill` — Run quant skill


### 仿真账户（5）

- `listSimulationAccounts` — List simulation accounts
- `requestSimulationAccountSelection` — Select simulation account
- `createSimulationAccount` — Create simulation account
- `editSimulationAccount` — Edit simulation account
- `deleteSimulationAccount` — Delete simulation account


### 策略转写（1）

- `transcribeStrategy` — Transcribe strategy


### 研究（1）

- `listRecentResearchRuns` — List recent research runs


### 其他（4）

- `resolveCnStockUniverse` — Resolve A-share universe
- `resolveFutureUniverse` — Resolve futures universe
- `listStrategies` — List strategies
- `listCnStockStrategies` — Read A-share strategy list


---

## 附录 B：Qube 47 个能力名

> 来源：`activityNames.capabilities`。能力名更像“能力包/领域工作流”的标识，会和工具一起出现在处理过程中。


| 能力 | 说明 |
|---|---|
| `simulationAccount` | Simulation accounts |
| `strategyLibrary` | Strategy library |
| `strategyRun` | Strategy backtests |
| `strategyManage` | Strategy management |
| `strategyOptimize` | Strategy optimization |
| `strategyParameterTuning` | Strategy parameter tuning |
| `researchOverview` | Research overview |
| `strategyCuratedTemplate` | Curated strategy creation |
| `strategyCuratedTemplateReferenceGenerate` | Curated strategy reference generation |
| `strategyFuture` | Futures strategy |
| `strategyFutureAuthoring` | Futures strategy creation |
| `strategyFutureCodegen` | Futures strategy code generation |
| `strategyHkAuthoring` | HK strategy creation |
| `strategyHkCodegen` | HK strategy code generation |
| `strategyUsAuthoring` | US strategy creation |
| `strategyUsCodegen` | US strategy code generation |
| `transcriptionJoinquant` | JoinQuant strategy transcription |
| `transcriptionPtrade` | PTrade strategy transcription |
| `transcriptionQmt` | QMT strategy transcription |
| `factorLibrary` | Factor library |
| `factorRun` | Factor analysis |
| `factorManage` | Factor management |
| `factorCnStockAuthoring` | A-share factor creation |
| `factorCnStockCodegen` | A-share factor code generation |
| `factorFutureAuthoring` | Futures factor creation |
| `factorFutureCodegen` | Futures factor code generation |
| `factorHkAuthoring` | HK factor creation |
| `factorHkCodegen` | HK factor code generation |
| `factorUsAuthoring` | US factor creation |
| `factorUsCodegen` | US factor code generation |
| `dataCnStock` | A-share data query |
| `dataCnFuture` | Futures data query |
| `dataCnFund` | Fund data query |
| `dataHk` | HK data query |
| `dataUs` | US data query |
| `quantSkills` | Quant skills |
| `transcription` | Strategy transcription |
| `cnStock` | A-share strategies |
| `cnStockAuthoring` | A-share strategy creation |
| `cnStockCodegen` | A-share strategy code generation |
| `cnEtfAuthoring` | ETF strategy creation |
| `cnEtfCodegen` | ETF strategy code generation |
| `strategyVersion` | Strategy versions |
| `factorCnStock` | CN stock factors |
| `factorFuture` | Futures factors |
| `factorOptimize` | Factor optimization |
| `factorVersion` | Factor versions |

---

## 附录 C：Qube chat / approval / artifact 端点

> 基础前缀：`/pandaApi/agent_quant`。下表路径相对于该前缀。来源：`chat-api`。


| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/chat/models` | 可用模型列表 |
| GET | `/api/chat/conversations` | 会话列表（分页/归档过滤） |
| POST | `/api/chat/conversations` | 新建会话 |
| PATCH | `/api/chat/conversations/{conversation_id}` | 重命名/更新会话 |
| DELETE | `/api/chat/conversations/{conversation_id}` | 删除会话 |
| GET | `/api/chat/conversations/{conversation_id}/messages` | 历史消息（before_sequence 分页） |
| POST | `/api/chat/runs` | 创建一次 Agent run |
| POST | `/api/chat/runs/{run_id}/retry` | 重试 run |
| POST | `/api/chat/runs/{run_id}/cancel` | 取消 run |
| POST | `/api/chat/messages/{message_id}/resend` | 编辑后重发 |
| PUT | `/api/chat/messages/{message_id}/feedback` | 点赞/点踩 |
| GET | `/api/chat/conversations/{conversation_id}/artifacts` | 会话产物 |
| POST | `/api/chat/conversations/{conversation_id}/artifacts` | 新增产物 |
| DELETE | `/api/chat/conversations/{conversation_id}/artifacts/{artifact_type}/{artifact_id}` | 删除产物 |
| GET | `/api/strategy-drafts/{draft_id}` | 读取策略草稿 |
| GET | `/api/chat/strategy-transcription/platforms` | 策略转写平台状态 |
| GET | `/api/quant-skills` | QuantSkill 搜索 |
| GET | `/api/quant-skill-runs/page` | QuantSkill 运行记录 |
| GET | `/api/quant-skill-runs/{run_id}` | QuantSkill 运行详情 |
| POST | `/api/chat/conversations/{conversation_id}/completion/read` | 标记完成已读 |
| POST | `/api/chat/conversations/{conversation_id}/failure/read` | 标记失败已读 |
| POST | `/api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/resolve` | 策略创建审批 |
| GET | `/api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/draft` | 策略创建审批草稿 |
| POST | `/api/chat/runs/{run_id}/strategy-run-approvals/{approval_id}/resolve` | 策略回测审批 |
| GET | `/api/chat/runs/{run_id}/strategy-mutation-approvals/{approval_id}/detail` | 策略变更审批详情 |
| POST | `/api/chat/runs/{run_id}/strategy-mutation-approvals/{approval_id}/resolve` | 策略变更审批 |
| GET | `/api/chat/runs/{run_id}/strategy-version-approvals/{approval_id}/detail` | 策略版本审批详情 |
| POST | `/api/chat/runs/{run_id}/strategy-version-approvals/{approval_id}/resolve` | 策略版本审批 |
| POST | `/api/chat/runs/{run_id}/factor-create-approvals/{approval_id}/resolve` | 因子创建审批 |
| GET | `/api/chat/runs/{run_id}/factor-create-approvals/{approval_id}/draft` | 因子创建审批草稿 |

---

## 附录 D：QuantFlow 公开端点分组

> 来源：`apps/quantflow/assets/*.js`。共 54 个去重端点，基础前缀 `/pandaApi/quantflow`（部分为 `app_api` 相对路径）。


| 分组 | 端点 |
|---|---|
| api | `/pandaApi/quantflow/api/asset-library/upload`<br>`/pandaApi/quantflow/api/backtest/userstrategylog`<br>`/pandaApi/quantflow/api/backtest/userstrategylog/export`<br>`/pandaApi/quantflow/api/chat/backtest-assistant-stream`<br>`/pandaApi/quantflow/api/chat/backtest-hk-assistant-stream`<br>`/pandaApi/quantflow/api/chat/backtest-us-assistant-stream`<br>`/pandaApi/quantflow/api/chat/code-assistant-stream`<br>`/pandaApi/quantflow/api/chat/custom-stock-assistant-stream`<br>`/pandaApi/quantflow/api/chat/factor-assistant-stream`<br>`/pandaApi/quantflow/api/chat/factor-explorer-assistant-stream`<br>`/pandaApi/quantflow/api/chat/market-data-assistant-stream`<br>`/pandaApi/quantflow/api/chat/skill-assistant-stream`<br>`/pandaApi/quantflow/api/chat/workflow-assistant-stream`<br>`/pandaApi/quantflow/api/factor`<br>`/pandaApi/quantflow/api/factor/`<br>`/pandaApi/quantflow/api/plugins/save`<br>`/pandaApi/quantflow/api/plugins/upload`<br>`/pandaApi/quantflow/api/python/execute`<br>`/pandaApi/quantflow/api/workflow-graph/sessions/bind-workflow`<br>`/pandaApi/quantflow/api/workflow-graph/sessions/checkpoint`<br>`/pandaApi/quantflow/api/workflow-graph/sessions/list`<br>`/pandaApi/quantflow/api/workflow-graph/sessions/query`<br>`/pandaApi/quantflow/api/workflow-graph/stream`<br>`/pandaApi/quantflow/api/workflow-live-trading/chat-stream`<br>`/pandaApi/quantflow/api/workflow/run/list`<br>`/pandaApi/quantflow/api/workflow/run/output?output_obj_id=`<br>`/pandaApi/quantflow/api/workflow_schedule/create`<br>`/pandaApi/quantflow/api/workflow_schedule/delete?id=`<br>`/pandaApi/quantflow/api/workflow_schedule/get_detail?workflow_id=`<br>`/pandaApi/quantflow/api/workflow_schedule/update`<br>`/pandaApi/quantflow/api/workspace-files/upload` |
| asset-library | `/api/asset-library/delete`<br>`/api/asset-library/download`<br>`/api/asset-library/download-zip`<br>`/api/asset-library/folder`<br>`/api/asset-library/folders`<br>`/api/asset-library/list`<br>`/api/asset-library/object`<br>`/api/asset-library/pool/categories`<br>`/api/asset-library/pool/tiers` |
| backtest | `/api/backtest/userstrategylog` |
| notebook | `/api/notebook/cell/parse-and-validate`<br>`/api/notebook/node-source/batch`<br>`/api/notebook/workflow/` |
| workflow | `/api/workflow/all`<br>`/api/workflow/all?`<br>`/api/workflow/delete`<br>`/api/workflow/query`<br>`/api/workflow/run`<br>`/api/workflow/run/log`<br>`/api/workflow/run/snapshot`<br>`/api/workflow/run/terminate_with_store`<br>`/api/workflow/run_with_store`<br>`/api/workflow/save` |

---

## 附录 E：关键证据文件

> 完整清单（含 SHA-256）见 `research/evidence-index.json`。


| 文件 | 大小 | evidence_id |
|---|---:|---|
| `captures/docs-qube-app-evidence.json` | 98.1 MB | `ev_04f7e3763d7c94290543ad1ea345e0848efe6efeae6f054158a3d64a4fb8b631` |
| `captures/docs-qube-app-summary.json` | 0.0 MB | `ev_d6051c208006f58145aa6fc8a37d9d4c572365df8f750d5a6a00769c229bb81f` |
| `captures/quantflow-app-evidence.json` | 224.5 MB | `ev_12bfd1c6aa70ebd7606a826b613f6413fd18dd257a4f4b21a77f2e5f1457a1fa` |
| `captures/quantflow-app-summary.json` | 0.0 MB | `ev_6a99dfd3ec5a842c26689d2707ef059ffaacd6377736892524d0f264293355ec` |
| `captures/agent-quant-api-evidence.json` | 12.3 MB | `ev_65157905a88f355e0d9b0efad038bfc6d040ded155d7e1ee4110e5bb1989335a` |
| `captures/agent-quant-api-summary.json` | 0.0 MB | `ev_4640d27050c09f4a94e991bfacae838a27d8a75da9c1a97beda03dc100974039` |
| `captures/agent-quant-shell-summary.json` | 58.7 MB | `ev_0408a96dcec05cd3f2d45fb8c1a61bdd39c50418d5c7483251c5ca1364e3e2ce` |

---

## 附录 F：一句话速查


- Qube 会话：`/pandaApi/agent_quant/api/chat/conversations`
- Qube 发起 run：`POST /pandaApi/agent_quant/api/chat/runs`
- Qube 审批：`/api/chat/runs/{run_id}/strategy-*-approvals/{approval_id}/resolve`
- Qube 事件折叠：`sequence` + `redis_stream_id` + `mutations(create/append/patch)`
- QuantFlow 生成图：`POST /pandaApi/quantflow/api/workflow-graph/stream`
- QuantFlow 运行：`/api/workflow/run_with_store` + `/api/workflow/run` + `/api/workflow/run/log`
- QuantFlow 图版本：`revision_id` + `content_hash` + `/workflow-graph/sessions/checkpoint`
- 画布/Notebook：`PANDA_*` postMessage 协议 + `marimo-iframe`

