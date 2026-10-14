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

// Comma-separated list of client IPs allowed to call the API. Empty = allow all.
const ALLOWED_IPS = (process.env.ALLOWED_IP || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

// IPv4 clients often show up as IPv4-mapped IPv6 addresses (::ffff:1.2.3.4)
const normalizeIp = (ip = '') => (ip === '::1' ? '127.0.0.1' : ip.replace(/^::ffff:/, ''));

// Number of reverse proxies in front of the app (e.g. 1 on Cloud Run), so the
// client IP is read from X-Forwarded-For instead of the proxy's address.
const TRUST_PROXY = Number(process.env.TRUST_PROXY) || 0;

const app = express();
app.set('trust proxy', TRUST_PROXY);
app.use(cors());

if (ALLOWED_IPS.length > 0) {
    app.use((req, res, next) => {
        const clientIp = normalizeIp(req.ip);
        if (!ALLOWED_IPS.includes(clientIp)) {
            console.warn(`Blocked request from ${clientIp} to ${req.path}`);
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    });
} else {
    console.warn('ALLOWED_IP is not set: accepting requests from any IP.');
}

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
