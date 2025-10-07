#!/usr/bin/env node

/**
 * Test script to verify Google Gemini API connectivity
 * Run with: node test-gemini-api.js
 */

const https = require('https');

// Load API key from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/);

if (!apiKeyMatch) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not found in .env.local');
    process.exit(1);
}

const API_KEY = apiKeyMatch[1].trim();
console.log('🔑 API Key found:', API_KEY.substring(0, 20) + '...');

// Test message
const testMessage = 'Hello! Please respond with "API is working" if you can read this.';

console.log('\n📤 Sending test message to Gemini API...');
console.log('Message:', testMessage);

const data = JSON.stringify({
    contents: [{
        parts: [{
            text: testMessage
        }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
    method: 'POST',
    headers: {
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
                console.error('Status:', json.error.status);
                console.error('\nFull error:', JSON.stringify(json.error, null, 2));
                process.exit(1);
            }

            if (json.candidates && json.candidates[0]) {
                const responseText = json.candidates[0].content.parts[0].text;
                console.log('\n✅ API Response received!');
                console.log('Response:', responseText);
                console.log('\n✅ Google Gemini API is working correctly!');
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
