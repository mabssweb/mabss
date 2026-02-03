
import pg from 'pg';
import formidable from 'formidable';
import fs from 'fs';
import { uploadToOCI } from '../_lib/oci.js';
import { getCurrentUser } from '../_lib/auth.js';

export const config = {
    api: {
        bodyParser: false, // Disallow body parsing, consume as stream
    },
};

// Database Connection
const { Pool } = pg;
let pool;

function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is missing");
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }
    return pool;
}

export default async function handler(req, res) {
    // CORS & Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 1. Authenticate User
        const user = await getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const db = getPool();

        // 2. GET: Retrieve Application Status
        if (req.method === 'GET') {
            const result = await db.query(
                `SELECT 
                    a.*, 
                    json_agg(json_build_object('type', d.document_type, 'url', d.file_url)) as documents
                 FROM applications a
                 LEFT JOIN application_documents d ON a.id = d.application_id
                 WHERE a.user_id = $1
                 GROUP BY a.id`,
                [user.id]
            );

            if (result.rows.length === 0) {
                return res.status(200).json({ hasApplication: false });
            }

            return res.status(200).json({
                hasApplication: true,
                application: result.rows[0]
            });
        }

        // 3. POST: Submit Application
        if (req.method === 'POST') {
            // Check if application already exists
            const check = await db.query('SELECT id FROM applications WHERE user_id = $1', [user.id]);
            if (check.rows.length > 0) {
                return res.status(400).json({ error: 'You have already submitted an application.' });
            }

            const form = formidable({ multiples: true, maxFileSize: 10 * 1024 * 1024 }); // 10MB limit

            const [fields, files] = await new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err);
                    else resolve([fields, files]);
                });
            });

            // Helper to get single value from array/string
            const val = (k) => Array.isArray(fields[k]) ? fields[k][0] : fields[k];

            // Generate Application Number (MABSS-YYYY-XXXX)
            const year = new Date().getFullYear();
            const countRes = await db.query('SELECT COUNT(*) FROM applications');
            const count = parseInt(countRes.rows[0].count) + 1;
            const appNumber = `MABSS-${year}-${String(count).padStart(4, '0')}`;

            // Insert Application
            const insertQuery = `
                INSERT INTO applications (
                    user_id, application_number, status,
                    surname, other_names, lin, dob, sex, class_applying, age, former_school,
                    birth_country, birth_district, birth_county, birth_parish, birth_village,
                    admission_mode, parent_category, day_status, boarding_status,
                    ple_year, ple_index, english_agg, maths_agg, science_agg, social_agg, total_aggregates, division,
                    uce_year, uce_index, uce_results,
                    health_needs, talents,
                    father_name, father_nin, father_contact, father_occupation, father_district,
                    mother_name, mother_nin, mother_contact, mother_occupation, mother_district,
                    guardian_name, guardian_nin, guardian_contact, guardian_occupation, guardian_district,
                    declaration_agreed, declaration_date
                ) VALUES (
                    $1, $2, 'pending',
                    $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15,
                    $16, $17, $18, $19,
                    $20, $21, $22, $23, $24, $25, $26, $27,
                    $28, $29, $30,
                    $31, $32,
                    $33, $34, $35, $36, $37,
                    $38, $39, $40, $41, $42,
                    $43, $44, $45, $46, $47,
                    $48, $49
                ) RETURNING id
            `;

            // Prepare values (ensure types match schema)
            const values = [
                user.id, appNumber,
                val('surname'), val('other_names'), val('lin'), val('dob'), val('sex'), val('class'), val('age'), val('former_school'),
                val('country'), val('district'), val('county'), val('parish'), val('village'),
                val('admission_mode'), val('parent_category'), val('day_status'), val('boarding_status'),
                val('ple_year'), val('ple_index'), val('english_agg'), val('maths_agg'), val('science_agg'), val('social_agg'), val('total_aggregates'), val('division'),
                val('uce_year') || null, val('uce_index') || null, val('uce_results') || null,
                val('health_needs'), val('talents'),
                val('father_name'), val('father_nin'), val('father_contact'), val('father_occupation'), val('father_district'),
                val('mother_name'), val('mother_nin'), val('mother_contact'), val('mother_occupation'), val('mother_district'),
                val('guardian_name'), val('guardian_nin'), val('guardian_contact'), val('guardian_occupation'), val('guardian_district'),
                val('declaration') === 'on' || val('declaration') === 'true', new Date()
            ];

            const appResult = await db.query(insertQuery, values);
            const applicationId = appResult.rows[0].id;

            // Handle File Uploads (PLE Slip, UCE Slip, Guardian ID)
            const uploadDoc = async (fileKey, docType) => {
                const file = Array.isArray(files[fileKey]) ? files[fileKey][0] : files[fileKey];
                if (file) {
                    const url = await uploadToOCI(file);
                    if (url) {
                        await db.query(
                            'INSERT INTO application_documents (application_id, document_type, file_path, file_url, mime_type, size_bytes) VALUES ($1, $2, $3, $4, $5, $6)',
                            [applicationId, docType, url, url, file.mimetype, file.size]
                        );
                    }
                }
            };

            await uploadDoc('ple_slip', 'ple_slip');
            await uploadDoc('uce_slip', 'uce_slip');
            // Check if there is a guardian_id file input in the form (was not explicitly in schema but good to have)
            // If the form has it, add: await uploadDoc('guardian_id', 'guardian_id');

            return res.status(201).json({
                success: true,
                message: 'Application submitted successfully',
                applicationNumber: appNumber
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Application API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
