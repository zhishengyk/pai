# QuantFlow snippets

Short interoperability excerpts from the public bundles. Full files are not
included. Offsets are character offsets in the UTF-8 decoded file (see
[`../inventory.json`](../inventory.json)).

## `assets/Quantflow-CFbBdo_1.js`

SHA-256: `16fac899070aec49e3d89a3d673a0ec5c43a354822d7fba4b28685cca1654187`
Bytes: 328,749

### Stream request

Offset 146,958 (`workflow-graph/stream`) and 146,982 (request body):

```js
const c="/pandaApi/quantflow/api/workflow-graph/stream",u=Ne();
let v=null;
try{
  const e=window.serializeWorkflowData;
  if(e&&"function"==typeof e){
    const t=e();
    t&&t.nodes&&t.nodes.length>0&&(v=t)
  }
}catch(x){}
const p={model:he.value,message:d};
r&&r.workflowSessionId&&(p.workflow_session_id=r.workflowSessionId);
u&&(p.base_workflow_id=u);
v&&(p.existing_workflow=v);
const g=ze(o);
g.abortController=new AbortController;
```

`message` can include a fenced Python block built from the active node code
(offset 146,982). `existing_workflow` is the current canvas graph.

### Stage switch

Offset 148,925 (the `switch` starts a few characters earlier; stage terms are at
148,947–149,460):

```js
switch(t){
  case"architect":
  case"workflow_layout":
  case"workflow_generating":
  case"code_merged":
  case"workflow_structure_complete":
  case"result":
    g&&(o=g);
    break;
  case"workflow_init":
    if(g&&(o=g),e.data?.nodes&&r.messages[a]){
      const t=e.data.nodes;
      if(t&&Object.keys(t).length>0){
        const e=Object.entries(t).map(([e,t])=>({uuid:e,name:t,status:"waiting",expanded:!1}));
        r.messages[a].workflowData={progress:0,nodes:e}
      }
    }
    break;
  case"workflow_complete_success":
    g&&(o=g);
    r.messages[a]?.workflowData&&(r.messages[a].workflowData.progress=1);
    break;
  case"END":
    if(g&&(o=g),r.messages[a]?.workflowData){
      const t=r.messages[a].workflowData;
      g&&(t.endMessage=g);
      void 0!==e.data?.total_time&&(t.totalTime=Se(e.data.total_time));
      t.progress=1;
      // revision/content-hash finalization follows
    }
    break;
}
```

The event also carries `workflow_progress`, `workflow_json`, `revision_id`,
`content_hash`, `node_desc_map` and `intent` depending on the stage.

### `node_desc_map` / progress

Offset 151,170 (`workflow_progress`) and 151,555 (`node_desc_map`):

```js
if(void 0!==e.data?.workflow_progress)
  t.progress=e.data.workflow_progress;

if(e.data?.node_desc_map){
  const a=e.data.node_desc_map;
  t.nodes.forEach(e=>{
    if(a[e.uuid]){
      e.status="completed";
      const t=a[e.uuid];
      "object"==typeof t&&t.description
        ?e.description=t.description
        :"string"==typeof t&&(e.description=t),
      "object"==typeof t&&void 0!==t.time&&(e.time=Se(t.time))
    }
  })
}
```

The client treats `progress >= .99` or `progress === 1` as final and calls
`window.setWorkflowDataFromSSE(workflow_json, {isFinal, routeSignature})`.

### Checkpoint

Offset 140,002 (`sessions/checkpoint`) and 140,125 (`workflow_json`):

```js
const e=await $("/pandaApi/quantflow/api/workflow-graph/sessions/checkpoint",{
  basePath:"panda_api",
  params:{session_id:o,revision_id:n}
});
if(0===e.code&&e.data?.workflow_json){
  const t=window.setWorkflowDataFromSSE;
  t&&"function"==typeof t&&(await t(e.data.workflow_json),
    h.currentRevisionId=n,
    /* rewrite assistant messages with matching revision/hash */)
}
```

Revision matching uses `revisionId` and `contentHash`; `currentRevisionId` and
`checkpoint_content_hash` are compared at offset 136,660.

### Run, terminate, logs

Offsets 241,225 (`run_with_store`), 242,843 (`terminate_with_store`) and 278,484
(`/api/workflow/run/log`):

```js
const c=await Z("/api/workflow/run_with_store",
  {workflow_id:e,...a},{basePath:"app_api"});
// 401 -> clear auth; 403 -> permission warning
// 200/0 -> c.data.workflow_run_id

const a=await Z("/api/workflow/run/terminate_with_store",
  {workflow_run_id:e},{basePath:"app_api"});

const o={workflow_id:U.workflow_id,limit:Number(j.value)};
if(e&&(o.last_sequence=e),null!==p.value&&(o.log_level=p.value),
   "ALL"!==me.value&&(o.work_node_id=me.value),
   !U.workflow_run_id)return!1;
o.workflow_run_id=U.workflow_run_id;
const i=await $("/api/workflow/run/log",{basePath:"app_api",params:o});
```

Logs are incremental via `last_sequence`; the UI appends `logs[]` and can filter
by `log_level` and `work_node_id`.

### Output

Observed path: `/api/workflow/run/output?output_obj_id=<id>`.
The output object is separate from the run record; the run only keeps the object
id.

## `assets/main-C0byxrRt.js`

SHA-256: `0f6cdc8aa5a255efd2e244c37c15ab7bdbd7662c5094d7adb2fc2d447bb95001`

Streaming detection at offset 6,632,651 (`responseBodyLooksLikeStreaming`) and
6,642,068 (`text/event-stream`):

```js
function responseBodyLooksLikeStreaming(e){
  const t=(e.headers.get("content-type")||"").toLowerCase();
  return t.includes("text/event-stream")
    || t.includes("application/x-ndjson")
    || t.includes("application/stream+json")
}
```

The client accepts SSE, NDJSON and `application/stream+json`; the QuantFlow
reader stops on `[DONE]`.

## `assets/Workflow-CA6TBoMa.js`

SHA-256: `6784ba8a406b28d18e68327f650e6c608b44b0dcd355a53111acc0e9925a7d08`
Offset 2,051: `/workflow/editor` route. Navigation uses
`/workflow/editor?workflow_id=<id>` (see `Header` / `ChartsView`).

## `assets/SidebarLayout-DQ6ickQk.js`

SHA-256: `ce9405fb003b7211f2e8a4b8d5dfcc2c86e6b2113d620160c93b7ca474cbd718`
Offset 93,848: `/pandaApi/quantflow/api/workflow/run/list` with `limit`, `page`,
`workflow_id`.

See [`../quantflow.md`](../quantflow.md) for the full map and
[`../contracts.md`](../contracts.md) for the endpoint tables.
