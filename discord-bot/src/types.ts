import type { ChatInputCommandInteraction } from "discord.js";

export interface Command {
  data: { toJSON(): object; name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<unknown>;
}

export interface WarnEntry {
  id: string;
  userId: string;
  guildId: string;
  moderatorId: string;
  reason: string;
  timestamp: number;
}

export interface Case {
  id: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  type: string;
  reason: string;
  timestamp: number;
  status: "open" | "closed";
  notes: string[];
  evidence: string[];
}

export interface Report {
  id: string;
  guildId: string;
  reportedId: string;
  reporterId: string | null;
  reason: string;
  timestamp: number;
  status: "open" | "closed" | "claimed";
  claimedBy?: string;
}

export interface Note {
  id: string;
  guildId: string;
  userId: string;
  authorId: string;
  content: string;
  timestamp: number;
}

export interface RpgProfile {
  userId: string;
  guildId: string;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  inventory: InventoryItem[];
  equipment: { weapon?: string; armor?: string };
  pets: Pet[];
  wins: number;
  losses: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: "weapon" | "armor" | "potion" | "misc";
  quantity: number;
  stats?: { attack?: number; defense?: number; hp?: number };
}

export interface Pet {
  name: string;
  type: string;
  level: number;
  xp: number;
}

export interface AutomodSettings {
  guildId: string;
  spam: { enabled: boolean; threshold: number };
  invites: { enabled: boolean };
  links: { enabled: boolean; whitelist: string[] };
  caps: { enabled: boolean; threshold: number };
  mentions: { enabled: boolean; threshold: number };
  profanity: { enabled: boolean; words: string[] };
  phishing: { enabled: boolean };
  duplicates: { enabled: boolean };
}

export interface LogSettings {
  guildId: string;
  channels: Record<string, string>;
}

export interface GameState {
  board?: string[][];
  players: string[];
  currentTurn: number;
  messageId?: string;
  channelId?: string;
  guildId?: string;
  data?: Record<string, unknown>;
}
