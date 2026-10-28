export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function sendJson(res, status, payload) {
  if (res.writableEnded || res.destroyed) return;
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

export function sendError(res, status, message, details = undefined) {
  sendJson(res, status, {
    code: status,
    message,
    ...(details === undefined ? {} : { details }),
  });
}

export async function readJson(req, limit = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'request body too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid JSON body');
  }
}

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, handler) {
    this.routes.push({
      method: method.toUpperCase(),
      path,
      regex: compile(path),
      keys: path.split('/').filter((part) => part.startsWith(':')).map((part) => part.slice(1)),
      handler,
    });
    return this;
  }

  get(path, handler) {
    return this.add('GET', path, handler);
  }

  post(path, handler) {
    return this.add('POST', path, handler);
  }

  patch(path, handler) {
    return this.add('PATCH', path, handler);
  }

  put(path, handler) {
    return this.add('PUT', path, handler);
  }

  delete(path, handler) {
    return this.add('DELETE', path, handler);
  }

  match(method, pathname) {
    const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    for (const route of this.routes) {
      if (route.method !== method.toUpperCase()) continue;
      const result = route.regex.exec(normalized);
      if (!result) continue;
      const params = {};
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(result[index + 1]);
      });
      return { ...route, params };
    }
    return null;
  }

  async handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const match = this.match(req.method, url.pathname);
    if (!match) return false;
    try {
      await match.handler({
        req,
        res,
        url,
        params: match.params,
        query: url.searchParams,
      });
    } catch (error) {
      if (error instanceof HttpError) {
        if (!res.headersSent) sendError(res, error.status, error.message, error.details);
        else res.end();
      } else {
        if (!res.headersSent) sendError(res, 500, error?.message || 'internal error');
        else res.end();
      }
    }
    return true;
  }
}

function compile(path) {
  const parts = path.split('/').map((part) => {
    if (part.startsWith(':')) return '([^/]+)';
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp(`^${parts.join('/')}/?$`);
}
