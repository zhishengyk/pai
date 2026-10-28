# Qube `chat-api` excerpt

Source (original): `agent_quant/assets/chat-api-BkRzIk_k.js`
SHA-256: `ce45f45d11c12c5868c4f2c1cb5a5267d5f6afb55ba2119eaa57aea152329a39`

Local formatted file:
`/home/duansx/Desktop/pandaaiquant-client-recovered/agent_quant/assets/chat-api-BkRzIk_k.js`

## Event projector

```js
function s(e, t) {
  if (t.op === `create`) return e.some((e) => e.part_id === t.part.part_id) ? e : [...e, o(t.part)];
  let n = e.findIndex((e) => e.part_id === t.part_id);
  if (n < 0) return e;
  let i = [...e], a = i[n];
  if (t.op === `append`) {
    if (a.category === `card`) return e;
    i[n] = { ...a, content: `${r(a.content)}${t.delta}` };
  } else i[n] = o({ ...a, ...t.patch });
  return i;
}

function d(e, t) {
  let n = Number(t.sequence ?? 0);
  if (!Number.isFinite(n) || n <= e.lastSequence) return e;
  let r = e.parts;
  for (let e of u(t.mutations)) r = s(r, e);
  if (t.event_type === `run.completed` || t.event_type === `run.failed` || t.event_type === `run.cancelled`) {
    let e = t.event_type === `run.failed` ? `failed` : t.event_type === `run.cancelled` ? `cancelled` : `completed`;
    r = r.map((r) =>
      r.status === `running` ? { ...r, status: e, end_sequence: n, finished_at: t.created_at ?? r.finished_at } : r,
    );
  }
  return { parts: r, lastSequence: n, lastRedisId: t.redis_stream_id ?? e.lastRedisId };
}
```

## Run creation and approvals

```js
async function P(t) {
  let n = v(await e.POST(`/api/chat/runs`, {
    body: {
      ...t,
      approval_mode: t.approval_mode ?? `auto`,
      active_strategy_dirty: t.active_strategy_dirty ?? !1,
      active_factor_dirty: t.active_factor_dirty ?? !1,
      ...(t.active_simulation_account_id
        ? { active_simulation_account_id: t.active_simulation_account_id }
        : {}),
    },
  }));
  return _(), n;
}

async function z(n) {
  let r = await e.POST(
    `/api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/resolve`,
    {
      params: { path: { run_id: n.runId, approval_id: n.approvalId } },
      body: { decision: n.decision, ...(n.backtest ? { backtest: t(n.backtest, n.market ?? `stock`) } : {}) },
    },
  );
  if (r.error) throw r.error;
}
```

The file exports short names (`P`, `F`, `R`, `z`, `V`, …); the role mapping is:
run create, retry, cancel, strategy-create approval, strategy-run approval.
The full contract table is in [`../../code-map/qube.md`](../../code-map/qube.md).
