// Simple test server to verify Express works
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', message: 'Test server is running!' });
});

app.get('/agui', (req, res) => {
    res.json({ message: 'AG-UI endpoint reached' });
});

app.listen(3000, () => {
    console.log('✅ Test server running on http://localhost:3000');
    console.log('   Try: curl http://localhost:3000/health');
});
