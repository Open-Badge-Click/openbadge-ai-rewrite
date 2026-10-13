import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const port = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || 'gpt-6-luna';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Shared instruction for endpoints that return a plain bullet list
const BULLET_FORMAT = 'Provide the bullet points without HTML, one per line, preceded by the character - without adding any other comments';

// Each endpoint builds a system prompt and a user message from the request,
// then returns the model's answer as { rewrittenText }.
const endpoints = [
    {
        path: '/rewrite',
        maxTokens: 4000,
        system: (language) => `You are an assistant responsible for writing datasheets for courses and learning paths. Starting from the provided text, rewrite it by expanding it to become a true course description with details on the skills acquired. It is not a promotional brochure for a course but rather a description of the skills acquired to be included in a certificate. Your output needs to be in the following language: ${language}`,
        user: (text) => `Here is the text: ${text}`,
    },
    {
        path: '/rewrite-assignment',
        maxTokens: 4000,
        system: (language) => `You are an assistant responsible for deciding the criteria for awarding certificates for courses, workshops, and seminars. Starting from the provided text, respond with a series of bullet points that succinctly describe the criteria for awarding the certificate. ${BULLET_FORMAT}. Your output needs to be in the following language: ${language}.`,
        user: (text) => `Here is the course text for which to extract or create the assignment criteria: ${text}`,
    },
    {
        path: '/acquired_knowledge',
        maxTokens: 4000,
        system: (language) => `You are an assistant responsible for extracting or writing the acquired knowledges given a course description or outline. You should invent or find the knowledge that the student should obtain for the described course. Please respond with a series of bullet points that succinctly describe the acquired knowledge. ${BULLET_FORMAT} - your output needs to be in the following language: ${language}.`,
        user: (text) => `Here is the course text for which to describe the acquired knowledge: ${text}`,
    },
    {
        path: '/acquired_skills',
        maxTokens: 4000,
        system: (language) => `You are an assistant responsible for writing course documentation and outlines. Given the text provided that briefly describe the course outline please respond with a series of tags that succinctly describe the acquired skills. Output should be tag like. ${BULLET_FORMAT} - your output needs to be in the following language: ${language}.`,
        user: (text) => `Here is the course text for which to describe the acquired skills: ${text}`,
    },
    {
        path: '/acquired_attitudes',
        maxTokens: 4000,
        system: (language) => `You are an assistant responsible for describing the acquired attitudes in courses, workshops, and seminars. Given a course description text, respond with a series of bullet points that succinctly describe the acquired attitudes. ${BULLET_FORMAT} - your output needs to be in the following language: ${language}.`,
        user: (text) => `Here is the course text for which to describe the acquired attitudes: ${text}`,
    },
    {
        path: '/application_scope',
        maxTokens: 4000,
        system: (language) => `You are an assistant responsible for describing the application scope in courses, workshops, and seminars. Given a course description text, respond with a series of bullet points that succinctly describe the application scope. ${BULLET_FORMAT} - your output needs to be in the following language: ${language}.`,
        user: (text) => `Here is the course text for which to describe the application scope: ${text}`,
    },
];

async function complete(systemMessage, userMessage, maxTokens) {
    const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
        ],
        max_completion_tokens: maxTokens,
    });
    return response.choices[0].message.content.trim();
}

const app = express();
app.use(cors());
app.use(express.json());

for (const endpoint of endpoints) {
    app.post(endpoint.path, async (req, res) => {
        const { text, language } = req.body ?? {};
        if (!text || !language) {
            return res.status(400).json({ error: 'Both "text" and "language" are required.' });
        }

        try {
            const rewrittenText = await complete(endpoint.system(language), endpoint.user(text), endpoint.maxTokens);
            res.json({ rewrittenText });
        } catch (error) {
            console.error(`Error on ${endpoint.path}:`, error);
            res.status(500).json({ error: 'An error occurred while processing your request.' });
        }
    });
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
