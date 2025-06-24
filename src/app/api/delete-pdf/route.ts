import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: Request) {
  try {
    const { chatId } = await req.json();
    
    // Get the chat to find the PDF file key
    const chat = await db.select().from(chats).where(eq(chats.id, chatId));
    if (!chat || chat.length === 0) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Delete from S3
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_S3_REGION!,
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
      },
    });

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: chat[0].fileKey,
    });

    await s3Client.send(deleteCommand);

    // Delete from database
    await db.delete(chats).where(eq(chats.id, chatId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting PDF:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF" },
      { status: 500 }
    );
  }
} 