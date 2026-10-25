import {Pool} from 'pg';        //omogucuje komunikaciju node-a i pg-a
import dotenv from 'dotenv';

dotenv.config();                //ucitava env i varijable iz nje stavlja u process.env

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,     //iz process.env izvlacim database_url
    ssl: true,                                      //sifrirana veza koju zahtjeva render
});

export async function initDb(): Promise<void> {
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
//funkcija radi novu tablicu ako ona vec ne postoji
//tablica sadrzi id, name, vrijeme stvaranja i status