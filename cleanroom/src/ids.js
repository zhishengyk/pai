import { createHash, randomUUID } from 'node:crypto';

export function id(prefix) {
  return `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function shortHash(value) {
  return sha256(value).slice(0, 16);
}

export function now() {
  return new Date().toISOString();
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
