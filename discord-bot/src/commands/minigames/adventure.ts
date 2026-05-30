import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types.js";
import { COLORS, randomInt, randomItem } from "../../lib/utils.js";
import { getOrCreateRpgProfile, addXp, addGold, rpgStore } from "../../lib/storage.js";

const DUNGEONS = [
  { name: "Goblin Cave", monsters: ["Goblin", "Cave Spider", "Orc"], minLevel: 1, xp: [20, 50] as [number,number], gold: [10, 40] as [number,number] },
  { name: "Dark Forest", monsters: ["Wolf", "Dark Elf", "Treant"], minLevel: 5, xp: [40, 80] as [number,number], gold: [30, 70] as [number,number] },
  { name: "Dragon Lair", monsters: ["Drake", "Fire Demon", "Elder Dragon"], minLevel: 10, xp: [80, 150] as [number,number], gold: [80, 200] as [number,number] },
];

const QUESTS = [
  { name: "Deliver the Package", desc: "Carry a mysterious package across the dangerous road.", xp: 50, gold: 100 },
  { name: "Hunt the Beast", desc: "A monster has been terrorizing local villages.", xp: 80, gold: 150 },
  { name: "Find the Artifact", desc: "Locate an ancient artifact hidden in the ruins.", xp: 120, gold: 250 },
  { name: "Rescue the Prisoner", desc: "A local merchant has been captured by bandits.", xp: 70, gold: 130 },
];

export const adventureCommands: Command[] = [
  {
    data: new SlashCommandBuilder().setName("dungeon").setDescription("Explore a dungeon"),
    async execute(interaction: ChatInputCommandInteraction) {
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      const available = DUNGEONS.filter((d) => p.level >= d.minLevel);
      const dungeon = randomItem(available);
      const monster = randomItem(dungeon.monsters);
      const success = Math.random() < (0.4 + p.level * 0.05);
      const xpGain = randomInt(dungeon.xp[0], dungeon.xp[1]);
      const goldGain = randomInt(dungeon.gold[0], dungeon.gold[1]);
      if (success) {
        const { levelUp, newLevel } = addXp(interaction.user.id, interaction.guildId!, xpGain);
        addGold(interaction.user.id, interaction.guildId!, goldGain);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle(`⚔️ Dungeon: ${dungeon.name}`).setDescription(`You entered **${dungeon.name}** and defeated a **${monster}**!${levelUp ? `\n\n🎉 **Level Up! Now level ${newLevel}!**` : ""}`).addFields({ name: "Rewards", value: `+${xpGain} XP, +${goldGain} 💰` })] });
      } else {
        const hpLoss = randomInt(10, Math.floor(p.maxHp * 0.3));
        p.hp = Math.max(1, p.hp - hpLoss);
        rpgStore.set(`${interaction.guildId!}:${interaction.user.id}`, p);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle(`💀 Dungeon: ${dungeon.name}`).setDescription(`A **${monster}** defeated you! Lost **${hpLoss}** HP (${p.hp}/${p.maxHp} remaining)`)] });
      }
    },
  },
  {
    data: new SlashCommandBuilder().setName("quest").setDescription("Go on a quest"),
    async execute(interaction: ChatInputCommandInteraction) {
      const quest = randomItem(QUESTS);
      await interaction.deferReply();
      await new Promise((r) => setTimeout(r, 2000));
      const success = Math.random() < 0.75;
      if (success) {
        addXp(interaction.user.id, interaction.guildId!, quest.xp);
        addGold(interaction.user.id, interaction.guildId!, quest.gold);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle(`📜 Quest Complete: ${quest.name}`).setDescription(`*${quest.desc}*\n\n✅ Quest completed!`).addFields({ name: "Rewards", value: `+${quest.xp} XP, +${quest.gold} 💰` })] });
      } else {
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle(`📜 Quest Failed: ${quest.name}`).setDescription(`*${quest.desc}*\n\n❌ Failed. Better luck next time!`)] });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("raid")
      .setDescription("Raid an enemy stronghold")
      .addStringOption((o) => o.setName("target").setDescription("Target").setRequired(true).addChoices(
        { name: "Goblin Camp (Lv. 1+)", value: "goblin" },
        { name: "Bandit Fortress (Lv. 5+)", value: "bandit" },
        { name: "Dark Castle (Lv. 10+)", value: "castle" },
      )),
    async execute(interaction: ChatInputCommandInteraction) {
      const target = interaction.options.getString("target", true);
      const raids: Record<string, { name: string; minLevel: number; xp: number; gold: number; difficulty: number }> = {
        goblin: { name: "Goblin Camp", minLevel: 1, xp: 60, gold: 120, difficulty: 0.6 },
        bandit: { name: "Bandit Fortress", minLevel: 5, xp: 120, gold: 250, difficulty: 0.4 },
        castle: { name: "Dark Castle", minLevel: 10, xp: 200, gold: 500, difficulty: 0.25 },
      };
      const raid = raids[target];
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      if (p.level < raid.minLevel) { await interaction.reply({ content: `❌ You need to be level ${raid.minLevel}+ for this raid!`, ephemeral: true }); return; }
      await interaction.deferReply();
      await new Promise((r) => setTimeout(r, 2500));
      const success = Math.random() < raid.difficulty + (p.level * 0.03);
      if (success) {
        addXp(interaction.user.id, interaction.guildId!, raid.xp);
        addGold(interaction.user.id, interaction.guildId!, raid.gold);
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle(`⚔️ Raid Success: ${raid.name}`).setDescription(`You raided **${raid.name}** and returned with spoils!`).addFields({ name: "Rewards", value: `+${raid.xp} XP, +${raid.gold} 💰` })] });
      } else {
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle(`💀 Raid Failed: ${raid.name}`).setDescription(`The defenders repelled your attack. Try again!`)] });
      }
    },
  },
];
