import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embedding";

export async function getMatchesFromEmbeddings(embeddings: number[], fileKey: string) {
    const pinecone = new Pinecone({
        apiKey: '76a6dcb3-4504-4412-a0a2-6d867c177ba0'
    });
    const index = await pinecone.Index('chatpdf-personal');
    
    try {
        const queryResult = await index.namespace(convertToAscii(fileKey)).query({
            topK: 5,
            vector: embeddings,
            includeMetadata: true
        });
        return queryResult.matches || []; // Safeguard fallback
    } catch (error) {
        console.log('Error querying embeddings', error);
        return [];
    }
}

export async function getContext(query: string, fileKey: string) {
    const queryEmbeddings = await getEmbeddings(query);
    const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);

    // Check if matches exists and is an array
const qualifyingDocs = Array.isArray(matches)
        ? matches.filter((match) => match.score && match.score > 0.7)
        : [];

    type Metadata = {
        text : string,
        pageNumber: number
    }
    return qualifyingDocs.map(match => (match.metadata as Metadata).text).join('\n').substring(0,3000)
}