import {Pool} from 'pg';        //omogucuje komunikaciju node-a i pg-a
import dotenv from 'dotenv';

dotenv.config();                //ucitava env i varijable iz nje stavlja u process.env

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,     //iz process.env izvlacim database_url
    ssl: true,                                      //sifrirana veza koju zahtjeva render
});

export async function initDb(): Promise<void> {     //funkcija radi novu tablicu ako ona vec ne postoji
                                                    //tablica sadrzi id, name, vrijeme stvaranja i status
  await pool.query(`
    CREATE TABLE IF NOT EXISTS passes (             
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      document TEXT NOT NULL,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'CANCELLED'))
    )
  `);
}
//izgled jedne propusnice
export interface Pass{
    id: string;
    name: string;
    document:string;
    issued_at: Date;
    status: 'ACTIVE' | 'CANCELLED';
}

//provjera formata UUID-a za gresku 404 ako nije dobar
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string): boolean => UUID_RE.test(s);

//funkcija vraca dva broja: ukupni broj propusnica i broj aktivnih propusnica
export async function getStats(): Promise<{ total: number; active: number }> {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active
     FROM passes`
  );
  return r.rows[0];
}

//funkcija vraca polje svih propusnica sortirane od najnovije prema najstarijoj
export async function listPasses(): Promise<Pass[]> {
  const r = await pool.query(
    'SELECT id, name, document, issued_at, status FROM passes ORDER BY issued_at DESC'
  );
  return r.rows;
}

//funkcija dohvaca jednu propusnicu po ID-u, ako UUID nije valjan vraca null, ako redak ne postoji isto vraca null
export async function getPass(id: string): Promise<Pass | null> {
  if (!isUuid(id)) return null;
  const r = await pool.query(
    'SELECT id, name, document, issued_at, status FROM passes WHERE id = $1',
    [id]                        //koristi se polje[id] kako bi se zastitilo od SQL injectiona
  );
  return r.rows[0] ?? null;
}

//funkcija koja mijenja status propusnice u CANCELLED
export async function cancelPass(id: string): Promise<void> {
  if (!isUuid(id)) return;
  await pool.query(`UPDATE passes SET status = 'CANCELLED' WHERE id = $1`, [id]);
}

//funkcija koja brise propusnicu po ID-u
export async function deletePass(id: string): Promise<void> {
  if (!isUuid(id)) return;
  await pool.query('DELETE FROM passes WHERE id = $1', [id]);
}