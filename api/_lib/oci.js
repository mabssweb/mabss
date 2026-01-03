import * as common from "oci-common";
import * as os from "oci-objectstorage";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import 'dotenv/config';

// Version: 2026-01-03 17:00 - Production Ready
const normalizePEM = (key) => {
    if (!key) return key;

    // console.log(`OCI: Starting PEM normalization. Raw input length: ${key.length}`);

    try {
        // 1. Convert literal "\n" strings and handle mixed line endings
        let clean = key.replace(/\\n/g, '\n').replace(/\r/g, '');

        // 2. Strip surrounding quotes and whitespace
        clean = clean.trim();
        if (clean.startsWith('"') && clean.endsWith('"')) clean = clean.slice(1, -1);
        if (clean.startsWith("'") && clean.endsWith("'")) clean = clean.slice(1, -1);
        clean = clean.trim();

        // 3. Find indices of BEGIN and END
        const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const startIndex = lines.findIndex(l => l.startsWith('-----BEGIN'));
        const endIndex = lines.findIndex(l => l.startsWith('-----END'));

        if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
            console.warn(`OCI: Could not find markers. Start: ${startIndex}, End: ${endIndex}`);
            return clean;
        }

        const header = lines[startIndex];
        const footer = lines[endIndex];
        // console.log(`OCI: Found markers: ${header} ... ${footer}`);

        // 4. Surgical cleaning of the base64 body
        const bodyBase64 = lines
            .slice(startIndex + 1, endIndex)
            .join('')
            .replace(/[^A-Za-z0-9+/=]/g, '');

        // console.log(`OCI: Surgical body cleaning done. Base64 length: ${bodyBase64.length}`);

        if (bodyBase64.length < 50) {
            throw new Error(`Private key body is suspiciously short (${bodyBase64.length} chars). Please check your .env or key file.`);
        }

        // 5. Reconstruct manual clean PEM
        const formattedBody = bodyBase64.match(/.{1,64}/g)?.join('\n') || '';
        const cleanPEM = `${header}\n${formattedBody}\n${footer}\n`;

        // 6. Attempt crypto transformation
        try {
            // console.log("OCI: Attempting Node crypto re-format to PKCS#1...");
            const privateKeyObj = crypto.createPrivateKey(cleanPEM);
            const pkcs1PEM = privateKeyObj.export({
                type: 'pkcs1',
                format: 'pem'
            });
            // console.log(`OCI: SUCCESS! Key re-formatted to PKCS#1.`);
            return pkcs1PEM;
        } catch (cryptoErr) {
            console.warn('OCI: Node crypto transformation FAILED. Falling back to manual PEM:', cryptoErr.message);
            return cleanPEM;
        }
    } catch (err) {
        console.error('OCI: Critical error in normalizePEM:', err.message);
        throw err; // Re-throw to prevent client init with bad data
    }
};

export async function uploadToOCI(file) {
    if (!file) return null;

    // Log detected environment (masked) - Kept for diagnostics but made cleaner
    /*
    console.log('OCI: Environment Check:');
    console.log(` - OCI_PRIVATE_KEY_PATH: ${process.env.OCI_PRIVATE_KEY_PATH ? 'SET' : 'NOT SET'}`);
    console.log(` - OCI_REGION: ${process.env.OCI_REGION}`);
    console.log(` - OCI_NAMESPACE: ${process.env.OCI_NAMESPACE}`);
    */

    // Trim important env vars to handle trailing spaces from .env
    const tenancyId = (process.env.OCI_TENANCY_OCID || '').trim();
    const userId = (process.env.OCI_USER_OCID || '').trim();
    const fingerprint = (process.env.OCI_FINGERPRINT || '').trim();
    const region = (process.env.OCI_REGION || '').trim();
    const namespace = (process.env.OCI_NAMESPACE || '').trim();
    const bucketName = (process.env.OCI_BUCKET_NAME || '').trim();
    const keyPathRaw = (process.env.OCI_PRIVATE_KEY_PATH || '').trim();

    // Validate Image
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    // Rename: news/{year}/{month}/{uuid}.{ext}
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = path.extname(file.originalFilename) || '.jpg';
    const objectName = `news/${year}/${month}/${uuidv4()}${ext}`;

    // Read private key
    let privateKey;

    if (keyPathRaw) {
        const absolutePath = path.isAbsolute(keyPathRaw) ? keyPathRaw : path.join(process.cwd(), keyPathRaw);
        // console.log(`OCI: Attempting to load key from path: ${absolutePath}`);
        if (fs.existsSync(absolutePath)) {
            const buffer = fs.readFileSync(absolutePath);
            // Handle UTF-16 (Common on Windows)
            if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
                privateKey = buffer.toString('utf16le');
            } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
                privateKey = buffer.toString('utf16be');
            } else {
                privateKey = buffer.toString('utf8');
                // Check if it looks like UTF-16 without BOM (lots of null bytes)
                if (privateKey.includes('\u0000')) {
                    privateKey = buffer.toString('utf16le').replace(/\u0000/g, '');
                }
            }
            // console.log('OCI: File loaded successfully. Normalizing...');
            privateKey = normalizePEM(privateKey);
        } else {
            console.warn(`OCI: Key file not found at ${absolutePath}.`);
        }
    }

    if (!privateKey) {
        const envKey = process.env.OCI_PRIVATE_KEY_CONTENT || process.env.OCI_PRIVATE_KEY;
        if (envKey) {
            // console.log('OCI: Found private key in environment variable. Normalizing...');
            privateKey = normalizePEM(envKey);
        } else {
            throw new Error(`OCI Private Key not found. Please set OCI_PRIVATE_KEY or OCI_PRIVATE_KEY_PATH.`);
        }
    }

    const provider = new common.SimpleAuthenticationDetailsProvider(
        tenancyId,
        userId,
        fingerprint,
        privateKey,
        null,
        common.Region.fromRegionId(region)
    );

    const client = new os.ObjectStorageClient({ authenticationDetailsProvider: provider });

    const putObjectRequest = {
        namespaceName: namespace,
        bucketName: bucketName,
        putObjectBody: fs.createReadStream(file.filepath),
        objectName: objectName,
        contentType: file.mimetype
    };

    await client.putObject(putObjectRequest);

    // Generate Public URL
    return `https://objectstorage.${region}.oraclecloud.com/n/${namespace}/b/${bucketName}/o/${objectName}`;
}

export async function deleteFromOCI(imageUrl) {
    if (!imageUrl || !imageUrl.includes('objectstorage')) {
        console.warn('OCI: Skipping delete, invalid or non-OCI URL:', imageUrl);
        return;
    }

    try {
        // Parse URL: https://objectstorage.{region}.oraclecloud.com/n/{namespace}/b/{bucket}/o/{objectName}
        const urlMatch = imageUrl.match(/objectstorage\.([^.]+)\.oraclecloud\.com\/n\/([^/]+)\/b\/([^/]+)\/o\/(.+)/);
        if (!urlMatch) {
            console.warn('OCI: Could not parse OCI URL for deletion:', imageUrl);
            return;
        }

        const [, region, namespace, bucketName, objectName] = urlMatch;
        console.log(`OCI: Preparing to delete object: ${objectName} from bucket: ${bucketName}`);

        // Auth details (reusing logic from uploadToOCI)
        const tenancyId = (process.env.OCI_TENANCY_OCID || '').trim();
        const userId = (process.env.OCI_USER_OCID || '').trim();
        const fingerprint = (process.env.OCI_FINGERPRINT || '').trim();
        const keyPathRaw = (process.env.OCI_PRIVATE_KEY_PATH || '').trim();

        let privateKey;
        if (keyPathRaw) {
            const absolutePath = path.isAbsolute(keyPathRaw) ? keyPathRaw : path.join(process.cwd(), keyPathRaw);
            if (fs.existsSync(absolutePath)) {
                const buffer = fs.readFileSync(absolutePath);
                privateKey = buffer.toString('utf8'); // Simplied for this utility, normalizePEM handles complexity
                if (privateKey.includes('\u0000') || (buffer[0] === 0xFF && buffer[1] === 0xFE)) {
                    privateKey = buffer.toString('utf16le').replace(/\u0000/g, '');
                }
                privateKey = normalizePEM(privateKey);
            }
        }

        if (!privateKey) {
            const envKey = process.env.OCI_PRIVATE_KEY_CONTENT || process.env.OCI_PRIVATE_KEY;
            if (envKey) privateKey = normalizePEM(envKey);
        }

        if (!privateKey) {
            console.error('OCI: Delete failed - No private key found.');
            return;
        }

        const provider = new common.SimpleAuthenticationDetailsProvider(
            tenancyId,
            userId,
            fingerprint,
            privateKey,
            null,
            common.Region.fromRegionId(region)
        );

        const client = new os.ObjectStorageClient({ authenticationDetailsProvider: provider });

        await client.deleteObject({
            namespaceName: namespace,
            bucketName: bucketName,
            objectName: decodeURIComponent(objectName)
        });

        console.log(`OCI: Successfully deleted object: ${objectName}`);
    } catch (error) {
        // Log but don't throw - we don't want to crash the main delete flow if OCI fails
        // Special handle 404 (already gone) or 403 (permission issues)
        if (error.statusCode === 404) {
            console.warn('OCI: Object already deleted or not found.');
        } else if (error.statusCode === 403) {
            console.error('OCI: PERMISSION DENIED. Your OCI user needs OBJECT_DELETE permissions in this bucket.');
        } else {
            console.error('OCI: Error during object deletion:', error.message);
        }
    }
}
