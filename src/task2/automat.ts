import { writeFile } from 'node:fs/promises';

export async function getToken(
  authority: string,
  audience: string,
  clientId: string,
  clientSecret: string,
  scope: string
): Promise<string> {
  const res = await fetch(`${authority.replace(/\/+$/, '')}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience,
      scope,
    }),
  });

  if (!res.ok) {
    throw new Error(`Dohvat tokena nije uspio: status ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Dohvat tokena nije uspio: odgovor ne sadrži access_token');
  }
  return data.access_token;
}

export async function issuePass(
  url: string,
  token: string,
  name: string,
  document: string
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, document }),
  });

  if (res.status !== 201) {
    throw new Error(`Izdavanje propusnice nije uspjelo: status ${res.status} ${res.statusText}`);
  }

  const location = res.headers.get('Location');
  if (!location) {
    throw new Error('Odgovor ne sadrži zaglavlje Location');
  }

  const path = location.split(/[?#]/)[0];
  const id = path.split('/').filter(Boolean).pop() ?? '';
  if (!/^[\w-]+$/.test(id)) {
    throw new Error(`Neispravan identifikator u zaglavlju Location: ${location}`);
  }

  const png = Buffer.from(await res.arrayBuffer());
  await writeFile(`${id}.png`, png);
}