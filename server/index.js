import express from 'express';
import cors from 'cors';
import pool from './db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const uploader = multer({ storage: storage });

// Initialize Database Schema & Updates
const initDb = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        property TEXT DEFAULT 'Not Assigned',
        rent NUMERIC,
        advance NUMERIC,
        start_elec NUMERIC DEFAULT 0,
        start_gas NUMERIC DEFAULT 0,
        is_gas_applicable BOOLEAN DEFAULT TRUE,
        last_bill_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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

        // Attempt to add columns if they don't exist (Migration)
        const migrations = [
            `ALTER TABLE tenants ADD COLUMN is_gas_applicable BOOLEAN DEFAULT TRUE;`,
            `ALTER TABLE tenants ADD COLUMN last_bill_date DATE;`,
            `ALTER TABLE bills ADD COLUMN elec_meter_img TEXT;`,
            `ALTER TABLE bills ADD COLUMN gas_meter_img TEXT;`,
            `ALTER TABLE bills ADD COLUMN gas_bill_pdf TEXT;`,
            `ALTER TABLE bills ADD COLUMN due_amount NUMERIC DEFAULT 0;`,
            `ALTER TABLE tenants ADD COLUMN curr_elec NUMERIC DEFAULT 0;`,
            `ALTER TABLE tenants ADD COLUMN curr_gas NUMERIC DEFAULT 0;`
        ];
        
        for (const m of migrations) {
            try { await pool.query(m); } catch (e) { /* ignore duplicate column errors */ }
        }

        // Initialize settings if empty
        const settingsCheck = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (settingsCheck.rowCount === 0) {
            await pool.query('INSERT INTO settings (id, elec_rate, gas_rate) VALUES (1, 10, 5)');
            console.log('Default settings initialized.');
        }

        console.log('Database schema verified.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDb();

// Routes

// GET settings
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings WHERE id = 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ elec_rate: 10, gas_rate: 5 }); // Fallback
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST settings (update)
app.post('/api/settings', async (req, res) => {
    const { elec_rate, gas_rate } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO settings (id, elec_rate, gas_rate) VALUES (1, $1, $2) ON CONFLICT (id) DO UPDATE SET elec_rate = $1, gas_rate = $2 RETURNING *',
            [elec_rate, gas_rate]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// GET all tenants
app.get('/api/tenants', async (req, res) => {
    try {
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
        res.status(500).send('Server Error');
    }
});

// POST new tenant
app.post('/api/tenants', async (req, res) => {
    const { name, rent, advance, elec, gas, currElec, currGas, isGasApplicable } = req.body;
    try {
        const property = 'Not Assigned';
        const isGas = isGasApplicable !== undefined ? isGasApplicable : true;
        const startGas = isGas ? (gas || 0) : 0;
        const currentGas = isGas ? (currGas || 0) : 0;

        const result = await pool.query(
            'INSERT INTO tenants (name, property, rent, advance, start_elec, start_gas, curr_elec, curr_gas, is_gas_applicable, last_bill_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE) RETURNING *',
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
        res.status(500).send('Server Error');
    }
});

// PUT update tenant
app.put('/api/tenants/:id', async (req, res) => {
    const { id } = req.params;
    const { name, rent, advance, elec, gas, currElec, currGas, isGasApplicable } = req.body;
    try {
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
        res.status(500).send('Server Error');
    }
});

// GET recent bills
app.get('/api/bills/recent', async (req, res) => {
    try {
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
        res.status(500).send('Server Error');
    }
});

// GET single bill by ID
app.get('/api/bills/:id', async (req, res) => {
    const { id } = req.params;
    try {
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
        res.status(500).send('Server Error');
    }
});

// POST save bill
app.post('/api/bills', uploader.fields([
    { name: 'elecMeterImg', maxCount: 1 },
    { name: 'gasMeterImg', maxCount: 1 },
    { name: 'gasBillPdf', maxCount: 1 }
]), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { tenant_id, billing_month, due_date, rent_amount, elec_reading, gas_reading, elec_cost, gas_cost, due_amount, total_amount } = req.body;

        const files = req.files || {};
        const elecMeterImg = files['elecMeterImg'] ? files['elecMeterImg'][0].path.replace(/\\/g, '/') : null;
        const gasMeterImg = files['gasMeterImg'] ? files['gasMeterImg'][0].path.replace(/\\/g, '/') : null;
        const gasBillPdf = files['gasBillPdf'] ? files['gasBillPdf'][0].path.replace(/\\/g, '/') : null;

        // Handle optional due_date
        const dueDateVal = due_date ? due_date : null;

        // Safe numeric parsing helper
        const safeNum = (val) => {
            if (val === undefined || val === null || val === '') return 0;
            return parseFloat(val);
        };

        // 1. Insert into bills table
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

        // 2. Update tenant's start readings and last_bill_date
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
        res.status(500).send('Server Error: ' + err.message);
    } finally {
        client.release();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
