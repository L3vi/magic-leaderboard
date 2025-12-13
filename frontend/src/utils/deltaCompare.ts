/**
 * Utilities for comparing data and detecting meaningful changes
 */

import { Game, Player } from '../services/dataService';

export interface DeltaResult<T> {
  hasChanges: boolean;
  updated: T[];
  added: T[];
  removed: T[];
  unchanged: T[];
}

/**
 * Deep equality check for objects
 */
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Compare two arrays of items and identify what changed
 * Returns detailed delta info: hasChanges, updated, added, removed, unchanged
 */
export function compareArrays<T extends { id: string }>(
  oldData: T[],
  newData: T[]
): DeltaResult<T> {
  const oldMap = new Map(oldData.map(item => [item.id, item]));
  const newMap = new Map(newData.map(item => [item.id, item]));

  const updated: T[] = [];
  const added: T[] = [];
  const removed: T[] = [];
  const unchanged: T[] = [];

  // Find added and updated items
  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id);
    if (!oldItem) {
      added.push(newItem);
    } else if (!deepEqual(oldItem, newItem)) {
      updated.push(newItem);
    } else {
      unchanged.push(newItem);
    }
  }

  // Find removed items
  for (const [id, oldItem] of oldMap) {
    if (!newMap.has(id)) {
      removed.push(oldItem);
    }
  }

  const hasChanges = updated.length > 0 || added.length > 0 || removed.length > 0;

  return {
    hasChanges,
    updated,
    added,
    removed,
    unchanged,
  };
}

/**
 * Selectively merge new data with old data, only updating changed items
 * Preserves references for unchanged items to avoid unnecessary re-renders
 */
export function mergeWithChanges<T extends { id: string }>(
  oldData: T[],
  newData: T[]
): T[] {
  const delta = compareArrays(oldData, newData);
  
  if (!delta.hasChanges) {
    return oldData; // Return same reference if nothing changed
  }

  // Build new array: unchanged items + updated items + added items
  const result: T[] = [];
  const processedIds = new Set<string>();

  // First, preserve order of old items that are unchanged or updated
  for (const oldItem of oldData) {
    const newItem = newData.find(item => item.id === oldItem.id);
    if (newItem && !deepEqual(oldItem, newItem)) {
      result.push(newItem); // Updated item
    } else if (newItem) {
      result.push(oldItem); // Unchanged item - preserve reference
    }
    // If no newItem, it was removed - skip it
    processedIds.add(oldItem.id);
  }

  // Then add any new items that weren't in oldData
  for (const newItem of newData) {
    if (!processedIds.has(newItem.id)) {
      result.push(newItem);
    }
  }

  return result;
}

/**
 * Identify which games were affected (have player score changes)
 * Useful for determining if we need to refresh player scores
 */
export function identifyAffectedGames(
  oldGames: Game[],
  newGames: Game[]
): string[] {
  const delta = compareArrays(oldGames, newGames);
  const affectedIds = new Set<string>();

  // Added and updated games definitely affect scores
  delta.added.forEach(game => affectedIds.add(game.id));
  delta.updated.forEach(game => affectedIds.add(game.id));

  // Removed games also affect scores
  delta.removed.forEach(game => affectedIds.add(game.id));

  return Array.from(affectedIds);
}

/**
 * Check if games data has meaningful changes that would affect player scores
 */
export function gamesHaveMeaningfulChanges(
  oldGames: Game[],
  newGames: Game[]
): boolean {
  const delta = compareArrays(oldGames, newGames);
  return delta.hasChanges;
}
