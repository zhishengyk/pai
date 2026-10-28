export function initSSE(res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.flushHeaders?.();
  res.write('retry: 1000\n\n');
}

export function writeSSE(res, event) {
  if (res.writableEnded || res.destroyed) return false;
  const eventId = event.sequence ?? event.seq ?? event.event_id ?? '';
  if (eventId !== '') res.write(`id: ${eventId}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  return true;
}

export function writeHeartbeat(res) {
  if (!res.writableEnded && !res.destroyed) res.write(': heartbeat\n\n');
}
