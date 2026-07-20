/**
 * Lightweight authenticated proxy helper for Whop REST API.
 * Uses the Replit Connectors proxy — no credentials in source code.
 * Server-side only. Never import this in frontend code.
 */

export async function whopFetch(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<unknown> {
  const hostname = process.env['REPLIT_CONNECTORS_HOSTNAME'];
  const replIdentity = process.env['REPL_IDENTITY'];
  const webReplRenewal = process.env['WEB_REPL_RENEWAL'];
  const token = replIdentity
    ? `repl ${replIdentity}`
    : webReplRenewal
      ? `depl ${webReplRenewal}`
      : null;

  if (!hostname || !token) {
    throw new Error(
      'Whop connector not available. Ensure the Whop integration is connected.',
    );
  }

  const res = await fetch(`https://${hostname}/api/v2/proxy${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Replit-Token': token,
      'Connector-Name': 'whop',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(
      `Whop API ${method} ${path} → HTTP ${res.status}: ${JSON.stringify(json)}`,
    );
  }

  return json;
}
