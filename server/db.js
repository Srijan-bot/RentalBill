import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'database.sqlite');
const dbPromise = open({
    filename: dbFile,
    driver: sqlite3.Database
});

const pool = {
    query: async (text, params) => {
        const db = await dbPromise;
        const convertedText = text.replace(/\$(\d+)/g, '?$1');
        const isSelectOrReturning = convertedText.trim().match(/^(SELECT|[\s\S]*RETURNING)/i);
        
        if (isSelectOrReturning) {
            const rows = await db.all(convertedText, params || []);
            return { rows, rowCount: rows.length };
        } else {
            const result = await db.run(convertedText, params || []);
            return { rows: [], rowCount: result.changes };
        }
    },
    connect: async () => {
         const db = await dbPromise;
         let inTransaction = false;
         return {
             query: async (text, params) => {
                 let convertedText = text.replace(/\$(\d+)/g, '?$1');
                 if (convertedText.trim().toUpperCase() === 'BEGIN') {
                     await db.run('BEGIN TRANSACTION');
                     inTransaction = true;
                     return { rows: [], rowCount: 0 };
                 }
                 if (convertedText.trim().toUpperCase() === 'COMMIT') {
                     if (inTransaction) await db.run('COMMIT');
                     inTransaction = false;
                     return { rows: [], rowCount: 0 };
                 }
                 if (convertedText.trim().toUpperCase() === 'ROLLBACK') {
                     if (inTransaction) await db.run('ROLLBACK');
                     inTransaction = false;
                     return { rows: [], rowCount: 0 };
                 }
                 const isSelectOrReturning = convertedText.trim().match(/^(SELECT|[\s\S]*RETURNING)/i);
                 if (isSelectOrReturning) {
                     const rows = await db.all(convertedText, params || []);
                     return { rows, rowCount: rows.length };
                 } else {
                     const result = await db.run(convertedText, params || []);
                     return { rows: [], rowCount: result.changes };
                 }
             },
             release: () => {}
         };
    }
};

dbPromise.then(() => console.log('Connected to local SQLite Database')).catch(err => console.error('DB Error:', err));

export default pool;
