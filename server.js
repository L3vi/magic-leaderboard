const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 4000;
const SCORES_PATH = path.join(__dirname, 'src', 'data', 'scores.json');

app.use(cors());
app.use(express.json());

// Get scores
app.get('/api/scores', (req, res) => {
    fs.readFile(SCORES_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read scores.' });
        res.json(JSON.parse(data));
    });
});

// Update scores
app.post('/api/scores', (req, res) => {
    const newScores = req.body;
    fs.writeFile(SCORES_PATH, JSON.stringify(newScores, null, 2), err => {
        if (err) return res.status(500).json({ error: 'Failed to write scores.' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Scores API server running on http://localhost:${PORT}`);
});
