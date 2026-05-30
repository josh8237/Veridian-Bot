import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../../data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export class JsonStore<T> {
  private filePath: string;
  private cache: Record<string, T> = {};

  constructor(name: string) {
    ensureDir();
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.cache = JSON.parse(fs.readFileSync(this.filePath, "utf-8")) as Record<string, T>;
      }
    } catch {
      this.cache = {};
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
  }

  get(key: string): T | undefined {
    return this.cache[key];
  }

  set(key: string, value: T) {
    this.cache[key] = value;
    this.save();
  }

  delete(key: string) {
    delete this.cache[key];
    this.save();
  }

  getAll(): Record<string, T> {
    return { ...this.cache };
  }

  has(key: string): boolean {
    return key in this.cache;
  }

  values(): T[] {
    return Object.values(this.cache);
  }

  entries(): [string, T][] {
    return Object.entries(this.cache);
  }
}

import type { WarnEntry, Case, Report, Note, RpgProfile, AutomodSettings, LogSettings } from "../types.js";

export const warnsStore = new JsonStore<WarnEntry[]>("warns");
export const casesStore = new JsonStore<Case>("cases");
export const reportsStore = new JsonStore<Report>("reports");
export const notesStore = new JsonStore<Note>("notes");
export const rpgStore = new JsonStore<RpgProfile>("rpg");
export const automodStore = new JsonStore<AutomodSettings>("automod");
export const logsStore = new JsonStore<LogSettings>("logs");
export const blacklistStore = new JsonStore<{ reason: string; timestamp: number }>("blacklist");
export const jailStore = new JsonStore<{ roles: string[]; timestamp: number }>("jail");
export const quarantineStore = new JsonStore<{ roles: string[]; timestamp: number }>("quarantine");
export const strikesStore = new JsonStore<{ id: string; reason: string; timestamp: number }[]>("strikes");
export const nickLockStore = new JsonStore<string>("nicklock");
export const tempbanStore = new JsonStore<{ userId: string; guildId: string; expiresAt: number }>("tempban");
export const lockedChannelsStore = new JsonStore<boolean>("locked_channels");

export function getOrCreateRpgProfile(userId: string, guildId: string): RpgProfile {
  const key = `${guildId}:${userId}`;
  let profile = rpgStore.get(key);
  if (!profile) {
    profile = {
      userId,
      guildId,
      level: 1,
      xp: 0,
      gold: 100,
      hp: 100,
      maxHp: 100,
      attack: 10,
      defense: 5,
      inventory: [],
      equipment: {},
      pets: [],
      wins: 0,
      losses: 0,
    };
    rpgStore.set(key, profile);
  }
  return profile;
}

export function addXp(userId: string, guildId: string, amount: number): { levelUp: boolean; newLevel: number } {
  const profile = getOrCreateRpgProfile(userId, guildId);
  profile.xp += amount;
  const xpNeeded = profile.level * 100;
  let levelUp = false;
  if (profile.xp >= xpNeeded) {
    profile.xp -= xpNeeded;
    profile.level++;
    profile.maxHp += 10;
    profile.hp = profile.maxHp;
    profile.attack += 2;
    profile.defense += 1;
    levelUp = true;
  }
  rpgStore.set(`${guildId}:${userId}`, profile);
  return { levelUp, newLevel: profile.level };
}

export function addGold(userId: string, guildId: string, amount: number) {
  const profile = getOrCreateRpgProfile(userId, guildId);
  profile.gold = Math.max(0, profile.gold + amount);
  rpgStore.set(`${guildId}:${userId}`, profile);
  return profile.gold;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
