#!/usr/bin/env node

/**
 * Test script to verify OpenRouter API connectivity with GLM model
 * Run with: node test-openrouter-api.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load API key from .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/OPENROUTER_API_KEY=(.+)/);
const modelMatch = envContent.match(/OPENROUTER_MODEL=(.+)/);

if (!apiKeyMatch) {
    console.error('❌ OPENROUTER_API_KEY not found in .env.local');
    process.exit(1);
}

const API_KEY = apiKeyMatch[1].trim();
const MODEL = modelMatch ? modelMatch[1].trim() : 'zhipu-ai/glm-4-6b';

console.log('🔑 API Key found:', API_KEY.substring(0, 20) + '...');
console.log('🤖 Model:', MODEL);

// Test message
const testMessage = 'Hello! Please respond with "API is working" if you can read this.';

console.log('\n📤 Sending test message to OpenRouter API...');
console.log('Message:', testMessage);

const data = JSON.stringify({
    model: MODEL,
    messages: [
        {
            role: 'user',
            content: testMessage
        }
    ]
});

const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'ERPNext CoAgent Test',
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log('\n📥 Response status:', res.statusCode);

    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(responseData);

            if (json.error) {
                console.error('\n❌ API Error:');
                console.error('Code:', json.error.code);
                console.error('Message:', json.error.message);
                console.error('\nFull error:', JSON.stringify(json.error, null, 2));
                process.exit(1);
            }

            if (json.choices && json.choices[0]) {
                const responseText = json.choices[0].message.content;
                console.log('\n✅ API Response received!');
                console.log('Response:', responseText);
                console.log('\n✅ OpenRouter API with GLM model is working correctly!');
                console.log('\nModel used:', json.model);
                console.log('Tokens - Prompt:', json.usage?.prompt_tokens, 'Completion:', json.usage?.completion_tokens);
            } else {
                console.error('\n❌ Unexpected response format:');
                console.error(JSON.stringify(json, null, 2));
                process.exit(1);
            }
        } catch (e) {
            console.error('\n❌ Failed to parse response:');
            console.error(responseData);
            console.error('\nError:', e.message);
            process.exit(1);
        }
    });
});

req.on('error', (e) => {
    console.error('\n❌ Request failed:');
    console.error(e.message);
    process.exit(1);
});

req.write(data);
req.end();
