import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';

// Create S3 client
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_S3_REGION!,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
  }
});

export async function downloadFromS3(file_key: string): Promise<string> {
  try {
    // Create a temporary file path using os.tmpdir()
    const tempFilePath = path.join(os.tmpdir(), `pdf-${Date.now()}.pdf`);

    // Create GetObject command
    const command = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
    });

    // Get the object from S3
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    // Create write stream
    const writeStream = fs.createWriteStream(tempFilePath);

    // Handle the response body
    if (response.Body instanceof Readable) {
      // If it's a readable stream, pipe it
      await new Promise((resolve, reject) => {
        (response.Body as Readable)
          .pipe(writeStream)
          .on('finish', resolve)
          .on('error', reject);
      });
    } else {
      // If it's not a stream, convert to buffer and write
      const chunks = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(tempFilePath, buffer);
    }

    return tempFilePath;
  } catch (error) {
    console.error('Error downloading from S3:', error);
    throw error;
  }
}