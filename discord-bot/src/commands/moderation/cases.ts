import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types.js";
import { casesStore, generateId } from "../../lib/storage.js";
import { successEmbed, errorEmbed, infoEmbed, modEmbed, formatTimestamp, COLORS } from "../../lib/utils.js";

export const casesCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("case")
      .setDescription("Manage moderation cases")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addSubcommand((sub) =>
        sub.setName("create").setDescription("Create a new case")
          .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
          .addStringOption((o) => o.setName("type").setDescription("Case type").setRequired(true)
            .addChoices({ name: "Warn", value: "WARN" }, { name: "Mute", value: "MUTE" }, { name: "Kick", value: "KICK" }, { name: "Ban", value: "BAN" }, { name: "Other", value: "OTHER" }))
          .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("view").setDescription("View a case")
          .addStringOption((o) => o.setName("case_id").setDescription("Case ID").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("edit").setDescription("Edit a case reason")
          .addStringOption((o) => o.setName("case_id").setDescription("Case ID").setRequired(true))
          .addStringOption((o) => o.setName("reason").setDescription("New reason").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("delete").setDescription("Delete a case")
          .addStringOption((o) => o.setName("case_id").setDescription("Case ID").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("note").setDescription("Add a note to a case")
          .addStringOption((o) => o.setName("case_id").setDescription("Case ID").setRequired(true))
          .addStringOption((o) => o.setName("note").setDescription("Note content").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("evidence").setDescription("Add evidence to a case")
          .addStringOption((o) => o.setName("case_id").setDescription("Case ID").setRequired(true))
          .addStringOption((o) => o.setName("evidence").setDescription("Evidence URL or description").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("close").setDescription("Close a case")
          .addStringOption((o) => o.setName("case_id").setDescription("Case ID").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("reopen").setDescription("Reopen a case")
          .addStringOption((o) => o.setName("case_id").setDescription("Case ID").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("transfer").setDescription("Transfer a case to another moderator")
          .addStringOption((o) => o.setName("case_id").setDescription("Case ID").setRequired(true))
          .addUserOption((o) => o.setName("moderator").setDescription("New moderator").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("search").setDescription("Search cases for a user")
          .addUserOption((o) => o.setName("user").setDescription("User to search").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("export").setDescription("Export all cases to JSON")
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guildId!;

      if (sub === "create") {
        const user = interaction.options.getUser("user", true);
        const type = interaction.options.getString("type", true);
        const reason = interaction.options.getString("reason", true);
        const id = generateId();
        casesStore.set(id, { id, guildId, userId: user.id, moderatorId: interaction.user.id, type, reason, timestamp: Date.now(), status: "open", notes: [], evidence: [] });
        await interaction.reply({ embeds: [modEmbed(`Case Created — #${id}`).addFields({ name: "User", value: user.tag, inline: true }, { name: "Type", value: type, inline: true }, { name: "Reason", value: reason })] });

      } else if (sub === "view") {
        const caseId = interaction.options.getString("case_id", true).toUpperCase();
        const c = casesStore.get(caseId);
        if (!c || c.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Case Not Found")], ephemeral: true });
        const embed = new EmbedBuilder().setColor(COLORS.info).setTitle(`📋 Case #${c.id}`)
          .addFields(
            { name: "User", value: `<@${c.userId}> (${c.userId})`, inline: true },
            { name: "Moderator", value: `<@${c.moderatorId}>`, inline: true },
            { name: "Type", value: c.type, inline: true },
            { name: "Status", value: c.status.toUpperCase(), inline: true },
            { name: "Created", value: formatTimestamp(c.timestamp), inline: true },
            { name: "Reason", value: c.reason },
          );
        if (c.notes.length) embed.addFields({ name: "Notes", value: c.notes.join("\n") });
        if (c.evidence.length) embed.addFields({ name: "Evidence", value: c.evidence.join("\n") });
        await interaction.reply({ embeds: [embed] });

      } else if (sub === "edit") {
        const caseId = interaction.options.getString("case_id", true).toUpperCase();
        const reason = interaction.options.getString("reason", true);
        const c = casesStore.get(caseId);
        if (!c || c.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Case Not Found")], ephemeral: true });
        c.reason = reason;
        casesStore.set(caseId, c);
        await interaction.reply({ embeds: [successEmbed("Case Updated", `Case #${caseId} reason updated.`)] });

      } else if (sub === "delete") {
        const caseId = interaction.options.getString("case_id", true).toUpperCase();
        const c = casesStore.get(caseId);
        if (!c || c.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Case Not Found")], ephemeral: true });
        casesStore.delete(caseId);
        await interaction.reply({ embeds: [successEmbed("Case Deleted", `Case #${caseId} has been deleted.`)] });

      } else if (sub === "note") {
        const caseId = interaction.options.getString("case_id", true).toUpperCase();
        const note = interaction.options.getString("note", true);
        const c = casesStore.get(caseId);
        if (!c || c.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Case Not Found")], ephemeral: true });
        c.notes.push(`[${new Date().toISOString()}] ${interaction.user.tag}: ${note}`);
        casesStore.set(caseId, c);
        await interaction.reply({ embeds: [successEmbed("Note Added", `Note added to case #${caseId}.`)] });

      } else if (sub === "evidence") {
        const caseId = interaction.options.getString("case_id", true).toUpperCase();
        const evidence = interaction.options.getString("evidence", true);
        const c = casesStore.get(caseId);
        if (!c || c.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Case Not Found")], ephemeral: true });
        c.evidence.push(evidence);
        casesStore.set(caseId, c);
        await interaction.reply({ embeds: [successEmbed("Evidence Added", `Evidence added to case #${caseId}.`)] });

      } else if (sub === "close") {
        const caseId = interaction.options.getString("case_id", true).toUpperCase();
        const c = casesStore.get(caseId);
        if (!c || c.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Case Not Found")], ephemeral: true });
        c.status = "closed";
        casesStore.set(caseId, c);
        await interaction.reply({ embeds: [successEmbed("Case Closed", `Case #${caseId} has been closed.`)] });

      } else if (sub === "reopen") {
        const caseId = interaction.options.getString("case_id", true).toUpperCase();
        const c = casesStore.get(caseId);
        if (!c || c.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Case Not Found")], ephemeral: true });
        c.status = "open";
        casesStore.set(caseId, c);
        await interaction.reply({ embeds: [successEmbed("Case Reopened", `Case #${caseId} has been reopened.`)] });

      } else if (sub === "transfer") {
        const caseId = interaction.options.getString("case_id", true).toUpperCase();
        const newMod = interaction.options.getUser("moderator", true);
        const c = casesStore.get(caseId);
        if (!c || c.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Case Not Found")], ephemeral: true });
        c.moderatorId = newMod.id;
        casesStore.set(caseId, c);
        await interaction.reply({ embeds: [successEmbed("Case Transferred", `Case #${caseId} transferred to ${newMod.tag}.`)] });

      } else if (sub === "search") {
        const user = interaction.options.getUser("user", true);
        const userCases = Object.values(casesStore.getAll()).filter((c) => c.guildId === guildId && c.userId === user.id);
        if (!userCases.length) return interaction.reply({ embeds: [infoEmbed("No Cases", `No cases found for ${user.tag}.`)] });
        const list = userCases.slice(0, 15).map((c) => `\`${c.id}\` — **${c.type}** — ${c.reason.slice(0, 50)}`).join("\n");
        await interaction.reply({ embeds: [infoEmbed(`Cases for ${user.tag}`, list).setFooter({ text: `${userCases.length} total case(s)` })] });

      } else if (sub === "export") {
        const guildCases = Object.values(casesStore.getAll()).filter((c) => c.guildId === guildId);
        const json = JSON.stringify(guildCases, null, 2);
        const buffer = Buffer.from(json, "utf-8");
        await interaction.reply({ content: `Exported ${guildCases.length} case(s).`, files: [{ attachment: buffer, name: `cases-${guildId}.json` }] });
      }
    },
  },
];
