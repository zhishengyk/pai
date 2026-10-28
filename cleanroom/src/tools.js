import { readFileSync } from 'node:fs';

export function loadToolCatalog() {
  const url = new URL('../data/qube_agent_tools.json', import.meta.url);
  const catalog = JSON.parse(readFileSync(url, 'utf8'));
  return {
    ...catalog,
    tools_list: Object.entries(catalog.tools).map(([name, label]) => ({ name, label })),
    capabilities_list: Object.entries(catalog.capabilities).map(([name, label]) => ({ name, label })),
  };
}
