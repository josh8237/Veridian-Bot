import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types.js";
import { reportsStore, generateId } from "../../lib/storage.js";
import { successEmbed, errorEmbed, infoEmbed, modEmbed, formatTimestamp, COLORS } from "../../lib/utils.js";

export const reportsCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("report")
      .setDescription("Report a user or manage reports")
      .addSubcommand((sub) =>
        sub.setName("user").setDescription("Report a user")
          .addUserOption((o) => o.setName("user").setDescription("User to report").setRequired(true))
          .addStringOption((o) => o.setName("reason").setDescription("Reason for report").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("anonymous").setDescription("Anonymously report a user")
          .addUserOption((o) => o.setName("user").setDescription("User to report").setRequired(true))
          .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("list").setDescription("List open reports (staff only)")
      )
      .addSubcommand((sub) =>
        sub.setName("claim").setDescription("Claim a report (staff only)")
          .addStringOption((o) => o.setName("report_id").setDescription("Report ID").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("close").setDescription("Close a report (staff only)")
          .addStringOption((o) => o.setName("report_id").setDescription("Report ID").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("reopen").setDescription("Reopen a report (staff only)")
          .addStringOption((o) => o.setName("report_id").setDescription("Report ID").setRequired(true))
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guildId!;

      if (sub === "user" || sub === "anonymous") {
        const user = interaction.options.getUser("user", true);
        const reason = interaction.options.getString("reason", true);
        const isAnon = sub === "anonymous";
        const id = generateId();
        reportsStore.set(id, {
          id,
          guildId,
          reportedId: user.id,
          reporterId: isAnon ? null : interaction.user.id,
          reason,
          timestamp: Date.now(),
          status: "open",
        });
        await interaction.reply({
          embeds: [successEmbed("Report Submitted", `Your report (ID: \`${id}\`) has been submitted.${isAnon ? " Your identity is anonymous." : ""}`)],
          ephemeral: true,
        });

      } else if (sub === "list") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
          return interaction.reply({ embeds: [errorEmbed("No Permission")], ephemeral: true });
        }
        const openReports = Object.values(reportsStore.getAll()).filter((r) => r.guildId === guildId && r.status === "open");
        if (!openReports.length) return interaction.reply({ embeds: [infoEmbed("No Open Reports", "There are no open reports.")] });
        const list = openReports.slice(0, 10).map((r) => `\`${r.id}\` — <@${r.reportedId}> — ${r.reason.slice(0, 60)}`).join("\n");
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle("📋 Open Reports").setDescription(list).setFooter({ text: `${openReports.length} open report(s)` })] });

      } else if (sub === "claim") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ embeds: [errorEmbed("No Permission")], ephemeral: true });
        const reportId = interaction.options.getString("report_id", true).toUpperCase();
        const r = reportsStore.get(reportId);
        if (!r || r.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Report Not Found")], ephemeral: true });
        r.status = "claimed";
        r.claimedBy = interaction.user.id;
        reportsStore.set(reportId, r);
        await interaction.reply({ embeds: [successEmbed("Report Claimed", `You have claimed report #${reportId}.`)] });

      } else if (sub === "close") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ embeds: [errorEmbed("No Permission")], ephemeral: true });
        const reportId = interaction.options.getString("report_id", true).toUpperCase();
        const r = reportsStore.get(reportId);
        if (!r || r.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Report Not Found")], ephemeral: true });
        r.status = "closed";
        reportsStore.set(reportId, r);
        await interaction.reply({ embeds: [successEmbed("Report Closed", `Report #${reportId} has been closed.`)] });

      } else if (sub === "reopen") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ embeds: [errorEmbed("No Permission")], ephemeral: true });
        const reportId = interaction.options.getString("report_id", true).toUpperCase();
        const r = reportsStore.get(reportId);
        if (!r || r.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Report Not Found")], ephemeral: true });
        r.status = "open";
        reportsStore.set(reportId, r);
        await interaction.reply({ embeds: [successEmbed("Report Reopened", `Report #${reportId} has been reopened.`)] });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("reports")
      .setDescription("List all open reports (staff only)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction: ChatInputCommandInteraction) {
      const guildId = interaction.guildId!;
      const openReports = Object.values(reportsStore.getAll()).filter((r) => r.guildId === guildId && r.status !== "closed");
      if (!openReports.length) return interaction.reply({ embeds: [infoEmbed("No Reports", "No active reports.")] });
      const list = openReports.slice(0, 15).map((r) => {
        const reporter = r.reporterId ? `<@${r.reporterId}>` : "Anonymous";
        return `\`${r.id}\` [${r.status.toUpperCase()}] <@${r.reportedId}> by ${reporter}\n↳ ${r.reason.slice(0, 60)}`;
      }).join("\n\n");
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle("📋 Reports").setDescription(list).setFooter({ text: `${openReports.length} active report(s)` })] });
    },
  },
];
