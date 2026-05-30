import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types.js";
import { casesStore, warnsStore, strikesStore } from "../../lib/storage.js";
import { infoEmbed, COLORS } from "../../lib/utils.js";

export const staffCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("staffstats")
      .setDescription("View moderation stats for a staff member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("Staff member (defaults to yourself)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const guildId = interaction.guildId!;
      const allCases = Object.values(casesStore.getAll()).filter((c) => c.guildId === guildId && c.moderatorId === user.id);
      const byType: Record<string, number> = {};
      for (const c of allCases) byType[c.type] = (byType[c.type] ?? 0) + 1;
      const statsStr = Object.entries(byType).map(([t, n]) => `${t}: **${n}**`).join(" | ") || "No actions";
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle(`📊 Staff Stats: ${user.tag}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: "Total Actions", value: allCases.length.toString(), inline: true },
            { name: "Breakdown", value: statsStr },
          )
        ],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("staffleaderboard")
      .setDescription("View top moderators by action count")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction: ChatInputCommandInteraction) {
      const guildId = interaction.guildId!;
      const allCases = Object.values(casesStore.getAll()).filter((c) => c.guildId === guildId);
      const counts: Record<string, number> = {};
      for (const c of allCases) counts[c.moderatorId] = (counts[c.moderatorId] ?? 0) + 1;
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!sorted.length) return interaction.reply({ embeds: [infoEmbed("No Data", "No moderation actions recorded yet.")] });
      const list = sorted.map(([id, n], i) => `**${i + 1}.** <@${id}> — ${n} action(s)`).join("\n");
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle("🏆 Staff Leaderboard").setDescription(list)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("staffwarnings")
      .setDescription("View how many warnings staff have issued")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction: ChatInputCommandInteraction) {
      const guildId = interaction.guildId!;
      const warnCases = Object.values(casesStore.getAll()).filter((c) => c.guildId === guildId && c.type === "WARN");
      const counts: Record<string, number> = {};
      for (const c of warnCases) counts[c.moderatorId] = (counts[c.moderatorId] ?? 0) + 1;
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!sorted.length) return interaction.reply({ embeds: [infoEmbed("No Data", "No warnings issued yet.")] });
      const list = sorted.map(([id, n], i) => `**${i + 1}.** <@${id}> — ${n} warning(s)`).join("\n");
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle("⚠️ Staff Warnings Issued").setDescription(list)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("staffactivity")
      .setDescription("View recent staff activity (last 24h)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction: ChatInputCommandInteraction) {
      const guildId = interaction.guildId!;
      const since = Date.now() - 86400000;
      const recent = Object.values(casesStore.getAll())
        .filter((c) => c.guildId === guildId && c.timestamp > since)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 15);
      if (!recent.length) return interaction.reply({ embeds: [infoEmbed("No Activity", "No staff activity in the last 24 hours.")] });
      const list = recent.map((c) => `<@${c.moderatorId}> **${c.type}** on <@${c.userId}> — ${c.reason.slice(0, 40)}`).join("\n");
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle("📅 Staff Activity (24h)").setDescription(list)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("staffcheck")
      .setDescription("Check if a user is a staff member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("User to check").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [infoEmbed("User Not Found")] });
      const isStaff = member.permissions.has(PermissionFlagsBits.ModerateMembers);
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      const embed = new EmbedBuilder().setColor(isAdmin ? COLORS.mod : isStaff ? COLORS.warning : COLORS.info)
        .setTitle(`🔍 Staff Check: ${user.tag}`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Administrator", value: isAdmin ? "✅ Yes" : "❌ No", inline: true },
          { name: "Can Moderate", value: isStaff ? "✅ Yes" : "❌ No", inline: true },
          { name: "Can Ban", value: member.permissions.has(PermissionFlagsBits.BanMembers) ? "✅ Yes" : "❌ No", inline: true },
          { name: "Can Manage Roles", value: member.permissions.has(PermissionFlagsBits.ManageRoles) ? "✅ Yes" : "❌ No", inline: true },
        );
      await interaction.reply({ embeds: [embed] });
    },
  },
];
