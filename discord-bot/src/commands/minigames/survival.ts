import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types.js";
import { COLORS, randomInt, randomItem } from "../../lib/utils.js";
import { getOrCreateRpgProfile, addXp, addGold, rpgStore } from "../../lib/storage.js";

type TableEntry = { name: string; xp: number; gold: number; chance: number };

function rollTable(table: TableEntry[]) {
  const roll = Math.random();
  let cumulative = 0;
  for (const item of table) { cumulative += item.chance; if (roll < cumulative) return item; }
  return table[table.length - 1];
}

const FISH: TableEntry[] = [
  { name: "🐟 Small Fish", xp: 5, gold: 5, chance: 0.4 }, { name: "🐠 Tropical Fish", xp: 10, gold: 15, chance: 0.25 },
  { name: "🐡 Puffer Fish", xp: 15, gold: 20, chance: 0.15 }, { name: "🦈 Shark", xp: 40, gold: 80, chance: 0.05 },
  { name: "🐙 Octopus", xp: 30, gold: 60, chance: 0.08 }, { name: "⚓ Old Boot", xp: 1, gold: 0, chance: 0.07 },
];
const ORES: TableEntry[] = [
  { name: "🪨 Stone", xp: 3, gold: 2, chance: 0.4 }, { name: "🟤 Copper", xp: 8, gold: 10, chance: 0.25 },
  { name: "⚙️ Iron Ore", xp: 15, gold: 20, chance: 0.2 }, { name: "💛 Gold Ore", xp: 30, gold: 50, chance: 0.1 },
  { name: "💎 Diamond", xp: 80, gold: 200, chance: 0.05 },
];
const GAME_ANIMALS: TableEntry[] = [
  { name: "🐇 Rabbit", xp: 10, gold: 15, chance: 0.35 }, { name: "🦌 Deer", xp: 25, gold: 40, chance: 0.25 },
  { name: "🐗 Wild Boar", xp: 30, gold: 50, chance: 0.2 }, { name: "🦅 Eagle", xp: 40, gold: 70, chance: 0.1 },
  { name: "🐻 Bear", xp: 80, gold: 150, chance: 0.1 },
];

function makeSurvivalCommand(name: string, description: string, emoji: string, table: TableEntry[], failChance = 0.2): Command {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(description),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();
      await new Promise((r) => setTimeout(r, randomInt(1000, 2000)));
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      if (Math.random() < failChance) {
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle(`${emoji} Nothing Found`).setDescription(`You tried but didn't get anything this time. Try again!`)] });
        return;
      }
      const caught = rollTable(table);
      const qty = randomInt(1, 3);
      addXp(interaction.user.id, interaction.guildId!, caught.xp * qty);
      addGold(interaction.user.id, interaction.guildId!, caught.gold * qty);
      const existing = p.inventory.find((i) => i.name === caught.name);
      if (existing) existing.quantity += qty;
      else p.inventory.push({ id: caught.name.replace(/[^\w]/g, "_").toLowerCase(), name: caught.name, type: "misc", quantity: qty });
      rpgStore.set(`${interaction.guildId!}:${interaction.user.id}`, p);
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle(`${emoji} Success!`).setDescription(`You got **${caught.name}** x${qty}!`).addFields({ name: "Rewards", value: `+${caught.xp * qty} XP, +${caught.gold * qty} 💰` })] });
    },
  };
}

export const survivalCommands: Command[] = [
  makeSurvivalCommand("fishing", "Go fishing and catch fish", "🎣", FISH, 0.2),
  makeSurvivalCommand("mining", "Mine for ores and gems", "⛏️", ORES, 0.15),
  makeSurvivalCommand("hunting", "Hunt wild game", "🏹", GAME_ANIMALS, 0.25),
];
