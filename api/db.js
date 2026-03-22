import pkg from 'pg';
const { Pool } = pkg;

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Use Neon Serverless Postgres DB URL
const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl ? { rejectUnauthorized: false } : undefined
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to Neon Postgres database', err);
    } else {
        console.log('Successfully connected to Neon Postgres database');
    }
});

export default pool;
