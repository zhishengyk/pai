#!/usr/bin/env node
// Static client inventory for the public Qube and QuantFlow bundles.
//
// Uses the Babel parser shipped with REA for syntax-level facts. No JavaScript
// is executed. This script does not copy the bundles; it records locations so
// the corresponding REA evidence and local files can be inspected.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = parseArgs(process.argv.slice(2));
if (!args.agentQuant || !args.quantflow || !args.out) {
  console.error('usage: scan_client.mjs --agent-quant <dir> --quantflow <dir> --out <manifest.json> [--babel <parser>] [--max-ast-bytes 5000000]');
  process.exit(2);
}

const BABEL = args.babel || '/tmp/opencode/node/lib/node_modules/rea-agents/node_modules/@babel/parser/lib/index.js';
const parserModule = await import(pathToFileURL(BABEL).href);
const parse = parserModule.parse ?? parserModule.default?.parse;
if (typeof parse !== 'function') throw new Error(`cannot load Babel parser from ${BABEL}`);

const MAX_AST_BYTES = Number(args.maxAstBytes || 5_000_000);
const manifest = {
  generated_at: new Date().toISOString(),
  method: 'static Babel AST scan; REA JavaScript application analysis used for semantic graph evidence',
  babel_parser: BABEL,
  apps: {},
};

for (const [app, root] of Object.entries({ agent_quant: args.agentQuant, quantflow: args.quantflow })) {
  manifest.apps[app] = scanApp(app, resolve(root));
}

mkdirSync(dirname(resolve(args.out)), { recursive: true });
writeFileSync(args.out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${args.out}`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[name] = value;
    i += 1;
  }
  return out;
}

function scanApp(app, root) {
  const files = [];
  const all = walkFiles(root);
  const stats = {
    files: all.length,
    parsed: 0,
    parse_errors: 0,
    ast_skipped_large: 0,
    bytes: 0,
    api_paths: new Set(),
    routes: new Set(),
    components: new Set(),
    imports: 0,
  };

  for (const file of all) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const text = readFileSync(file, 'utf8');
    const bytes = Buffer.byteLength(text);
    stats.bytes += bytes;
    const entry = {
      path: rel,
      bytes,
      sha256: sha256(text),
      ext: file.slice(file.lastIndexOf('.')),
      imports: [],
      exports: [],
      top_level: [],
      named_functions: [],
      components: [],
      api_calls: [],
      routes: [],
      prompt_samples: [],
      ast_skipped_large: false,
      parse_errors: [],
      counts: {},
    };

    if (entry.ext === '.js' || entry.ext === '.mjs') {
      if (bytes > MAX_AST_BYTES) {
        entry.ast_skipped_large = true;
        stats.ast_skipped_large += 1;
        scanLargeRaw(entry, text);
      } else {
        try {
          const ast = parse(text, {
            sourceType: 'unambiguous',
            errorRecovery: true,
            plugins: [
              'jsx',
              'dynamicImport',
              'importMeta',
              'topLevelAwait',
              'classProperties',
              'classPrivateProperties',
              'classPrivateMethods',
              'decorators-legacy',
              'exportDefaultFrom',
              'exportNamespaceFrom',
              'optionalChaining',
              'nullishCoalescingOperator',
              'numericSeparator',
              'logicalAssignment',
              'topLevelAwait',
            ],
          });
          stats.parsed += 1;
          scanAst(entry, ast, rel);
          if (ast.errors?.length) {
            entry.parse_errors.push(...ast.errors.slice(0, 3).map((error) => error.message));
          }
        } catch (error) {
          stats.parse_errors += 1;
          entry.parse_errors.push(String(error?.message ?? error));
          scanLargeRaw(entry, text);
        }
      }
    } else if (entry.ext === '.html') {
      const scripts = [...text.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m) => m[1]);
      entry.scripts = [...new Set(scripts)];
    }

    for (const api of entry.api_calls) stats.api_paths.add(`${api.method} ${api.path}`);
    for (const route of entry.routes) stats.routes.add(route.path);
    for (const component of entry.components) stats.components.add(component);
    stats.imports += entry.imports.length;
    files.push(entry);
  }

  return {
    root,
    stats: {
      ...stats,
      api_paths: [...stats.api_paths].sort(),
      routes: [...stats.routes].sort(),
      components: [...stats.components].sort(),
    },
    files,
  };
}

function scanAst(entry, ast, rel) {
  const imports = new Map();
  const exports = new Set();
  const topLevel = new Set();
  const namedFunctions = new Set();
  const components = new Set();
  const apiCalls = new Map();
  const routes = new Map();
  const promptSamples = [];
  let functionCount = 0;
  let classCount = 0;
  let stringCount = 0;

  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') {
      const source = node.source?.value;
      if (source) {
        const resolved = resolveImport(rel, source);
        imports.set(`${source}->${resolved}`, {
          source,
          resolved,
          specifiers: (node.specifiers ?? []).map((specifier) => ({
            type: specifier.type,
            imported: specifier.imported?.name ?? 'default',
            local: specifier.local?.name ?? null,
          })),
        });
      }
    }
    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' || node.type === 'ExportAllDeclaration') {
      collectExport(exports, node);
    }
    if (node.type === 'FunctionDeclaration' && node.id?.name) topLevel.add(`function ${node.id.name}`);
    if (node.type === 'ClassDeclaration' && node.id?.name) topLevel.add(`class ${node.id.name}`);
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations ?? []) {
        if (decl.id?.name) topLevel.add(`var ${decl.id.name}`);
      }
    }
  }

  walk(ast, (node) => {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression' || node.type === 'ObjectMethod' || node.type === 'ClassMethod') {
      functionCount += 1;
      if (node.id?.name) namedFunctions.add(node.id.name);
      if (node.key?.name) namedFunctions.add(node.key.name);
    }
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      classCount += 1;
      if (node.id?.name) namedFunctions.add(node.id.name);
    }
    if (node.type === 'StringLiteral' || node.type === 'DirectiveLiteral') {
      stringCount += 1;
      classifyString(entry, routes, apiCalls, promptSamples, node.value, node);
    }
    if (node.type === 'TemplateLiteral') {
      const raw = node.quasis?.map((q) => q.value?.cooked ?? '').join('${}') ?? '';
      if (raw) classifyString(entry, routes, apiCalls, promptSamples, raw, node);
    }
    if (node.type === 'ImportExpression' || (node.type === 'CallExpression' && node.callee?.type === 'Import')) {
      const source = node.source?.value ?? node.arguments?.[0]?.value;
      if (typeof source === 'string') {
        imports.set(`dynamic:${source}`, { source, resolved: resolveImport(rel, source), specifiers: [] });
      }
    }
    if (node.type === 'CallExpression') {
      collectCall(entry, apiCalls, routes, node);
    }
    if (node.type === 'ObjectProperty') {
      const key = node.key?.name ?? node.key?.value;
      if (key === '__name' && node.value?.type === 'StringLiteral') components.add(node.value.value);
      if (key === 'name' && node.value?.type === 'StringLiteral' && /^[A-Z][A-Za-z0-9]+$/.test(node.value.value)) {
        components.add(node.value.value);
      }
    }
    if (node.type === 'JSXIdentifier' && /^[A-Z]/.test(node.name)) components.add(node.name);
  });

  entry.imports = [...imports.values()];
  entry.exports = [...exports].sort();
  entry.top_level = [...topLevel].sort();
  entry.named_functions = [...namedFunctions].filter((name) => name.length > 0).sort();
  entry.components = [...components].sort();
  entry.api_calls = [...apiCalls.values()].sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
  entry.routes = [...routes.values()].sort((a, b) => a.path.localeCompare(b.path));
  entry.prompt_samples = promptSamples.slice(0, 80);
  entry.counts = {
    imports: entry.imports.length,
    exports: entry.exports.length,
    top_level: entry.top_level.length,
    named_functions: entry.named_functions.length,
    components: entry.components.length,
    api_calls: entry.api_calls.length,
    routes: entry.routes.length,
    functions: functionCount,
    classes: classCount,
    strings: stringCount,
    prompt_samples: promptSamples.length,
  };
}

function collectExport(exports, node) {
  if (node.type === 'ExportDefaultDeclaration') {
    const name = node.declaration?.id?.name ?? node.declaration?.name;
    exports.add(`default${name ? `:${name}` : ''}`);
    return;
  }
  if (node.type === 'ExportAllDeclaration') {
    exports.add(`* from ${node.source?.value ?? ''}`);
    return;
  }
  for (const specifier of node.specifiers ?? []) {
    exports.add(specifier.exported?.name ?? specifier.local?.name ?? 'unknown');
  }
  if (node.declaration) {
    if (node.declaration.id?.name) exports.add(node.declaration.id.name);
    if (node.declaration.declarations) {
      for (const decl of node.declaration.declarations) if (decl.id?.name) exports.add(decl.id.name);
    }
  }
}

function collectCall(entry, apiCalls, routes, node) {
  const callee = node.callee;
  const first = node.arguments?.[0];
  const pathValue = literalValue(first);
  if (!pathValue) return;

  const calleeName = callee?.type === 'Identifier'
    ? callee.name
    : callee?.type === 'MemberExpression'
      ? callee.property?.name ?? callee.property?.value
      : null;
  const method = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(calleeName)
    ? calleeName
    : ['fetch', '$', 'Z', 'me', 'get', 'post', 'request'].includes(calleeName)
      ? 'REQUEST'
      : null;
  if (!method) return;
  if (!pathValue.startsWith('/')) return;
  const basePath = propertyString(node.arguments?.[1], 'basePath');
  const key = `${method} ${pathValue}`;
  apiCalls.set(key, {
    method,
    path: pathValue,
    basePath,
    location: location(node),
  });
  if (!looksLikeApi(pathValue) && looksLikeRoute(pathValue)) {
    routes.set(pathValue, { path: pathValue, location: location(node) });
  }
}

function classifyString(entry, routes, apiCalls, promptSamples, value, node) {
  if (typeof value !== 'string' || value.length === 0) return;
  if (looksLikeApi(value)) {
    const key = `STRING ${value}`;
    apiCalls.set(key, { method: 'STRING', path: value, location: location(node) });
    return;
  }
  if (looksLikeRoute(value)) {
    routes.set(value, { path: value, location: location(node) });
  }
  if (value.length >= 180 && /prompt|system|skill|agent|tool|You are|你|策略|因子|workflow|backtest|quant/i.test(value)) {
    promptSamples.push({
      preview: value.slice(0, 240),
      chars: value.length,
      location: location(node),
    });
  }
}

function scanLargeRaw(entry, text) {
  const imports = new Map();
  for (const match of text.matchAll(/(?:from|import\()\s*["']([^"']+)["']/g)) {
    const source = match[1];
    imports.set(source, { source, resolved: resolveImport(entry.path, source), specifiers: [] });
  }
  entry.imports = [...imports.values()];
  const api = new Map();
  for (const match of text.matchAll(/["'`](\/(?:pandaApi|api|tqxApi|wxapi|vivisorApi|ipayApi|front)\/[^"'`\s]{1,220})["'`]/g)) {
    api.set(match[1], { method: 'STRING', path: match[1], location: null });
  }
  entry.api_calls = [...api.values()].sort((a, b) => a.path.localeCompare(b.path));
  const routes = new Map();
  for (const match of text.matchAll(/["'`](\/(?:workflow|quantflow|agent_quant|creator|login|docs|evo|contest|factorhub)[^"'`\s]{0,160})["'`]/g)) {
    routes.set(match[1], { path: match[1], location: null });
  }
  entry.routes = [...routes.values()].sort((a, b) => a.path.localeCompare(b.path));
  entry.counts = {
    imports: entry.imports.length,
    exports: 0,
    top_level: 0,
    named_functions: 0,
    components: 0,
    api_calls: entry.api_calls.length,
    routes: entry.routes.length,
    functions: 0,
    classes: 0,
    strings: 0,
    prompt_samples: 0,
  };
  entry.parse_errors.push('AST skipped: file exceeds max AST size; raw string scan used');
}

function walkFiles(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walkFiles(path));
    else out.push(path);
  }
  return out.sort();
}

function walk(node, fn, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, fn, parent);
    return;
  }
  if (typeof node.type === 'string') fn(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra', 'errors', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens'].includes(key)) continue;
    walk(value, fn, node);
  }
}

function literalValue(node) {
  if (!node) return null;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions?.length === 0) return node.quasis?.[0]?.value?.cooked ?? null;
  if (node.type === 'TemplateLiteral') return node.quasis?.map((q) => q.value?.cooked ?? '').join('${}') ?? null;
  return null;
}

function propertyString(node, key) {
  if (!node || node.type !== 'ObjectExpression') return null;
  for (const prop of node.properties ?? []) {
    if ((prop.key?.name ?? prop.key?.value) === key && prop.value?.type === 'StringLiteral') return prop.value.value;
  }
  return null;
}

function looksLikeApi(value) {
  return /^\/(?:pandaApi|api|tqxApi|wxapi|vivisorApi|ipayApi|front)\//.test(value);
}

function looksLikeRoute(value) {
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (looksLikeApi(value)) return false;
  if (/\.(?:js|mjs|css|png|jpe?g|svg|woff2?|json|map|ico|html)(?:\?|$)/i.test(value)) return false;
  if (value.length > 220 || /\s/.test(value)) return false;
  return /^\/(?:workflow|quantflow|agent_quant|creator|login|docs|evo|contest|factorhub|personal|tqx|chat|strategy|factor|backtest|home|user|settings|api|assets)(?:\/|$)/.test(value)
    || /^\/(?:[a-z0-9-]+\/){0,3}[a-z0-9-]*$/i.test(value) && value.split('/').length <= 4;
}

function resolveImport(from, source) {
  if (!source.startsWith('.')) return null;
  return resolve('/', dirname(from), source).replace(/^\//, '');
}

function location(node) {
  const loc = node.loc;
  if (!loc) return null;
  return {
    start: { line: loc.start.line, column: loc.start.column },
    end: { line: loc.end.line, column: loc.end.column },
  };
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}
