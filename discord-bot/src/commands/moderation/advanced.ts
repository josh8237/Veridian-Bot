import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types.js";
import {
  strikesStore,
  blacklistStore,
  quarantineStore,
  jailStore,
  nickLockStore,
  generateId,
} from "../../lib/storage.js";
import { successEmbed, errorEmbed, modEmbed } from "../../lib/utils.js";

export const advancedCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("strike")
      .setDescription("Add a strike to a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const key = `${interaction.guildId!}:${user.id}`;
      const strikes = strikesStore.get(key) ?? [];
      const strike = { id: generateId(), reason, timestamp: Date.now() };
      strikes.push(strike);
      strikesStore.set(key, strikes);
      await interaction.reply({
        embeds: [modEmbed("Strike Added").addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Total Strikes", value: strikes.length.toString(), inline: true },
          { name: "Reason", value: reason },
          { name: "Strike ID", value: strike.id, inline: true }
        )],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("removestrike")
      .setDescription("Remove a strike from a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("strike_id").setDescription("Strike ID").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const strikeId = interaction.options.getString("strike_id", true);
      const key = `${interaction.guildId!}:${user.id}`;
      const strikes = strikesStore.get(key) ?? [];
      const idx = strikes.findIndex((s) => s.id === strikeId);
      if (idx === -1) return interaction.reply({ embeds: [errorEmbed("Strike Not Found")], ephemeral: true });
      strikes.splice(idx, 1);
      strikesStore.set(key, strikes);
      await interaction.reply({ embeds: [successEmbed("Strike Removed", `Removed strike \`${strikeId}\` from ${user.tag}.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("blacklist")
      .setDescription("Blacklist a user from the server")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const key = `${interaction.guildId!}:${user.id}`;
      blacklistStore.set(key, { reason, timestamp: Date.now() });
      await interaction.reply({
        embeds: [modEmbed("User Blacklisted").addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Reason", value: reason }
        )],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unblacklist")
      .setDescription("Remove a user from the blacklist")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      blacklistStore.delete(`${interaction.guildId!}:${user.id}`);
      await interaction.reply({ embeds: [successEmbed("User Unblacklisted", `${user.tag} has been removed from the blacklist.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("quarantine")
      .setDescription("Quarantine a member (remove all roles)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      const roleIds = member.roles.cache.filter((r) => r.id !== interaction.guildId).map((r) => r.id);
      quarantineStore.set(`${interaction.guildId!}:${user.id}`, { roles: roleIds, timestamp: Date.now() });
      await member.roles.set([], reason);
      await interaction.reply({
        embeds: [modEmbed("Member Quarantined").addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Roles Removed", value: roleIds.length.toString(), inline: true },
          { name: "Reason", value: reason }
        )],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unquarantine")
      .setDescription("Remove quarantine and restore roles")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const key = `${interaction.guildId!}:${user.id}`;
      const data = quarantineStore.get(key);
      if (!data) return interaction.reply({ embeds: [errorEmbed("Not Quarantined", "This user is not quarantined.")], ephemeral: true });
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      for (const roleId of data.roles) {
        await member.roles.add(roleId).catch(() => null);
      }
      quarantineStore.delete(key);
      await interaction.reply({ embeds: [successEmbed("Quarantine Removed", `Restored ${data.roles.length} role(s) to ${user.tag}.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("jail")
      .setDescription("Jail a member (remove roles and restrict to jail channel)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      const roleIds = member.roles.cache.filter((r) => r.id !== interaction.guildId).map((r) => r.id);
      jailStore.set(`${interaction.guildId!}:${user.id}`, { roles: roleIds, timestamp: Date.now() });
      await member.roles.set([], reason);
      await interaction.reply({
        embeds: [modEmbed("Member Jailed").addFields(
          { name: "User", value: `${user.tag}`, inline: true },
          { name: "Reason", value: reason }
        )],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unjail")
      .setDescription("Release a member from jail")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const key = `${interaction.guildId!}:${user.id}`;
      const data = jailStore.get(key);
      if (!data) return interaction.reply({ embeds: [errorEmbed("Not Jailed", "This user is not jailed.")], ephemeral: true });
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      for (const roleId of data.roles) {
        await member.roles.add(roleId).catch(() => null);
      }
      jailStore.delete(key);
      await interaction.reply({ embeds: [successEmbed("Member Released", `${user.tag} has been released from jail with ${data.roles.length} role(s) restored.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("nickname")
      .setDescription("Manage member nicknames")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
      .addSubcommand((sub) =>
        sub
          .setName("lock")
          .setDescription("Lock a member's nickname")
          .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
          .addStringOption((o) => o.setName("nickname").setDescription("Nickname to lock").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub
          .setName("reset")
          .setDescription("Reset a member's nickname")
          .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      if (sub === "lock") {
        const nickname = interaction.options.getString("nickname", true);
        nickLockStore.set(`${interaction.guildId!}:${user.id}`, nickname);
        await member.setNickname(nickname);
        await interaction.reply({ embeds: [successEmbed("Nickname Locked", `${user.tag}'s nickname has been locked to **${nickname}**.`)] });
      } else {
        nickLockStore.delete(`${interaction.guildId!}:${user.id}`);
        await member.setNickname(null);
        await interaction.reply({ embeds: [successEmbed("Nickname Reset", `${user.tag}'s nickname has been reset.`)] });
      }
    },
  },
];
