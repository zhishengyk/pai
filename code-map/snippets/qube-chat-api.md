# Qube snippets

Short interoperability excerpts from the public bundles. Full files are not
included. Offsets are character offsets in the UTF-8 decoded file (see
[`../inventory.json`](../inventory.json)).

## `assets/query-keys-hu8Y4jsT.js`

SHA-256: `ba979e03f8b6b01e842116500e08358b8a1123463916fe6acd048c9cbe53567d`
Base/auth constants at offset 1,340:

```js
ue=`/pandaApi/agent_quant`.replace(/\/$/,``), fe=`/login`, pe=V?`/tqxApi`:`/pandaApi`
...
Z={token:`token`,refreshToken:`refreshToken`,uid:`userid`}
...
function Ae(){return typeof window>`u`?null:window.localStorage.getItem(Z.token)}
function Be(e){let t={"Accept-Language":e,"X-POC-Locale":e},n=Ae();return n&&(t.Authorization=n),t}
```

401 interceptor at offset 86,287:

```js
var rs={async onResponse({response:e,request:t}){
  let n=new URL(t.url).pathname.endsWith(`/api/auth/me`);
  if(e.status!==401||n||typeof window>`u`)return;
  let r=await ts(t);
  if(r)return r;
  ns()
}}
```

The interceptor refreshes/clears auth and redirects to `/login?redirect=...`
unless the failing call is `/api/auth/me` itself.

## `assets/chat-api-BkRzIk_k.js`

SHA-256: `ce45f45d11c12c5868c4f2c1cb5a5267d5f6afb55ba2119eaa57aea152329a39`

### Event projector

Offsets 1,316 (`lastSequence`), 1,369 (`mutations`), 1,394 (`event_type`):

```js
function s(e,t){
  if(t.op===`create`)
    return e.some(e=>e.part_id===t.part.part_id)?e:[...e,o(t.part)];
  let n=e.findIndex(e=>e.part_id===t.part_id);
  if(n<0)return e;
  let i=[...e],a=i[n];
  if(t.op===`append`){
    if(a.category===`card`)return e;
    i[n]={...a,content:`${r(a.content)}${t.delta}`}
  }else i[n]=o({...a,...t.patch});
  return i
}
function d(e,t){
  let n=Number(t.sequence??0);
  if(!Number.isFinite(n)||n<=e.lastSequence)return e;
  let r=e.parts;
  for(let e of u(t.mutations))r=s(r,e);
  if(t.event_type===`run.completed`||t.event_type===`run.failed`||t.event_type===`run.cancelled`){
    // running parts -> completed / failed / cancelled
  }
  return{parts:r,lastSequence:n,lastRedisId:t.redis_stream_id??e.lastRedisId}
}
```

### Create run

Offset 4,645:

```js
async function P(t){
  let n=v(await e.POST(`/api/chat/runs`,{body:{
    ...t,
    approval_mode:t.approval_mode??`auto`,
    active_strategy_dirty:t.active_strategy_dirty??!1,
    active_factor_dirty:t.active_factor_dirty??!1,
    ...t.active_simulation_account_id
      ?{active_simulation_account_id:t.active_simulation_account_id}
      :{}
  }}));
  return _(),n
}
```

### Approval resolve

Offsets 6,017 (strategy create) and 6,477 (strategy run):

```js
async function z(n){
  let r=await e.POST(
    `/api/chat/runs/{run_id}/strategy-create-approvals/{approval_id}/resolve`,
    {params:{path:{run_id:n.runId,approval_id:n.approvalId}},
     body:{decision:n.decision,...n.backtest?{backtest:t(n.backtest,n.market??`stock`)}:{}}}
  );
  if(r.error)throw r.error
}
async function V(t){
  return v(await e.POST(
    `/api/chat/runs/{run_id}/strategy-run-approvals/{approval_id}/resolve`,
    {params:{path:{run_id:t.runId,approval_id:t.approvalId}},
     body:{decision:t.decision}}
  ))
}
```

### Cancel / retry / resend

Offsets 5,868 (cancel) and 4,965 (retry):

```js
async function R(t){
  let n=await e.POST(`/api/chat/runs/{run_id}/cancel`,{params:{path:{run_id:t}}});
  if(n.error)throw n.error
}
```

Resend is a new run with `input`, context ids and flags; see
[`../../code-map/qube.md`](../qube.md) for the full body.

## `assets/auth-provider-C7ie0Npj.js`

SHA-256: `dd71457e22a346ccfbee7ac5fabb82761cdf930c84d4dc295ed3a8f379bcc20f`

Key behavior at offsets 2,302 and 2,847:

```js
// status: "authenticated" when a validated user is present
// subscribes to localStorage changes for the auth keys
window.addEventListener(`storage`, t)
```

The provider validates `{ id, username, avatar }`; it does not perform password
login. Authentication is injected by the main site / Java gateway.
