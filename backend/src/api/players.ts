import { Request, Response } from "express";
import path from "path";
import fs from "fs";

export const getPlayers = (req: Request, res: Response) => {
  const filePath = path.join(__dirname, "../../data/players.json");
  fs.readFile(filePath, "utf8", (err: NodeJS.ErrnoException | null, data: string | undefined) => {
    if (err || !data) {
      res.status(500).json({ error: "Could not read players data" });
      return;
    }
    try {
      const players = JSON.parse(data);
      res.json(players);
    } catch (parseErr) {
      res.status(500).json({ error: "Invalid JSON format" });
    }
  });
};
