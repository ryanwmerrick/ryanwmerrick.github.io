// Where the league's data lives: a Cloudflare Worker with a D1 database (source in /_nhl-api).
// There's no secret here; the Worker decides what the page is allowed to do.
export const API_URL = 'https://nhl-api.ryan-610.workers.dev';
