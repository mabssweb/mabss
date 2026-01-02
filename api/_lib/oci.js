import * as common from "oci-common";
import * as os from "oci-objectstorage";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function uploadToOCI(file) {
    if (!file) return null;

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

    // Read private key - checking if it's a path or content
    let privateKey;
    if (process.env.OCI_PRIVATE_KEY_PATH && fs.existsSync(process.env.OCI_PRIVATE_KEY_PATH)) {
        console.log('OCI: Using private key from file path:', process.env.OCI_PRIVATE_KEY_PATH);
        privateKey = fs.readFileSync(process.env.OCI_PRIVATE_KEY_PATH, 'utf8');
    } else {
        privateKey = process.env.OCI_PRIVATE_KEY_CONTENT || process.env.OCI_PRIVATE_KEY;
        if (privateKey) {
            console.log('OCI: Using private key from environment variable.');
        } else {
            const errorMsg = `OCI Private Key not found. Checked: OCI_PRIVATE_KEY_PATH (${process.env.OCI_PRIVATE_KEY_PATH || 'not set'}), OCI_PRIVATE_KEY_CONTENT, and OCI_PRIVATE_KEY.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    if (!privateKey || privateKey.trim().length === 0) {
        throw new Error('OCI Private Key is empty.');
    }

    const provider = new common.SimpleAuthenticationDetailsProvider(
        process.env.OCI_TENANCY_OCID,
        process.env.OCI_USER_OCID,
        process.env.OCI_FINGERPRINT,
        privateKey,
        null,
        common.Region.fromRegionId(process.env.OCI_REGION)
    );

    const client = new os.ObjectStorageClient({ authenticationDetailsProvider: provider });

    const putObjectRequest = {
        namespaceName: process.env.OCI_NAMESPACE,
        bucketName: process.env.OCI_BUCKET_NAME,
        putObjectBody: fs.createReadStream(file.filepath),
        objectName: objectName,
        contentType: file.mimetype
    };

    await client.putObject(putObjectRequest);

    // Generate Public URL
    return `https://objectstorage.${process.env.OCI_REGION}.oraclecloud.com/n/${process.env.OCI_NAMESPACE}/b/${process.env.OCI_BUCKET_NAME}/o/${objectName}`;
}
