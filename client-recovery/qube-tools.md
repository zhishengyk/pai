# Qube Tool & Capability Registry

Source: `apps/agent_quant/assets/input-BSBalGud.js` i18n block.

- tools: 101
- capabilities: 47

The public bundle exposes display names/grouping; it does not expose server-side parameter schemas or implementations.

## Tools

| # | name | label |
|---|---|---|
| 1 | `applyCnEtfStrategyOptimizationPatch` | Apply ETF strategy optimization patch |
| 2 | `applyCnEtfStrategyPatch` | Repair ETF strategy draft |
| 3 | `applyCnStockStrategyOptimizationPatch` | Apply A-share strategy optimization patch |
| 4 | `applyCnStockStrategyPatch` | Repair A-share strategy draft |
| 5 | `applyFactorOptimizationPatch` | Apply factor optimization patch |
| 6 | `applyFactorPatch` | Apply factor patch |
| 7 | `applyFutureStrategyOptimizationPatch` | Apply futures strategy optimization patch |
| 8 | `applyFutureStrategyPatch` | Apply futures strategy patch |
| 9 | `cancelFactorAnalyses` | Cancel factor analyses |
| 10 | `cancelStrategyBacktests` | Cancel strategy backtests |
| 11 | `createCnEtfStrategyDraft` | Create ETF strategy draft |
| 12 | `createCnStockStrategyDraft` | Create A-share strategy draft |
| 13 | `createFactorDraft` | Create factor draft |
| 14 | `createFactorVersion` | Create factor version |
| 15 | `createFutureStrategyDraft` | Create futures strategy draft |
| 16 | `createSimulationAccount` | Create simulation account |
| 17 | `createStrategyParameterTuning` | Create strategy parameter tuning |
| 18 | `createStrategyVersion` | Create strategy version |
| 19 | `deleteFactor` | Delete factor |
| 20 | `deleteFactorVersion` | Delete factor version |
| 21 | `deleteSimulationAccount` | Delete simulation account |
| 22 | `deleteStrategy` | Delete strategy |
| 23 | `deleteStrategyVersion` | Delete strategy version |
| 24 | `editCurrentFactorCode` | Edit current factor code |
| 25 | `editCurrentStrategyCode` | Edit current strategy code |
| 26 | `editSimulationAccount` | Edit simulation account |
| 27 | `generateCnEtfStrategy` | Create ETF strategy |
| 28 | `generateCnStockFactor` | Create A-share factor |
| 29 | `generateCnStockStrategy` | Create A-share strategy |
| 30 | `generateFutureFactor` | Create futures factor |
| 31 | `generateFutureStrategy` | Create futures strategy |
| 32 | `generateHkFactor` | Create HK factor |
| 33 | `generateHkStrategy` | Create HK strategy |
| 34 | `generateSelectedStrategyFromReference` | Generate from curated reference |
| 35 | `generateStrategyParameterCandidates` | Generate strategy parameter candidates |
| 36 | `generateUsFactor` | Create US factor |
| 37 | `generateUsStrategy` | Create US strategy |
| 38 | `getCnEtfStrategyDraft` | View ETF strategy draft |
| 39 | `getCnStockFactor` | Get A-share factor |
| 40 | `getCnStockStrategy` | Read A-share strategy details |
| 41 | `getCnStockStrategyDraft` | Read A-share strategy draft |
| 42 | `getDataMethodDocumentation` | Get data method documentation |
| 43 | `getFactor` | Read factor details |
| 44 | `getFactorAnalysisResult` | Get factor analysis result |
| 45 | `getFactorCodeEditContext` | Get factor edit context |
| 46 | `getFactorDraft` | View factor draft |
| 47 | `getFactorOptimizationContext` | Get factor optimization context |
| 48 | `getFutureFactor` | Get futures factor |
| 49 | `getFutureStrategy` | View futures strategy |
| 50 | `getFutureStrategyDraft` | View futures strategy draft |
| 51 | `getStrategyBacktestResult` | Get strategy backtest result |
| 52 | `getStrategyCodeEditContext` | Get strategy edit context |
| 53 | `getStrategyOptimizationContext` | Get strategy optimization context |
| 54 | `getStrategyParameterTuning` | Get strategy parameter tuning |
| 55 | `listCnStockStrategies` | Read A-share strategy list |
| 56 | `listFactorAnalysisHistory` | Read factor analysis history |
| 57 | `listFactorVersions` | Read factor versions |
| 58 | `listFactors` | Read factor library |
| 59 | `listParameterTuningTasks` | List parameter-tuning tasks |
| 60 | `listRecentResearchRuns` | List recent research runs |
| 61 | `listSimulationAccounts` | List simulation accounts |
| 62 | `listStrategies` | List strategies |
| 63 | `listStrategyBacktestHistory` | List strategy backtest history |
| 64 | `listStrategyVersions` | Read strategy versions |
| 65 | `loadFactorReferences` | Load factor references |
| 66 | `loadStrategyReferences` | Load strategy references |
| 67 | `optimizeCurrentFactor` | Optimize current factor |
| 68 | `optimizeCurrentStrategy` | Optimize current strategy |
| 69 | `queryCnFundData` | Query fund data |
| 70 | `queryCnFutureData` | Query futures data |
| 71 | `queryCnStockData` | Query A-share data |
| 72 | `queryHkData` | Query HK data |
| 73 | `queryUsData` | Query US data |
| 74 | `readQuantSkillFile` | Read quant skill file |
| 75 | `renameFactorVersion` | Rename factor version |
| 76 | `renameStrategyVersion` | Rename strategy version |
| 77 | `requestFactorSelection` | Select factor |
| 78 | `requestSimulationAccountSelection` | Select simulation account |
| 79 | `requestStrategySelection` | Select strategy |
| 80 | `resolveCnStockUniverse` | Resolve A-share universe |
| 81 | `resolveDataAsset` | Resolve data asset |
| 82 | `resolveFutureUniverse` | Resolve futures universe |
| 83 | `restoreFactorVersion` | Restore factor version |
| 84 | `restoreStrategyVersion` | Restore strategy version |
| 85 | `runCnStockStrategyBacktest` | Run A-share strategy backtest |
| 86 | `runFactorAnalysis` | Run factor analysis |
| 87 | `runQuantSkill` | Run quant skill |
| 88 | `runStrategyBacktest` | Run strategy backtest |
| 89 | `searchFactorReferences` | Search factor references |
| 90 | `searchQuantSkills` | Search quant skills |
| 91 | `searchStrategyReferences` | Search strategy references |
| 92 | `searchTools` | Search data tools |
| 93 | `transcribeStrategy` | Transcribe strategy |
| 94 | `updateCnStockStrategyBacktestParams` | Update A-share strategy backtest parameters |
| 95 | `updateFactorSettings` | Update factor settings |
| 96 | `updateStrategySettings` | Update strategy settings |
| 97 | `validateCnEtfStrategyDraft` | Validate ETF strategy draft |
| 98 | `validateCnStockStrategyDraft` | Validate A-share strategy draft |
| 99 | `validateFactorDraft` | Validate factor draft |
| 100 | `validateFutureStrategyDraft` | Validate futures strategy draft |
| 101 | `writeQuantSkillFile` | Write quant skill file |

## Capabilities

| # | name | label |
|---|---|---|
| 1 | `cnEtfAuthoring` | ETF strategy creation |
| 2 | `cnEtfCodegen` | ETF strategy code generation |
| 3 | `cnStock` | A-share strategies |
| 4 | `cnStockAuthoring` | A-share strategy creation |
| 5 | `cnStockCodegen` | A-share strategy code generation |
| 6 | `dataCnFund` | Fund data query |
| 7 | `dataCnFuture` | Futures data query |
| 8 | `dataCnStock` | A-share data query |
| 9 | `dataHk` | HK data query |
| 10 | `dataUs` | US data query |
| 11 | `factorCnStock` | CN stock factors |
| 12 | `factorCnStockAuthoring` | A-share factor creation |
| 13 | `factorCnStockCodegen` | A-share factor code generation |
| 14 | `factorFuture` | Futures factors |
| 15 | `factorFutureAuthoring` | Futures factor creation |
| 16 | `factorFutureCodegen` | Futures factor code generation |
| 17 | `factorHkAuthoring` | HK factor creation |
| 18 | `factorHkCodegen` | HK factor code generation |
| 19 | `factorLibrary` | Factor library |
| 20 | `factorManage` | Factor management |
| 21 | `factorOptimize` | Factor optimization |
| 22 | `factorRun` | Factor analysis |
| 23 | `factorUsAuthoring` | US factor creation |
| 24 | `factorUsCodegen` | US factor code generation |
| 25 | `factorVersion` | Factor versions |
| 26 | `quantSkills` | Quant skills |
| 27 | `researchOverview` | Research overview |
| 28 | `simulationAccount` | Simulation accounts |
| 29 | `strategyCuratedTemplate` | Curated strategy creation |
| 30 | `strategyCuratedTemplateReferenceGenerate` | Curated strategy reference generation |
| 31 | `strategyFuture` | Futures strategy |
| 32 | `strategyFutureAuthoring` | Futures strategy creation |
| 33 | `strategyFutureCodegen` | Futures strategy code generation |
| 34 | `strategyHkAuthoring` | HK strategy creation |
| 35 | `strategyHkCodegen` | HK strategy code generation |
| 36 | `strategyLibrary` | Strategy library |
| 37 | `strategyManage` | Strategy management |
| 38 | `strategyOptimize` | Strategy optimization |
| 39 | `strategyParameterTuning` | Strategy parameter tuning |
| 40 | `strategyRun` | Strategy backtests |
| 41 | `strategyUsAuthoring` | US strategy creation |
| 42 | `strategyUsCodegen` | US strategy code generation |
| 43 | `strategyVersion` | Strategy versions |
| 44 | `transcription` | Strategy transcription |
| 45 | `transcriptionJoinquant` | JoinQuant strategy transcription |
| 46 | `transcriptionPtrade` | PTrade strategy transcription |
| 47 | `transcriptionQmt` | QMT strategy transcription |
