import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getPlayers } from "./api/players";
import { getGames, createGame, updateGame, deleteGame, getSessions } from "./api/games";
import { getPlayerArtPreferences, saveCommanderArtPreference, clearCommanderArtPreference, clearAllPlayerArtPreferences } from "./api/artPreferences";
import './firebase'; // Initialize Firebase

const app = express();

const allowedOrigins = [
  'https://l3vi.github.io',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:5173'] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

app.use(express.json());

function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.API_KEY;

  if (!validKey) {
    console.error('API_KEY not configured in environment');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  if (apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

app.get('/', (req: express.Request, res: express.Response) => {
  res.send('Magic Leaderboard API is running');
});

// Read endpoints (public)
app.get("/api/players", getPlayers);
app.get("/api/sessions", getSessions);
app.get("/api/games", getGames);
app.get("/api/players/:playerId/art", getPlayerArtPreferences);

// Write endpoints (require API key)
app.post("/api/games", requireApiKey, createGame);
app.put("/api/games/:gameId", requireApiKey, updateGame);
app.delete("/api/games/:gameId", requireApiKey, deleteGame);
app.post("/api/players/:playerId/art", requireApiKey, saveCommanderArtPreference);
app.delete("/api/players/:playerId/art/:commanderName", requireApiKey, clearCommanderArtPreference);
app.delete("/api/players/:playerId/art", requireApiKey, clearAllPlayerArtPreferences);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
