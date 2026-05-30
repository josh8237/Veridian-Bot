import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types.js";
import {
  warnsStore,
  casesStore,
  blacklistStore,
  tempbanStore,
  generateId,
} from "../../lib/storage.js";
import { successEmbed, errorEmbed, modEmbed, parseDuration, formatDuration } from "../../lib/utils.js";

async function logCase(
  guildId: string,
  userId: string,
  modId: string,
  type: string,
  reason: string
) {
  const id = generateId();
  casesStore.set(id, {
    id,
    guildId,
    userId,
    moderatorId: modId,
    type,
    reason,
    timestamp: Date.now(),
    status: "open",
    notes: [],
    evidence: [],
  });
  return id;
}

export const punishmentCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warn a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("User to warn").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const guildId = interaction.guildId!;
      const key = `${guildId}:${user.id}`;
      const warns = warnsStore.get(key) ?? [];
      const warn = {
        id: generateId(),
        userId: user.id,
        guildId,
        moderatorId: interaction.user.id,
        reason,
        timestamp: Date.now(),
      };
      warns.push(warn);
      warnsStore.set(key, warns);
      await logCase(guildId, user.id, interaction.user.id, "WARN", reason);
      const embed = modEmbed("User Warned")
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Moderator", value: interaction.user.tag, inline: true },
          { name: "Reason", value: reason },
          { name: "Total Warns", value: warns.length.toString(), inline: true },
          { name: "Warn ID", value: warn.id, inline: true }
        );
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unwarn")
      .setDescription("Remove a warning from a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("warn_id").setDescription("Warning ID to remove").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const warnId = interaction.options.getString("warn_id", true);
      const key = `${interaction.guildId!}:${user.id}`;
      const warns = warnsStore.get(key) ?? [];
      const idx = warns.findIndex((w) => w.id === warnId);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed("Warning not found", `No warning with ID \`${warnId}\` found for this user.`)], ephemeral: true });
      warns.splice(idx, 1);
      warnsStore.set(key, warns);
      await interaction.reply({ embeds: [successEmbed("Warning Removed", `Removed warning \`${warnId}\` from ${user.tag}.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("timeout")
      .setDescription("Timeout a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("User to timeout").setRequired(true))
      .addStringOption((o) => o.setName("duration").setDescription("Duration (e.g. 10m, 1h, 1d)").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const durationStr = interaction.options.getString("duration", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const ms = parseDuration(durationStr);
      if (!ms) return interaction.reply({ embeds: [errorEmbed("Invalid Duration", "Use format: 10s, 5m, 1h, 2d, 1w")], ephemeral: true });
      if (ms > 2419200000) return interaction.reply({ embeds: [errorEmbed("Too Long", "Max timeout is 28 days.")], ephemeral: true });
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      await member.timeout(ms, reason);
      await logCase(interaction.guildId!, user.id, interaction.user.id, "TIMEOUT", reason);
      await interaction.reply({ embeds: [modEmbed("Member Timed Out").addFields({ name: "User", value: user.tag, inline: true }, { name: "Duration", value: formatDuration(ms), inline: true }, { name: "Reason", value: reason })] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("untimeout")
      .setDescription("Remove timeout from a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      await member.timeout(null, reason);
      await interaction.reply({ embeds: [successEmbed("Timeout Removed", `Removed timeout from ${user.tag}.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Kick a member from the server")
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption((o) => o.setName("user").setDescription("User to kick").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      if (!member.kickable) return interaction.reply({ embeds: [errorEmbed("Cannot Kick", "I do not have permission to kick this member.")], ephemeral: true });
      await member.kick(reason);
      await logCase(interaction.guildId!, user.id, interaction.user.id, "KICK", reason);
      await interaction.reply({ embeds: [modEmbed("Member Kicked").addFields({ name: "User", value: `${user.tag} (${user.id})`, inline: true }, { name: "Reason", value: reason })] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Ban a member from the server")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((o) => o.setName("user").setDescription("User to ban").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason"))
      .addIntegerOption((o) => o.setName("delete_days").setDescription("Days of messages to delete (0-7)").setMinValue(0).setMaxValue(7)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const deleteMessageSeconds = (interaction.options.getInteger("delete_days") ?? 0) * 86400;
      await interaction.guild!.bans.create(user.id, { reason, deleteMessageSeconds });
      await logCase(interaction.guildId!, user.id, interaction.user.id, "BAN", reason);
      await interaction.reply({ embeds: [modEmbed("Member Banned").addFields({ name: "User", value: `${user.tag} (${user.id})`, inline: true }, { name: "Reason", value: reason })] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("tempban")
      .setDescription("Temporarily ban a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((o) => o.setName("user").setDescription("User to tempban").setRequired(true))
      .addStringOption((o) => o.setName("duration").setDescription("Duration (e.g. 1d, 1w)").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const durationStr = interaction.options.getString("duration", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const ms = parseDuration(durationStr);
      if (!ms) return interaction.reply({ embeds: [errorEmbed("Invalid Duration")], ephemeral: true });
      const expiresAt = Date.now() + ms;
      await interaction.guild!.bans.create(user.id, { reason: `[TEMPBAN] ${reason}` });
      tempbanStore.set(`${interaction.guildId!}:${user.id}`, { userId: user.id, guildId: interaction.guildId!, expiresAt });
      await logCase(interaction.guildId!, user.id, interaction.user.id, "TEMPBAN", reason);
      await interaction.reply({ embeds: [modEmbed("Member Temp-Banned").addFields({ name: "User", value: `${user.tag} (${user.id})`, inline: true }, { name: "Duration", value: formatDuration(ms), inline: true }, { name: "Reason", value: reason })] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("softban")
      .setDescription("Softban a member (ban + unban to delete messages)")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      await interaction.guild!.bans.create(user.id, { reason: `[SOFTBAN] ${reason}`, deleteMessageSeconds: 604800 });
      await interaction.guild!.bans.remove(user.id, "Softban - unban");
      await logCase(interaction.guildId!, user.id, interaction.user.id, "SOFTBAN", reason);
      await interaction.reply({ embeds: [modEmbed("Member Softbanned").addFields({ name: "User", value: `${user.tag} (${user.id})`, inline: true }, { name: "Reason", value: reason })] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unban")
      .setDescription("Unban a user")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption((o) => o.setName("user_id").setDescription("User ID to unban").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const userId = interaction.options.getString("user_id", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      try {
        await interaction.guild!.bans.remove(userId, reason);
        tempbanStore.delete(`${interaction.guildId!}:${userId}`);
        await interaction.reply({ embeds: [successEmbed("User Unbanned", `User \`${userId}\` has been unbanned.`)] });
      } catch {
        await interaction.reply({ embeds: [errorEmbed("Unban Failed", "User is not banned or ID is invalid.")], ephemeral: true });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("voicekick")
      .setDescription("Disconnect a member from voice")
      .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member?.voice.channel) return interaction.reply({ embeds: [errorEmbed("Not in Voice", "That user is not in a voice channel.")], ephemeral: true });
      await member.voice.disconnect("Voice kicked by moderator");
      await interaction.reply({ embeds: [successEmbed("Voice Kicked", `${user.tag} has been disconnected from voice.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("voicemute")
      .setDescription("Server-mute a member in voice")
      .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      await member.voice.setMute(true, reason);
      await interaction.reply({ embeds: [successEmbed("Voice Muted", `${user.tag} has been server-muted.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("voiceunmute")
      .setDescription("Remove server-mute from a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      await member.voice.setMute(false);
      await interaction.reply({ embeds: [successEmbed("Voice Unmuted", `${user.tag} has been server-unmuted.`)] });
    },
  },
];
