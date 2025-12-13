import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getPlayers } from "./api/players";
import { getGames, createGame, updateGame, deleteGame, getSessions } from "./api/games";
import { getPlayerArtPreferences, saveCommanderArtPreference, clearCommanderArtPreference, clearAllPlayerArtPreferences } from "./api/artPreferences";
import './firebase'; // Initialize Firebase

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req: express.Request, res: express.Response) => {
  res.send('Magic Leaderboard API is running');
});
app.get("/api/players", getPlayers);
app.get("/api/sessions", getSessions);
app.get("/api/games", getGames);
app.post("/api/games", createGame);
app.put("/api/games/:gameId", updateGame);
app.delete("/api/games/:gameId", deleteGame);

// Art preference endpoints
app.get("/api/players/:playerId/art", getPlayerArtPreferences);
app.post("/api/players/:playerId/art", saveCommanderArtPreference);
app.delete("/api/players/:playerId/art/:commanderName", clearCommanderArtPreference);
app.delete("/api/players/:playerId/art", clearAllPlayerArtPreferences);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
