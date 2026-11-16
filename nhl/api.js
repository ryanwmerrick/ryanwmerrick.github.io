// Talks to the Cloudflare Worker that holds the league's players and games (source in /_nhl-api).
// Every call resolves to { data, error } and never throws, so callers handle one shape.
import { API_URL } from './config.js?v=23';

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { data: null, error: { message: "Couldn't reach the server. Check your connection and try again.", code: null } };
  }
  if (res.status === 204) return { data: null, error: null };
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { data: null, error: { message: data?.error ?? `Something went wrong (${res.status}).`, code: data?.code ?? null } };
  }
  return { data, error: null };
}

const gamePath = (id) => `/games/${encodeURIComponent(id)}`;

export const api = {
  data: () => call('GET', '/data'),
  version: () => call('GET', '/version'),
  addPlayer: (name) => call('POST', '/players', { name }),
  addGame: (game) => call('POST', '/games', game),
  editGame: (id, game) => call('PATCH', gamePath(id), game),
  deleteGame: (id) => call('DELETE', gamePath(id)),
};
