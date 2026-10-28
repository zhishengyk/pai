# PandaAI Agent 工作流逆向资料

本仓库是对 `https://www.pandaaiquant.com/` 公开前端与公开文档的独立分析，重点是：

- **Qube**：`/agent_quant/` 的对话式量化 Agent（run 生命周期、审批、产物/版本、工具注册表）。
- **QuantFlow**：`/quantflow/` 的可视化代码工作流（workflow JSON 图、节点代码、Notebook 同步、运行日志轮询、SSE 助手）。
- **EVO / A2A**：公开文档层的产品与架构描述。

## 目录

- `pandaaiquant-agent-reverse/REPORT.zh-CN.md` — 完整逆向报告
- `pandaaiquant-agent-reverse/research/qube_agent_tools.json` — Qube 101 个工具 + 47 个能力
- `pandaaiquant-agent-reverse/research/qube_chat_endpoints.json` — Qube chat / approval / artifact 端点
- `pandaaiquant-agent-reverse/research/quantflow_endpoints.json` — QuantFlow 公开端点分组
- `pandaaiquant-agent-reverse/research/evidence-index.json` — 本地 REA 证据索引（不含证据本体）
- `pandaaiquant-agent-reverse/tools/download_app_assets.py` — 公开静态资产下载脚本

## 未包含

- 目标站的 JS/CSS bundle、页面正文、抓取证据与截图。这些内容体积大，且包含第三方代码/内容，因此不随仓库分发。
- 任何登录态、付费数据、密钥或业务 API 调用。
- 目标站的后端实现、数据库结构、提示词与模型路由（公开客户端不可见）。

## 范围与声明

本次分析只使用未登录可访问的公开页面、公开静态资源和公开文档；未绕过登录/付费墙，未调用 `/pandaApi` 业务接口，未抓取付费数据。

本项目仅用于学习、互操作与安全研究。第三方商标、代码与内容版权归其各自所有者；本项目与 PandaAI 无关联。请勿将本仓库用于规避访问控制、抓取付费数据或侵犯第三方权利。详见 `NOTICE.md`。
