import { EmbedBuilder, type ColorResolvable } from "discord.js";

export const COLORS = {
  success: 0x57f287 as ColorResolvable,
  error: 0xed4245 as ColorResolvable,
  warning: 0xfee75c as ColorResolvable,
  info: 0x5865f2 as ColorResolvable,
  mod: 0xeb459e as ColorResolvable,
  gold: 0xfaa61a as ColorResolvable,
  blue: 0x3498db as ColorResolvable,
};

export function successEmbed(title: string, description?: string) {
  const embed = new EmbedBuilder().setColor(COLORS.success).setTitle(`✅ ${title}`);
  if (description) embed.setDescription(description);
  return embed;
}

export function errorEmbed(title: string, description?: string) {
  const embed = new EmbedBuilder().setColor(COLORS.error).setTitle(`❌ ${title}`);
  if (description) embed.setDescription(description);
  return embed;
}

export function infoEmbed(title: string, description?: string) {
  const embed = new EmbedBuilder().setColor(COLORS.info).setTitle(`ℹ️ ${title}`);
  if (description) embed.setDescription(description);
  return embed;
}

export function modEmbed(title: string, description?: string) {
  const embed = new EmbedBuilder().setColor(COLORS.mod).setTitle(`🛡️ ${title}`);
  if (description) embed.setDescription(description);
  return embed;
}

export function parseDuration(duration: string): number | null {
  const match = duration.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return value * multipliers[unit];
}

export function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  if (ms < 604800000) return `${Math.floor(ms / 86400000)}d`;
  return `${Math.floor(ms / 604800000)}w`;
}

export function formatTimestamp(ts: number): string {
  return `<t:${Math.floor(ts / 1000)}:R>`;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function mockText(text: string): string {
  return text.split("").map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase())).join("");
}

export function owoify(text: string): string {
  return text
    .replace(/r/g, "w").replace(/R/g, "W")
    .replace(/l/g, "w").replace(/L/g, "W")
    .replace(/n([aeiou])/gi, "ny$1")
    .replace(/ove/gi, "uv")
    + " " + randomItem(["OwO", "UwU", ">w<", "^w^", "~"]);
}

export function progressBar(current: number, max: number, length = 10): string {
  const filled = Math.round((current / max) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const ROASTS = [
  "You're the human equivalent of a participation trophy.",
  "I'd agree with you but then we'd both be wrong.",
  "You're not stupid; you just have bad luck thinking.",
  "You have the right to remain silent because whatever you say will be ignored anyway.",
  "I'd call you a tool but that implies you're actually useful.",
  "You're like a cloud — when you disappear it's a beautiful day.",
  "I'd roast you, but my mom said I'm not allowed to burn trash.",
  "You have miles to go before you reach mediocre.",
  "Some people bring happiness wherever they go; you bring it whenever you go.",
  "If laughter is the best medicine, your face must be curing diseases.",
];

export const COMPLIMENTS = [
  "You light up every room you walk into! ✨",
  "Your kindness is like a ray of sunshine! ☀️",
  "You have an amazing ability to make others smile! 😊",
  "Your creativity knows no bounds! 🎨",
  "You're genuinely one of a kind! 💎",
  "The world is a better place with you in it! 🌍",
  "Your energy is absolutely contagious! ⚡",
  "You're stronger than you know! 💪",
  "Your passion and dedication are truly inspiring! 🔥",
  "You make everything you touch better! ✨",
];

export const TRUTHS = [
  "What's the most embarrassing thing you've done on Discord?",
  "Have you ever left a server without saying goodbye?",
  "Who in this server do you think would be the worst president?",
  "What's the most cringe thing in your messages?",
  "Have you ever muted someone and pretended you didn't see their message?",
  "What's your most controversial opinion about gaming?",
  "Have you ever pretended to be busy online to avoid talking to someone?",
];

export const DARES = [
  "Change your nickname to 'Silly Goose' for 10 minutes.",
  "Send a random GIF to the server without any context.",
  "Speak only in rhymes for the next 5 minutes.",
  "Add 'uwu' to the end of every message for 3 minutes.",
  "Send a voice message singing happy birthday to the server.",
  "Compliment every person who types in chat for 2 minutes.",
];

export const WOULD_YOU_RATHER = [
  "Would you rather fight 100 duck-sized horses or one horse-sized duck?",
  "Would you rather always speak in rhyme or always sing instead of talk?",
  "Would you rather lose all your memories or never make new ones?",
  "Would you rather have Wi-Fi everywhere but it's always 1 Mbps, or have perfect connection but only in your home?",
  "Would you rather be able to fly but only 1 foot off the ground, or teleport but only 10 feet at a time?",
  "Would you rather eat nothing but pizza for a year or never eat pizza again?",
  "Would you rather have unlimited money but no friends, or be broke but have amazing friends?",
  "Would you rather always know when people are lying or always get away with lying yourself?",
];

export const HOT_TAKES = [
  "Pineapple on pizza is actually good.",
  "Tabs are better than spaces.",
  "The original Minecraft soundtrack is peak music.",
  "Dark mode is overrated.",
  "Cereal before milk is correct.",
  "Skip buttons for ads should be illegal.",
  "Reply guys are the backbone of social media.",
  "Superhero movies peaked 10 years ago.",
];

export const FORTUNES = [
  "A smile is your personal welcome mat.",
  "All things are difficult before they are easy.",
  "Better to ask twice than to lose yourself once.",
  "Courage is the ladder on which all other virtues mount.",
  "Fortune favors the bold.",
  "Good news will come to you by mail.",
  "Hard work pays off in the future, laziness pays off now.",
  "Help! I am being held prisoner in a fortune cookie factory.",
  "If you think nobody cares if you're alive, try missing a couple car payments.",
  "The answer you seek lies within you.",
];
