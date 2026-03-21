import pkg from 'pg';
const { Pool } = pkg;

// Use Neon Serverless Postgres DB URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
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
