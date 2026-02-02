import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgress';
import pg from 'pg';

if (!process.env.DATABASE_URL){
    throw new Error('DATABASE_URL is not defined');
}

export const pool = new pg.Poorl({
    connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);