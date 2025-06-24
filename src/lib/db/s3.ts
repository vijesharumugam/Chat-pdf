import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

type S3UploadResult = {
  file_key: string;
  file_name: string;
};

export async function uploadToS3(file: File): Promise<S3UploadResult | null> {
  try {
    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_S3_REGION,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
      }
    });

    const file_key = 'uploads/' + Date.now().toString() + file.name.replace(' ', '-');

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create and send PutObject command
    const command = new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
      Body: buffer,
      ContentType: file.type // Add content type for proper file handling
    });

    await s3Client.send(command);

    return {
      file_key,
      file_name: file.name,
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return null;
  }
}

export function getS3Url(file_key: string) {
  const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_S3_REGION}.amazonaws.com/${file_key}`;
  return url;
}