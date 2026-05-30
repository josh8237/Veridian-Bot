import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type TextChannel,
  type Message,
} from "discord.js";
import type { Command } from "../../types.js";
import { COLORS, randomInt, randomItem } from "../../lib/utils.js";

export const reactionCommands: Command[] = [
  {
    data: new SlashCommandBuilder().setName("reactiontest").setDescription("Test your reaction time — click as fast as you can!"),
    async execute(interaction: ChatInputCommandInteraction) {
      const delay = randomInt(2000, 6000);
      const waitRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("reaction_click").setLabel("Wait...").setStyle(ButtonStyle.Danger).setDisabled(true)
      );
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle("⚡ Reaction Test").setDescription("Get ready! Click the button as soon as it turns GREEN!")], components: [waitRow] });
      await new Promise((r) => setTimeout(r, delay));
      const msg = await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("⚡ CLICK NOW!")],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId("reaction_click").setLabel("🟢 CLICK!").setStyle(ButtonStyle.Success))],
      });
      const start = Date.now();
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 10000, max: 1 });
      collector.on("collect", async (btn) => {
        const ms = Date.now() - start;
        const rating = ms < 200 ? "⚡ GODLIKE" : ms < 300 ? "🚀 Incredible" : ms < 400 ? "✨ Great" : ms < 600 ? "👍 Good" : ms < 900 ? "😐 Average" : "🐌 Slow";
        await btn.update({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle("⚡ Reaction Time").addFields({ name: "Time", value: `**${ms}ms**`, inline: true }, { name: "Rating", value: rating, inline: true })], components: [] });
      });
      collector.on("end", async (c) => { if (c.size === 0) await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle("⏰ Too slow!")], components: [] }).catch(() => null); });
    },
  },
  {
    data: new SlashCommandBuilder().setName("fastclick").setDescription("Click the button as many times as possible in 10 seconds!"),
    async execute(interaction: ChatInputCommandInteraction) {
      let count = 0;
      const row = (disabled = false) => new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("fast_click").setLabel(`Click! (${count})`).setStyle(ButtonStyle.Primary).setDisabled(disabled)
      );
      const msg = await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle("⚡ Fast Click").setDescription("Click as many times as possible in **10 seconds**!")], components: [row()], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: (b) => b.user.id === interaction.user.id, time: 10000 });
      collector.on("collect", async (btn) => { count++; await btn.update({ components: [row()] }); });
      collector.on("end", async () => {
        const rating = count > 100 ? "⚡ SUPERHUMAN" : count > 60 ? "🚀 Amazing" : count > 40 ? "✨ Excellent" : count > 25 ? "👍 Good" : "😐 Average";
        await msg.edit({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle("⚡ Results").addFields({ name: "Clicks", value: `**${count}**`, inline: true }, { name: "CPS", value: (count / 10).toFixed(2), inline: true }, { name: "Rating", value: rating, inline: true })], components: [row(true)] }).catch(() => null);
      });
    },
  },
  {
    data: new SlashCommandBuilder().setName("emojihunt").setDescription("Find the target emoji among fakes as fast as possible!"),
    async execute(interaction: ChatInputCommandInteraction) {
      const EMOJI_SETS = [
        { target: "🍎", fakes: ["🍊", "🍋", "🍇", "🍓"] },
        { target: "⭐", fakes: ["🌟", "💫", "✨", "🌠"] },
        { target: "🦊", fakes: ["🐺", "🦝", "🐱", "🦁"] },
        { target: "💎", fakes: ["🔷", "🔹", "💠", "🔵"] },
      ];
      const { target, fakes } = randomItem(EMOJI_SETS);
      const allEmojis = [target, ...fakes, ...fakes].sort(() => Math.random() - 0.5).slice(0, 9);
      if (!allEmojis.includes(target)) allEmojis[randomInt(0, 8)] = target;
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let c = 0; c < 3; c++) {
          const i = r * 3 + c;
          row.addComponents(new ButtonBuilder().setCustomId(`emoji_${i}`).setLabel(allEmojis[i]).setStyle(ButtonStyle.Secondary));
        }
        rows.push(row);
      }
      const start = Date.now();
      const msg = await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle("🔍 Emoji Hunt").setDescription(`Find the **${target}** emoji as fast as possible!`)], components: rows, fetchReply: true });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: (b) => b.user.id === interaction.user.id, time: 15000, max: 1 });
      collector.on("collect", async (btn) => {
        const ms = Date.now() - start;
        const correct = allEmojis[parseInt(btn.customId.split("_")[1])] === target;
        await btn.update({ embeds: [new EmbedBuilder().setColor(correct ? COLORS.success : COLORS.error).setTitle(correct ? `✅ Found it! (${ms}ms)` : "❌ Wrong one!").setDescription(correct ? `You found ${target} in **${ms}ms**!` : `Try again with /emojihunt!`)], components: [] });
      });
    },
  },
];
