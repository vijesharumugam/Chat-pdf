import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document, RecursiveCharacterTextSplitter } from '@pinecone-database/doc-splitter';
import { getEmbeddings } from './embedding';
import md5 from 'md5';
import { convertToAscii } from './utils';


let pinecone: Pinecone | null = null;

export const getPineconeClient = async () => {
    if (!pinecone) {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY || ""
        });
    }
    return pinecone;
};

type PDFPage = {
    pageContent: string,
    metadata: {
        loc: { pageNumber: number }
    }
}

export async function loadS3IntoPinecone(fileKey: string) {
    // 1. Obtain the PDF -> download and read from S3
    console.log('Downloading S3 into file system');
    const file_name = await downloadFromS3(fileKey);

    if (!file_name) {
        throw new Error("Could not download from S3");
    }

    const loader = new PDFLoader(file_name);
    const pages = (await loader.load()) as PDFPage[];

    // 2. Split and Segment the PDF into pages
    const documents = await Promise.all(pages.map(prepareDocument)); 

    // 3. Vectorize and embed individual documents
    const vectors = await Promise.all(documents.flat().map(embedDocument));
    // 4. Upload to Pinecone
    const client = await getPineconeClient()
    const pineconeIndex = client.Index('chatpdf-personal')

    console.log("Inserting vectors into Pinecone")
    pineconeIndex.namespace(convertToAscii(fileKey)).upsert(vectors)
    return documents[0]    
}

async function embedDocument(doc: Document) {
    try {
        const embeddings = await getEmbeddings(doc.pageContent);
        const hash = md5(doc.pageContent);

        return {
            id: hash,
            values: embeddings,
            metadata: {
                text: doc.metadata.text,
                pageNumber: doc.metadata.pageNumber
            }
        } as PineconeRecord;
    } catch (error) {
        console.log("Error embedding document", error);
        throw error;
    }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
    const enc = new TextEncoder();
    return new TextDecoder('UTF-8').decode(enc.encode(str).slice(0, bytes));
};

export async function prepareDocument(page: PDFPage): Promise<Document[]> {
    let { pageContent } = page; // Only 'pageContent' is reassigned, so it remains 'let'
    const { metadata } = page;  // 'metadata' is not reassigned, so change to 'const'

    pageContent = pageContent.replace(/\n/g, '');

    // Split the documents
    const splitter = new RecursiveCharacterTextSplitter();
    const docs = await splitter.splitDocuments([
        new Document({
            pageContent,
            metadata: {
                pageNumber: metadata.loc.pageNumber,
                text: truncateStringByBytes(pageContent, 36000)
            }
        })
    ]);

    return docs;
}