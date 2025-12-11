import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getPlayers } from "./api/players";
import { getGames, createGame, updateGame, getSessions } from "./api/games";
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
