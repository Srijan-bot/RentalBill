import express from 'express';
import cors from 'cors';
import pool from './db.js';
import multer from 'multer';

const app = express();

// Middleware
app.use(cors());
// Increase payload limit for large base64 strings
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure Multer for Memory Storage (Vercel Serverless read-only filesystem)
const storage = multer.memoryStorage();
const uploader = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Initialize Database Schema & Updates (Adapted for Postgres)
const initDb = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        property TEXT DEFAULT 'Not Assigned',
        rent NUMERIC,
        advance NUMERIC,
        start_elec NUMERIC DEFAULT 0,
        start_gas NUMERIC DEFAULT 0,
        curr_elec NUMERIC DEFAULT 0,
        curr_gas NUMERIC DEFAULT 0,
        is_gas_applicable BOOLEAN DEFAULT TRUE,
        last_bill_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id),
        billing_month TEXT NOT NULL,
        due_date DATE,
        rent_amount NUMERIC NOT NULL,
        elec_reading_curr NUMERIC NOT NULL,
        gas_reading_curr NUMERIC NOT NULL,
        elec_cost NUMERIC DEFAULT 0,
        gas_cost NUMERIC DEFAULT 0,
        due_amount NUMERIC DEFAULT 0,
        total_amount NUMERIC NOT NULL,
        status TEXT DEFAULT 'Pending',
        elec_meter_img TEXT,
        gas_meter_img TEXT,
        gas_bill_pdf TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        elec_rate NUMERIC DEFAULT 10,
        gas_rate NUMERIC DEFAULT 5,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

        // Initialize settings if empty
        const settingsCheck = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (settingsCheck.rowCount === 0) {
            await pool.query('INSERT INTO settings (id, elec_rate, gas_rate) VALUES (1, 10, 5)');
            console.log('Default settings initialized.');
        }

        console.log('Postgres Database schema verified.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

let dbInitialized = false;
let initPromise = null;

const ensureDbInit = async () => {
    if (dbInitialized) return;
    if (!initPromise) {
        initPromise = initDb().then(() => { dbInitialized = true; });
    }
    await initPromise;
};

// Routes

// GET settings
app.get('/api/settings', async (req, res) => {
    try {
        await ensureDbInit();
        const result = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ elec_rate: 10, gas_rate: 5 }); // Fallback
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error: ' + (err.message || String(err)) });
    }
});

// POST settings (update)
app.post('/api/settings', async (req, res) => {
    const { elec_rate, gas_rate } = req.body;
    try {
        await ensureDbInit();
        const result = await pool.query(
            `INSERT INTO settings (id, elec_rate, gas_rate) VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET elec_rate = $1, gas_rate = $2 RETURNING *`,
            [elec_rate, gas_rate]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error: ' + (err.message || String(err)) });
    }
});

// GET all tenants
app.get('/api/tenants', async (req, res) => {
    try {
        await ensureDbInit();
        const result = await pool.query('SELECT * FROM tenants ORDER BY id ASC');
        // Map DB columns to Frontend expected keys
        const tenants = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            property: row.property,
            rent: row.rent,
            advance: row.advance,
            elec: row.start_elec,
            gas: row.start_gas,
            currElec: row.curr_elec,
            currGas: row.curr_gas,
            isGasApplicable: row.is_gas_applicable,
            lastBillDate: row.last_bill_date
        }));
        res.json(tenants);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error: ' + (err.message || String(err)) });
    }
});

// POST new tenant
app.post('/api/tenants', async (req, res) => {
    const { name, rent, advance, elec, gas, currElec, currGas, isGasApplicable } = req.body;
    try {
        await ensureDbInit();
        const property = 'Not Assigned';
        const isGas = isGasApplicable !== undefined ? isGasApplicable : true;
        const startGas = isGas ? (gas || 0) : 0;
        const currentGas = isGas ? (currGas || 0) : 0;

        const result = await pool.query(
            `INSERT INTO tenants (name, property, rent, advance, start_elec, start_gas, curr_elec, curr_gas, is_gas_applicable, last_bill_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE) RETURNING *`,
            [name, property, rent, advance, elec || 0, startGas, currElec || 0, currentGas, isGas]
        );

        const row = result.rows[0];
        const newTenant = {
            id: row.id,
            name: row.name,
            property: row.property,
            rent: row.rent,
            advance: row.advance,
            elec: row.start_elec,
            gas: row.start_gas,
            currElec: row.curr_elec,
            currGas: row.curr_gas,
            isGasApplicable: row.is_gas_applicable,
            lastBillDate: row.last_bill_date
        };

        res.json(newTenant);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error: ' + (err.message || String(err)) });
    }
});

// PUT update tenant
app.put('/api/tenants/:id', async (req, res) => {
    const { id } = req.params;
    const { name, rent, advance, elec, gas, currElec, currGas, isGasApplicable } = req.body;
    try {
        await ensureDbInit();
        const isGas = isGasApplicable !== undefined ? isGasApplicable : true;
        const startGas = isGas ? (gas || 0) : 0;
        const currentGas = isGas ? (currGas || 0) : 0;

        const result = await pool.query(
            `UPDATE tenants 
             SET name = $1, rent = $2, advance = $3, start_elec = $4, start_gas = $5, curr_elec = $6, curr_gas = $7, is_gas_applicable = $8
             WHERE id = $9 RETURNING *`,
            [name, rent, advance, elec, startGas, currElec || 0, currentGas, isGas, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Tenant not found');
        }

        const row = result.rows[0];
        const updatedTenant = {
            id: row.id,
            name: row.name,
            property: row.property,
            rent: row.rent,
            advance: row.advance,
            elec: row.start_elec,
            gas: row.start_gas,
            currElec: row.curr_elec,
            currGas: row.curr_gas,
            isGasApplicable: row.is_gas_applicable,
            lastBillDate: row.last_bill_date
        };
        res.json(updatedTenant);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error: ' + (err.message || String(err)) });
    }
});

// GET recent bills
app.get('/api/bills/recent', async (req, res) => {
    try {
        await ensureDbInit();
        const query = `
            SELECT 
                b.id,
                b.created_at as date,
                t.name as tenant,
                t.property,
                b.total_amount as amount,
                b.status
            FROM bills b
            JOIN tenants t ON b.tenant_id = t.id
            ORDER BY b.created_at DESC
            LIMIT 10
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching recent bills:', err);
        res.status(500).json({ error: 'Server Error: ' + (err.message || String(err)) });
    }
});

// GET single bill by ID
app.get('/api/bills/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await ensureDbInit();
        const query = `
            SELECT 
                b.*,
                t.name as tenant_name,
                t.property as tenant_property
            FROM bills b
            JOIN tenants t ON b.tenant_id = t.id
            WHERE b.id = $1
        `;
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).send('Bill not found');
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching bill:', err);
        res.status(500).json({ error: 'Server Error: ' + (err.message || String(err)) });
    }
});

// POST save bill
app.post('/api/bills', uploader.fields([
    { name: 'elecMeterImg', maxCount: 1 },
    { name: 'gasMeterImg', maxCount: 1 },
    { name: 'gasBillPdf', maxCount: 1 }
]), async (req, res) => {
    await ensureDbInit();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { tenant_id, billing_month, due_date, rent_amount, elec_reading, gas_reading, elec_cost, gas_cost, due_amount, total_amount } = req.body;

        const files = req.files || {};
        
        // Convert buffers to base64 strings for DB storage
        const getBase64 = (fileArray) => {
            if (!fileArray || fileArray.length === 0) return null;
            const file = fileArray[0];
            const b64 = file.buffer.toString('base64');
            return `data:${file.mimetype};base64,${b64}`;
        };

        const elecMeterImg = getBase64(files['elecMeterImg']);
        const gasMeterImg = getBase64(files['gasMeterImg']);
        const gasBillPdf = getBase64(files['gasBillPdf']);

        const dueDateVal = due_date ? due_date : null;

        const safeNum = (val) => {
            if (val === undefined || val === null || val === '') return 0;
            return parseFloat(val);
        };

        const insertBillText = `
      INSERT INTO bills (tenant_id, billing_month, due_date, rent_amount, elec_reading_curr, gas_reading_curr, elec_cost, gas_cost, due_amount, total_amount, elec_meter_img, gas_meter_img, gas_bill_pdf)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `;
        const billRes = await client.query(insertBillText, [
            tenant_id,
            billing_month,
            dueDateVal,
            safeNum(rent_amount),
            safeNum(elec_reading),
            safeNum(gas_reading),
            safeNum(elec_cost),
            safeNum(gas_cost),
            safeNum(due_amount),
            safeNum(total_amount),
            elecMeterImg,
            gasMeterImg,
            gasBillPdf
        ]);

        const updateTenantText = `
      UPDATE tenants 
      SET start_elec = $1, start_gas = $2, last_bill_date = CURRENT_DATE
      WHERE id = $3
    `;
        await client.query(updateTenantText, [elec_reading, gas_reading, tenant_id]);

        await client.query('COMMIT');
        res.json({ success: true, billId: billRes.rows[0].id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving bill:', err);
        res.status(500).json({ error: 'Server Error: ' + (err.message || String(err)) });
    } finally {
        client.release();
    }
});

// Export the app for Vercel Serverless
export default app;

// Start local dev server if not in Vercel environment
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Local Development Server running on port ${PORT}`);
    });
}
