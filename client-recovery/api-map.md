# API Path Map

Paths are static candidates from the public bundles. `call` means the scanner saw an API-client/fetch call; `string` means only a path string. The real server may prefix paths differently.

## agent_quant (30 unique paths)

### `/api/auth`

| path | methods | files |
|---|---|---|
| /api/auth/me | string | assets/query-keys-hu8Y4jsT.js |

### `/api/chat`

| path | methods | files |
|---|---|---|
| /api/chat/conversations | GET, POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/conversations/{conversation_id} | DELETE, PATCH | assets/chat-api-BkRzIk_k.js |
| /api/chat/conversations/{conversation_id}/artifacts | GET, POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/conversations/{conversation_id}/artifacts/{artifact_type}/{artifact_id} | DELETE | assets/chat-api-BkRzIk_k.js |
| /api/chat/conversations/{conversation_id}/completion/read | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/conversations/{conversation_id}/failure/read | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/conversations/{conversation_id}/messages | GET | assets/chat-api-BkRzIk_k.js |
| /api/chat/messages/{message_id}/feedback | PUT | assets/chat-api-BkRzIk_k.js |
| /api/chat/messages/{message_id}/resend | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/models | GET | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/cancel | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/factor-create-approvals/{approval_id}/draft | GET | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/factor-create-approvals/{approval_id}/resolve | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/retry | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/draft | GET | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/resolve | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/strategy-mutation-approvals/{approval_id}/detail | GET | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/strategy-mutation-approvals/{approval_id}/resolve | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/strategy-run-approvals/{approval_id}/resolve | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/strategy-version-approvals/{approval_id}/detail | GET | assets/chat-api-BkRzIk_k.js |
| /api/chat/runs/{run_id}/strategy-version-approvals/{approval_id}/resolve | POST | assets/chat-api-BkRzIk_k.js |
| /api/chat/strategy-transcription/platforms | GET | assets/chat-api-BkRzIk_k.js |

### `/api/quant-skill-runs`

| path | methods | files |
|---|---|---|
| /api/quant-skill-runs/page | GET | assets/chat-api-BkRzIk_k.js |
| /api/quant-skill-runs/{run_id} | GET | assets/chat-api-BkRzIk_k.js |

### `/api/quant-skills`

| path | methods | files |
|---|---|---|
| /api/quant-skills | GET | assets/chat-api-BkRzIk_k.js |

### `/api/strategy-drafts`

| path | methods | files |
|---|---|---|
| /api/strategy-drafts/{draft_id} | GET | assets/chat-api-BkRzIk_k.js |

### `/pandaApi/agent_quant`

| path | methods | files |
|---|---|---|
| /pandaApi/agent_quant | string | assets/query-keys-hu8Y4jsT.js |

### `/tqxApi/auth`

| path | methods | files |
|---|---|---|
| /tqxApi/auth/refresh-token | string | assets/query-keys-hu8Y4jsT.js |

## quantflow (178 unique paths)

### `/api/asset-library`

| path | methods | files |
|---|---|---|
| /api/asset-library/delete | string | assets/main-C0byxrRt.js |
| /api/asset-library/download | string | assets/main-C0byxrRt.js |
| /api/asset-library/download-zip | string | assets/main-C0byxrRt.js |
| /api/asset-library/folder | string | assets/main-C0byxrRt.js |
| /api/asset-library/folders | string | assets/main-C0byxrRt.js |
| /api/asset-library/list | string | assets/Quantflow-CFbBdo_1.js |
| /api/asset-library/object | string | assets/Quantflow-CFbBdo_1.js |
| /api/asset-library/pool/categories | string | assets/Quantflow-CFbBdo_1.js |
| /api/asset-library/pool/tiers | string | assets/Quantflow-CFbBdo_1.js |

### `/api/backtest`

| path | methods | files |
|---|---|---|
| /api/backtest/userstrategylog | string | assets/Quantflow-CFbBdo_1.js |

### `/api/membership`

| path | methods | files |
|---|---|---|
| /api/membership/ai-generate/check | string | assets/main-C0byxrRt.js |
| /api/membership/expert-mode/check | string | assets/main-C0byxrRt.js |
| /api/membership/workflow-build/check | string | assets/main-C0byxrRt.js |
| /api/membership/workflow-concurrent/check | string | assets/main-C0byxrRt.js |

### `/api/notebook`

| path | methods | files |
|---|---|---|
| /api/notebook/cell/parse-and-validate | string | assets/Quantflow-CFbBdo_1.js |
| /api/notebook/node-source/batch | string | assets/Quantflow-CFbBdo_1.js |
| /api/notebook/workflow/${}/create-node-from-cell | string | assets/Quantflow-CFbBdo_1.js |
| /api/notebook/workflow/${}/url | string | assets/Quantflow-CFbBdo_1.js |

### `/api/plugins`

| path | methods | files |
|---|---|---|
| /api/plugins/all | string | assets/main-C0byxrRt.js |
| /api/plugins/delete | string | assets/main-C0byxrRt.js |
| /api/plugins/detail | string | assets/Quantflow-CFbBdo_1.js |

### `/api/v1`

| path | methods | files |
|---|---|---|
| /api/v1/accountReport/getAccountReportPerformance?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accountReport/getAccountReportPerformance?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accountReport/getPandaAccountMarketValueRiskImg?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accountReport/getPandaAccountMarketValueRiskImg?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accountReport/getPandaAccountMaxDrawdownImg?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accountReport/getPandaAccountMaxDrawdownImg?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accountReport/getPandaAccountUnitNetImg?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accountReport/getPandaAccountUnitNetImg?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accountReport/getPandaAccountVolatilityImg?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accountReport/getPandaAccountVolatilityImg?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accountReport/getPandaProductAccountListByAccount?account=${e}&pageNo=${t}&pageSize=${n} | string | assets/main-C0byxrRt.js |
| /api/v1/accountReport/getPandaProductAccountListByAccount?account=${}&pageNo=${}&pageSize=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accountReport/getPandaProductDailyResultImg?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accountReport/getPandaProductDailyResultImg?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accounts/addFutureAccount | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/accounts/addSimFutureAccount | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/accounts/delFutureAccountBatch | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/accounts/depositSimFutureAccount | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/accounts/getAccountData?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accounts/getAccountData?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accounts/getAccountPositionData?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accounts/getAccountPositionData?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accounts/getPandaFutureAccountList?modifyUser=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accounts/getPandaFutureAccountList?modifyUser=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accounts/getPandaFutureAccountPageList?${r} | string | assets/main-C0byxrRt.js |
| /api/v1/accounts/getPandaFutureAccountPageList?${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accounts/getTodayAccountOrderById?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accounts/getTodayAccountOrderById?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accounts/getTodayAccountTradeById?account=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/accounts/getTodayAccountTradeById?account=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/accounts/updateFutureAccount | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/accounts/updateSimFutureAccountName | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/products/getMonitorPageData | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/products/getPandaProductMinuteResultImg?account=${e}&lastId=${t} | string | assets/main-C0byxrRt.js |
| /api/v1/products/getPandaProductMinuteResultImg?account=${}&lastId=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/products/getRealStrategyServer | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/strategies/addProductStrategy | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/strategies/delProductStrategy?productStrategyId=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/strategies/delProductStrategy?productStrategyId=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/strategies/getModels | string | assets/main-C0byxrRt.js |
| /api/v1/strategies/getPandaProductStrategyListByModifyUser?modifyUser=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/strategies/getPandaProductStrategyListByModifyUser?modifyUser=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/strategies/getPandaUserStrategyLogByStrategyRunId?productStrategyId=${e}&lastId=${t}&count=${n}&levels=${i} | string | assets/main-C0byxrRt.js |
| /api/v1/strategies/getPandaUserStrategyLogByStrategyRunId?productStrategyId=${}&lastId=${}&count=${}&levels=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/strategies/getProductStrategyInfoById?productStrategyId=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/strategies/getProductStrategyInfoById?productStrategyId=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/strategies/restartProductStrategy?productStrategyId=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/strategies/restartProductStrategy?productStrategyId=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/strategies/stopProductStrategy?productStrategyId=${e} | string | assets/main-C0byxrRt.js |
| /api/v1/strategies/stopProductStrategy?productStrategyId=${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/v1/strategies/updateProductStrategy | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /api/v1/workflows/getWorkflowList?userId=${e}&source=${t} | string | assets/main-C0byxrRt.js |
| /api/v1/workflows/getWorkflowList?userId=${}&source=${} | string | assets/ChartsView-BHe3Y_2f.js |

### `/api/workflow`

| path | methods | files |
|---|---|---|
| /api/workflow/all | string | assets/WorkflowCreated-B3Eo3dWl.js, assets/index-GqNeRNXA.js, assets/main-C0byxrRt.js |
| /api/workflow/all?${} | string | assets/ChartsView-BHe3Y_2f.js |
| /api/workflow/delete | string | assets/main-C0byxrRt.js |
| /api/workflow/query | string | assets/Quantflow-CFbBdo_1.js, assets/main-C0byxrRt.js |
| /api/workflow/run | string | assets/Quantflow-CFbBdo_1.js, assets/main-C0byxrRt.js |
| /api/workflow/run/log | string | assets/Quantflow-CFbBdo_1.js |
| /api/workflow/run/snapshot | string | assets/main-C0byxrRt.js |
| /api/workflow/run/terminate_with_store | string | assets/Quantflow-CFbBdo_1.js |
| /api/workflow/run_with_store | string | assets/Quantflow-CFbBdo_1.js |
| /api/workflow/save | string | assets/Quantflow-CFbBdo_1.js, assets/main-C0byxrRt.js |

### `/api/workspace-files`

| path | methods | files |
|---|---|---|
| /api/workspace-files/file | string | assets/main-C0byxrRt.js |
| /api/workspace-files/list | string | assets/main-C0byxrRt.js |

### `/pandaApi/alipay`

| path | methods | files |
|---|---|---|
| /pandaApi/alipay/createOrder | string | assets/main-C0byxrRt.js |

### `/pandaApi/courses`

| path | methods | files |
|---|---|---|
| /pandaApi/courses/getGoodsList | string | assets/main-C0byxrRt.js |
| /pandaApi/courses/getOrder?orderId=${e} | string | assets/main-C0byxrRt.js |

### `/pandaApi/goods`

| path | methods | files |
|---|---|---|
| /pandaApi/goods/getGoodsList | string | assets/main-C0byxrRt.js |

### `/pandaApi/historyData`

| path | methods | files |
|---|---|---|
| /pandaApi/historyData/querySymbol?type=${e.type}&symbol=${e.symbol} | string | assets/main-C0byxrRt.js |

### `/pandaApi/instrument`

| path | methods | files |
|---|---|---|
| /pandaApi/instrument/addSymbol | string | assets/main-C0byxrRt.js |
| /pandaApi/instrument/deleteSymbol | string | assets/main-C0byxrRt.js |
| /pandaApi/instrument/querySymbol?symbolType=${e} | string | assets/main-C0byxrRt.js |

### `/pandaApi/login`

| path | methods | files |
|---|---|---|
| /pandaApi/login/pw | string | assets/authService-DsRwB072.js |

### `/pandaApi/order`

| path | methods | files |
|---|---|---|
| /pandaApi/order/getOrderDetail?orderId= | string | assets/main-C0byxrRt.js |
| /pandaApi/order/getOrderList?${t.toString()} | string | assets/main-C0byxrRt.js |

### `/pandaApi/pay`

| path | methods | files |
|---|---|---|
| /pandaApi/pay/createOrder | string | assets/main-C0byxrRt.js |
| /pandaApi/pay/getUserCoupons | string | assets/WorkflowSubscribed-F-toamFE.js |
| /pandaApi/pay/getUserCoupons? | string | assets/main-C0byxrRt.js |
| /pandaApi/pay/hasBenefit | string | assets/Header-ByqjsPNw.js, assets/Quantflow-CFbBdo_1.js |
| /pandaApi/pay/queryMember | string | assets/main-C0byxrRt.js, assets/memberLevelManager-Du1-w06U.js |

### `/pandaApi/payment`

| path | methods | files |
|---|---|---|
| /pandaApi/payment/createOrder | string | assets/main-C0byxrRt.js |

### `/pandaApi/quantflow`

| path | methods | files |
|---|---|---|
| /pandaApi/quantflow | string | assets/index-DJLj1khd.js, assets/main-C0byxrRt.js |
| /pandaApi/quantflow/ | string | assets/agent-trade-BDA-Vfe3.js, assets/api-factor-BvWgc3OH.js |
| /pandaApi/quantflow/api/asset-library/upload | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/backtest/userstrategylog | string | assets/index-DJLj1khd.js |
| /pandaApi/quantflow/api/backtest/userstrategylog/export | string | assets/index-DJLj1khd.js |
| /pandaApi/quantflow/api/chat/backtest-assistant-stream | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/chat/backtest-hk-assistant-stream | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/chat/backtest-us-assistant-stream | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/chat/code-assistant-stream | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/chat/custom-stock-assistant-stream | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/chat/factor-assistant-stream | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/chat/factor-explorer-assistant-stream | string | assets/ChatPro-DS7erhn_.js |
| /pandaApi/quantflow/api/chat/market-data-assistant-stream | string | assets/SidebarLayout-DQ6ickQk.js |
| /pandaApi/quantflow/api/chat/skill-assistant-stream | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/chat/workflow-assistant-stream | string | assets/main-C0byxrRt.js, assets/useTqxBacktestLimitPopup-Bpixu_my.js |
| /pandaApi/quantflow/api/factor | string | assets/index-DJLj1khd.js |
| /pandaApi/quantflow/api/factor/ | string | assets/api-factor-BvWgc3OH.js |
| /pandaApi/quantflow/api/plugins/save | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/plugins/upload | string | assets/UploadFile-D_R7HAxx.js, assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/python/execute | string | assets/ChartsView-BHe3Y_2f.js |
| /pandaApi/quantflow/api/workflow-graph/sessions/bind-workflow | string | assets/Quantflow-CFbBdo_1.js, assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow-graph/sessions/checkpoint | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/workflow-graph/sessions/list | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/workflow-graph/sessions/query | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/workflow-graph/stream | string | assets/Quantflow-CFbBdo_1.js |
| /pandaApi/quantflow/api/workflow-live-trading/chat-stream | string | assets/agent-trade-BDA-Vfe3.js, assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow/run/list | string | assets/Header-ByqjsPNw.js, assets/SidebarLayout-DQ6ickQk.js |
| /pandaApi/quantflow/api/workflow/run/output?output_obj_id=${a} | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow/run/output?output_obj_id=${c} | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow/run/output?output_obj_id=${e} | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow/run/output?output_obj_id=${n} | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow/run/output?output_obj_id=${u} | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow_schedule/create | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow_schedule/delete?id=${e} | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workflow_schedule/get_detail?workflow_id=${} | string | assets/Header-ByqjsPNw.js, assets/Quantflow-CFbBdo_1.js, assets/WorkflowCreated-B3Eo3dWl.js |
| /pandaApi/quantflow/api/workflow_schedule/update | string | assets/main-C0byxrRt.js |
| /pandaApi/quantflow/api/workspace-files/upload | string | assets/main-C0byxrRt.js |

### `/pandaApi/systemMessage`

| path | methods | files |
|---|---|---|
| /pandaApi/systemMessage/batchUpdateStatus | string | assets/main-C0byxrRt.js |
| /pandaApi/systemMessage/getMessages?current=${e}&size=${t} | string | assets/main-C0byxrRt.js |
| /pandaApi/systemMessage/updateStatus?id=${e} | string | assets/main-C0byxrRt.js |

### `/pandaApi/trade`

| path | methods | files |
|---|---|---|
| /pandaApi/trade | string | assets/ChartsView-BHe3Y_2f.js, assets/main-C0byxrRt.js |
| /pandaApi/trade/api/v1/stock | string | assets/ChartsView-BHe3Y_2f.js |

### `/pandaApi/user`

| path | methods | files |
|---|---|---|
| /pandaApi/user/info | string | assets/CreatorList-BBK5BuDr.js |
| /pandaApi/user/member/quota | string | assets/main-C0byxrRt.js |
| /pandaApi/user/track/click | string | assets/main-C0byxrRt.js |
| /pandaApi/user/track/click?eventKey=agentChat | string | assets/Quantflow-CFbBdo_1.js |

### `/pandaApi/userTask`

| path | methods | files |
|---|---|---|
| /pandaApi/userTask/getUserTask?taskId=${e} | string | assets/main-C0byxrRt.js |
| /pandaApi/userTask/isNewbie?taskId=${e} | string | assets/main-C0byxrRt.js |

### `/pandaApi/userWallet`

| path | methods | files |
|---|---|---|
| /pandaApi/userWallet/exchange?${i} | string | assets/main-C0byxrRt.js |
| /pandaApi/userWallet/myWallet | string | assets/main-C0byxrRt.js, assets/walletFetcher-iIHP3DEy.js |

### `/pandaApi/workflowCategory`

| path | methods | files |
|---|---|---|
| /pandaApi/workflowCategory/getWorkflowCategoryList | string | assets/main-C0byxrRt.js |

### `/pandaApi/workflowChat`

| path | methods | files |
|---|---|---|
| /pandaApi/workflowChat/collect | string | assets/SidebarLayout-DQ6ickQk.js |
| /pandaApi/workflowChat/list?${a.toString()} | string | assets/main-C0byxrRt.js |
| /pandaApi/workflowChat/list?workflowId=${}&subscriptionId=${}&pageNo=1&pageSize=1 | string | assets/SidebarLayout-DQ6ickQk.js |
| /pandaApi/workflowChat/view?${r.toString()} | string | assets/main-C0byxrRt.js |

### `/pandaApi/workflowChatFee`

| path | methods | files |
|---|---|---|
| /pandaApi/workflowChatFee/getDetail?sessionId=${} | string | assets/AIComputingResult-CPwch0FA.js |

### `/pandaApi/workflowComputingPowerTransactions`

| path | methods | files |
|---|---|---|
| /pandaApi/workflowComputingPowerTransactions/getAccountRecords?${n.toString()} | string | assets/main-C0byxrRt.js |
| /pandaApi/workflowComputingPowerTransactions/getAccountRecords?${t.toString()} | string | assets/main-C0byxrRt.js |
| /pandaApi/workflowComputingPowerTransactions/getExchangeHistory?${i} | string | assets/main-C0byxrRt.js |

### `/pandaApi/workflowInfo`

| path | methods | files |
|---|---|---|
| /pandaApi/workflowInfo/add | string | assets/CreatorCreated-6MkKRPS7.js |
| /pandaApi/workflowInfo/delete?id=${} | string | assets/CreatorList-BBK5BuDr.js |
| /pandaApi/workflowInfo/edit | string | assets/CreatorEdit-1lm9aQfM.js |
| /pandaApi/workflowInfo/getRawWorkflow?id=${} | string | assets/CreatorEdit-1lm9aQfM.js |
| /pandaApi/workflowInfo/getWorkflowCount | string | assets/CreatorList-BBK5BuDr.js |
| /pandaApi/workflowInfo/list?${} | string | assets/CreatorList-BBK5BuDr.js |
| /pandaApi/workflowInfo/mySubscribedWorkflow | string | assets/WorkflowSubscribed-F-toamFE.js |
| /pandaApi/workflowInfo/rawWorkflowList?pageNo=${}&pageSize=${} | string | assets/CreatorCreated-6MkKRPS7.js |
| /pandaApi/workflowInfo/shelve?id=${}&isListed=${} | string | assets/CreatorList-BBK5BuDr.js |
| /pandaApi/workflowInfo/subscribe | string | assets/WorkflowSubscribed-F-toamFE.js |
| /pandaApi/workflowInfo/updateWorkflowVersion?id=${} | string | assets/CreatorList-BBK5BuDr.js |
| /pandaApi/workflowInfo/upload | string | assets/CreatorCreated-6MkKRPS7.js, assets/CreatorEdit-1lm9aQfM.js |

### `/pandaApi/workflowLabel`

| path | methods | files |
|---|---|---|
| /pandaApi/workflowLabel/list | string | assets/main-C0byxrRt.js |

### `/pandaApi/workflowRun`

| path | methods | files |
|---|---|---|
| /pandaApi/workflowRun/getWorkflowRun | string | assets/Header-ByqjsPNw.js, assets/SidebarLayout-DQ6ickQk.js |

### `/pandaApi/workflowServer`

| path | methods | files |
|---|---|---|
| /pandaApi/workflowServer/list | string | assets/Header-ByqjsPNw.js, assets/main-C0byxrRt.js |

### `/tqxApi/pay`

| path | methods | files |
|---|---|---|
| /tqxApi/pay/member/subscription | string | assets/PlanWarningModal-D8K4D6Rx.js |
