# REA Evidence

REA 6.8.0 was used for static JavaScript application analysis. Evidence bundles remain in the original analysis workspace; this table is the compact projection.

## quantflow

- evidence id: `ev_12bfd1c6aa70ebd7606a826b613f6413fd18dd257a4f4b21a77f2e5f1457a1fa`
- subject: `quantflow`

Statistics:

```json
{
  "findings": 2669,
  "invalid_utf8_files": 0,
  "modules": 0,
  "nested_asar_containers": 0,
  "parse_failures": 0,
  "parsed_javascript_files": 143,
  "relevant_files": 146,
  "skipped_javascript_files": 1,
  "text_bytes_read": 16830873,
  "visited_ast_nodes": 647555
}
```

- semantic nodes: 90899
- semantic relations: 162339

Node kinds:

```json
{
  "function": 5967,
  "expression": 41635,
  "call-site": 14633,
  "binding": 15088,
  "property-slot": 2767,
  "return-site": 4713,
  "parameter": 5355,
  "module": 144,
  "boundary": 203,
  "task": 204,
  "literal": 116,
  "event": 11,
  "timer": 31,
  "listener": 11,
  "promise": 21
}
```

Relation types:

```json
{
  "aliases": 95472,
  "captures": 30831,
  "reads": 14081,
  "returns-to-call": 1084,
  "defines": 13322,
  "calls": 1478,
  "reads-property": 3725,
  "writes-property": 1050,
  "writes": 568,
  "coerces": 192,
  "argument-to-parameter": 214,
  "awaits": 207,
  "parses": 11,
  "schedules-timer": 31,
  "spreads": 13,
  "chains": 8,
  "cancels-timer": 13,
  "creates-promise": 21,
  "detaches-task": 3,
  "registers-listener": 11,
  "returns-task": 4
}
```

- REA route inventory: 2 items

| path | classification | confidence |
|---|---|---|
| /creator | unknown | low |
| /workflow | unknown | low |

Limitations:

- Alias selection expansion was conservatively bounded (maximum 512 additional selector states); selected paths remain unknown.
- CommonJS and ESM binding relationships were recovered from inert syntax and resolved only within the inventoried artifact container.
- Graph coverage is incomplete; unavailable facts remain explicit and must not be read as absence.
- JavaScript and HTML were parsed as inert text; bundle bootstrap code was never executed.
- Resource constraint during analyze_javascript_application: Expanded application relationships for assets/csharp-DpsmwUPI.js exceed the parent's result budget; complete static facts were retained on the file node
- Resource constraint during analyze_javascript_application: Expanded application relationships for assets/csp-KjEhg7c5.js exceed the parent's result budget; complete static facts were retained on the file node
- Resource constraint during analyze_javascript_application: Expanded application relationships for assets/css-CVVx9CO5.js exceed the parent's result budget; complete static facts were retained on the file node
- Resource constraint during analyze_javascript_application: Expanded application relationships for assets/cssMode-Cs4AVpeK.js exceed the parent's result budget; complete static facts were retained on the file node

## agent_quant

- evidence id: `ev_d235b169a3c592c0d5236dab15a29299ba8a986671cc1ae5136d6280758a7750`
- subject: `agent_quant`

Statistics:

```json
{
  "findings": 763,
  "invalid_utf8_files": 0,
  "modules": 0,
  "nested_asar_containers": 0,
  "parse_failures": 0,
  "parsed_javascript_files": 25,
  "relevant_files": 41,
  "skipped_javascript_files": 0,
  "text_bytes_read": 197193,
  "visited_ast_nodes": 57272
}
```

- semantic nodes: 37021
- semantic relations: 44481

Node kinds:

```json
{
  "property-slot": 2158,
  "call-site": 3739,
  "function": 1412,
  "expression": 24148,
  "parameter": 1353,
  "return-site": 1165,
  "binding": 2642,
  "literal": 180,
  "module": 39,
  "event": 2,
  "task": 81,
  "promise": 49,
  "boundary": 41,
  "listener": 2,
  "timer": 6,
  "request": 3,
  "response": 1
}
```

Relation types:

```json
{
  "reads-property": 2799,
  "reads": 9740,
  "defines": 5237,
  "aliases": 19064,
  "captures": 3894,
  "argument-to-parameter": 984,
  "returns-to-call": 806,
  "coerces": 31,
  "calls": 762,
  "writes": 207,
  "writes-property": 469,
  "spreads": 108,
  "validates": 8,
  "destructures": 186,
  "awaits": 81,
  "chains": 13,
  "returns-task": 15,
  "creates-promise": 49,
  "schedules-timer": 6,
  "owns": 6,
  "supplies-request-field": 5,
  "dispatches-candidate": 1,
  "constructs-request": 3,
  "detaches-task": 2,
  "parses": 2,
  "registers-listener": 1,
  "consumed-by": 1,
  "removes-listener": 1
}
```

- REA route inventory: 0 items

Limitations:

- Caller-selected source analysis leaves 16 inventoried files outside analysis scope. Inventory identity covers the complete artifact; relationships through unselected sources remain unknown.
- CommonJS and ESM binding relationships were recovered from inert syntax and resolved only within the inventoried artifact container.
- Graph coverage is incomplete; unavailable facts remain explicit and must not be read as absence.
- JavaScript and HTML were parsed as inert text; bundle bootstrap code was never executed.
- Static imports, entrypoints, workers, endpoints, and storage relationships do not prove runtime execution.
- Static paths and relationships may remain unresolved when expressions are dynamic or obfuscated.
- Webpack/Rspack factories were recovered from AST literals; REA did not invoke push handlers or bundle bootstrap code.
