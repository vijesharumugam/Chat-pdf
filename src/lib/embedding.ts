import { OpenAIApi, Configuration } from "openai-edge";

// Configuration for OpenAI
const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

// Function to get embeddings with retry mechanism
export async function getEmbeddings(text: string, retries = 3): Promise<number[]> {
    try {
        const response = await openai.createEmbedding({
            model: 'text-embedding-ada-002',
            input: text.replace(/\n/g, ' '),
        });

        if (!response.ok) {
            if (response.status === 429 && retries > 0) {
                console.log('Rate limit hit. Retrying...');
                await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
                return getEmbeddings(text, retries - 1); // Retry recursively
            }
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data[0].embedding as number[];
    } catch (err) {
        console.error("Error calling OpenAI embedding API", err);
        throw err;
    }
}