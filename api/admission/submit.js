
import formidable from 'formidable';
// formidable check: sometimes import { IncomingForm } ... works, or default. 
// v3 has named exports. 
const { IncomingForm } = formidable;
import fs from 'fs';
import { uploadToOCI } from '../../_lib/oci';
import * as db from '../../_lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from '../../_lib/auth';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    // GET: Check application status by application number or LIN
    if (req.method === 'GET') {
        const { ref } = req.query;

        if (!ref) {
            return res.status(400).json({ error: 'Application Number or LIN is required' });
        }

        try {
            const query = `
        SELECT application_number, status, surname, other_names, created_at 
        FROM applications 
        WHERE application_number = $1 OR lin = $1
      `;

            const { rows } = await db.query(query, [ref]);

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Application not found' });
            }

            return res.status(200).json({
                found: true,
                application: rows[0]
            });

        } catch (error) {
            console.error('Status check error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    // POST: Submit new application
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Authenticate Request
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized. Please login as a student.' });
    }

    try {
        const data = await new Promise((resolve, reject) => {
            const form = new IncomingForm({ keepExtensions: true });
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });

        const { fields, files } = data;

        // Normalize fields
        const normalizedFields = {};
        for (const key in fields) {
            normalizedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
        }

        const appYear = new Date().getFullYear();
        const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
        const appNumber = `MABSS-${appYear}-${uniqueSuffix}`;

        const uploadedDocs = [];
        const fileKeys = ['ple_slip', 'uce_slip', 'guardian_id'];

        console.log('Starting file uploads...');

        for (const key of fileKeys) {
            if (files[key]) {
                const file = Array.isArray(files[key]) ? files[key][0] : files[key];

                try {
                    const publicUrl = await uploadToOCI(file);

                    if (publicUrl) {
                        uploadedDocs.push({
                            document_type: key,
                            file_url: publicUrl,
                            mime_type: file.mimetype,
                            size_bytes: file.size
                        });
                    }
                } catch (uploadError) {
                    console.error(`Upload failed for ${key}:`, uploadError);
                    throw new Error(`Failed to upload ${key}: ${uploadError.message}`);
                }
            }
        }

        console.log('Inserting application record...');

        const insertAppQuery = `
      INSERT INTO applications (
        application_number, status, user_id, surname, other_names, lin, dob, sex, 
        class_applying, age, former_school, birth_country, birth_district, 
        birth_county, birth_parish, birth_village, admission_mode, parent_category, 
        day_status, boarding_status, ple_year, ple_index, english_agg, maths_agg, 
        science_agg, social_agg, total_aggregates, division, uce_year, uce_index, 
        uce_results, health_needs, talents, father_name, father_nin, father_contact, 
        father_occupation, father_district, mother_name, mother_nin, mother_contact, 
        mother_occupation, mother_district, guardian_name, guardian_nin, guardian_contact, 
        guardian_occupation, guardian_district, declaration_agreed, declaration_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 
        $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49
      ) RETURNING id
    `;

        const appValues = [
            appNumber, 'pending', user.id, normalizedFields.surname, normalizedFields.other_names,
            normalizedFields.lin, normalizedFields.dob, normalizedFields.sex,
            normalizedFields.class, parseInt(normalizedFields.age), normalizedFields.former_school,
            normalizedFields.country, normalizedFields.district, normalizedFields.county,
            normalizedFields.parish, normalizedFields.village, normalizedFields.admission_mode,
            normalizedFields.parent_category, normalizedFields.day_status, normalizedFields.boarding_status,
            parseInt(normalizedFields.ple_year), normalizedFields.ple_index, normalizedFields.english_agg,
            normalizedFields.maths_agg, normalizedFields.science_agg, normalizedFields.social_agg,
            normalizedFields.total_aggregates, normalizedFields.division,
            normalizedFields.uce_year ? parseInt(normalizedFields.uce_year) : null,
            normalizedFields.uce_index || null,
            normalizedFields.uce_results || null,
            normalizedFields.health_needs, normalizedFields.talents,
            normalizedFields.father_name, normalizedFields.father_nin, normalizedFields.father_contact,
            normalizedFields.father_occupation, normalizedFields.father_district,
            normalizedFields.mother_name, normalizedFields.mother_nin, normalizedFields.mother_contact,
            normalizedFields.mother_occupation, normalizedFields.mother_district,
            normalizedFields.guardian_name, normalizedFields.guardian_nin, normalizedFields.guardian_contact,
            normalizedFields.guardian_occupation, normalizedFields.guardian_district,
            normalizedFields.declaration_agree === 'on', normalizedFields.declaration_date
        ];

        const { rows } = await db.query(insertAppQuery, appValues);
        const appId = rows[0].id;

        if (uploadedDocs.length > 0) {
            for (const doc of uploadedDocs) {
                const insertDocQuery = `
            INSERT INTO application_documents (
                application_id, document_type, file_path, file_url, mime_type, size_bytes
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `;
                await db.query(insertDocQuery, [
                    appId, doc.document_type, doc.file_url, doc.file_url, doc.mime_type, doc.size_bytes
                ]);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Application submitted successfully',
            applicationNumber: appNumber
        });

    } catch (error) {
        console.error('Submission error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

