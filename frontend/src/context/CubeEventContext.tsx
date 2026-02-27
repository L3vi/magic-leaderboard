import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import {
  fetchCubeEvent,
  fetchPlayers,
  addDraft as addDraftService,
  updateDraftStatus as updateDraftStatusService,
  addMatch as addMatchService,
  updateMatch as updateMatchService,
  deleteMatch as deleteMatchService,
} from "../services/cubeEventService";
import type {
  CubeEvent,
  Draft,
  Match,
  MatchPlayer,
  Player,
} from "../types";

interface CubeEventContextType {
  eventId: string | null;
  event: CubeEvent | null;
  players: Player[]; // resolved player objects for the event
  loading: boolean;
  error: string | null;
  refreshEvent: () => Promise<void>;
  addDraft: (draft: Omit<Draft, "id">) => Promise<Draft>;
  updateDraftStatus: (draftId: string, status: "in-progress" | "complete") => Promise<void>;
  addMatch: (matchData: { draftId: string; players: [MatchPlayer, MatchPlayer] }) => Promise<Match>;
  updateMatch: (matchId: string, matchData: Partial<Pick<Match, "draftId" | "players">>) => Promise<void>;
  deleteMatch: (matchId: string) => Promise<void>;
}

const CubeEventContext = createContext<CubeEventContextType | undefined>(undefined);

export const CubeEventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<CubeEvent | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [cubeEventResult, allPlayers] = await Promise.all([
        fetchCubeEvent(),
        fetchPlayers(),
      ]);

      if (cubeEventResult) {
        setEventId(cubeEventResult.id);
        setEvent(cubeEventResult.event);

        // Filter players to those in the event
        const eventPlayerIds = new Set(cubeEventResult.event.players);
        setPlayers(allPlayers.filter(p => eventPlayerIds.has(p.id)));
      } else {
        setEventId(null);
        setEvent(null);
        setPlayers([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      console.error("Error loading cube event data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(false); // silent refresh
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const refreshEvent = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const addDraft = useCallback(async (draft: Omit<Draft, "id">): Promise<Draft> => {
    if (!eventId) throw new Error("No active event");
    const newDraft = await addDraftService(eventId, draft);
    await loadData(false);
    return newDraft;
  }, [eventId, loadData]);

  const updateDraftStatus = useCallback(async (draftId: string, status: "in-progress" | "complete") => {
    if (!eventId) throw new Error("No active event");
    await updateDraftStatusService(eventId, draftId, status);
    await loadData(false);
  }, [eventId, loadData]);

  const addMatch = useCallback(async (matchData: { draftId: string; players: [MatchPlayer, MatchPlayer] }): Promise<Match> => {
    if (!eventId) throw new Error("No active event");
    const newMatch = await addMatchService(eventId, matchData);
    await loadData(false);
    return newMatch;
  }, [eventId, loadData]);

  const updateMatch = useCallback(async (matchId: string, matchData: Partial<Pick<Match, "draftId" | "players">>) => {
    if (!eventId) throw new Error("No active event");
    await updateMatchService(eventId, matchId, matchData);
    await loadData(false);
  }, [eventId, loadData]);

  const deleteMatch = useCallback(async (matchId: string) => {
    if (!eventId) throw new Error("No active event");
    await deleteMatchService(eventId, matchId);
    await loadData(false);
  }, [eventId, loadData]);

  return (
    <CubeEventContext.Provider
      value={{
        eventId,
        event,
        players,
        loading,
        error,
        refreshEvent,
        addDraft,
        updateDraftStatus,
        addMatch,
        updateMatch,
        deleteMatch,
      }}
    >
      {children}
    </CubeEventContext.Provider>
  );
};

export const useCubeEvent = () => {
  const context = useContext(CubeEventContext);
  if (!context) {
    throw new Error("useCubeEvent must be used within CubeEventProvider");
  }
  return context;
};
