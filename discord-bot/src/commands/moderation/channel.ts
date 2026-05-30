import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types.js";
import { lockedChannelsStore } from "../../lib/storage.js";
import { successEmbed, errorEmbed, modEmbed } from "../../lib/utils.js";

export const channelCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("lock")
      .setDescription("Lock a channel (prevent members from sending messages)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((o) => o.setName("channel").setDescription("Channel to lock (defaults to current)"))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as import("discord.js").GuildChannel;
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      if (!channel || !("permissionOverwrites" in channel)) return interaction.reply({ embeds: [errorEmbed("Invalid Channel")], ephemeral: true });
      await channel.permissionOverwrites.edit(interaction.guildId!, { SendMessages: false }, { reason });
      lockedChannelsStore.set(channel.id, true);
      await interaction.reply({ embeds: [modEmbed("Channel Locked", `${channel.toString()} has been locked.\n**Reason:** ${reason}`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unlock")
      .setDescription("Unlock a channel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((o) => o.setName("channel").setDescription("Channel to unlock (defaults to current)"))
      .addStringOption((o) => o.setName("reason").setDescription("Reason")),
    async execute(interaction: ChatInputCommandInteraction) {
      const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as import("discord.js").GuildChannel;
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      if (!channel || !("permissionOverwrites" in channel)) return interaction.reply({ embeds: [errorEmbed("Invalid Channel")], ephemeral: true });
      await channel.permissionOverwrites.edit(interaction.guildId!, { SendMessages: null }, { reason });
      lockedChannelsStore.delete(channel.id);
      await interaction.reply({ embeds: [successEmbed("Channel Unlocked", `${channel.toString()} has been unlocked.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("slowmode")
      .setDescription("Set slowmode for a channel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addIntegerOption((o) => o.setName("seconds").setDescription("Slowmode in seconds (0 to disable)").setMinValue(0).setMaxValue(21600).setRequired(true))
      .addChannelOption((o) => o.setName("channel").setDescription("Channel (defaults to current)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const seconds = interaction.options.getInteger("seconds", true);
      const rawChannel = interaction.options.getChannel("channel") ?? interaction.channel;
      const channel = rawChannel as import("discord.js").TextChannel;
      if (!channel || !("setRateLimitPerUser" in channel)) return interaction.reply({ embeds: [errorEmbed("Invalid Channel")], ephemeral: true });
      await channel.setRateLimitPerUser(seconds);
      const msg = seconds === 0 ? "Slowmode disabled." : `Slowmode set to **${seconds}s**.`;
      await interaction.reply({ embeds: [successEmbed("Slowmode Updated", msg)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("nuke")
      .setDescription("Clone and delete a channel (removes all messages)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((o) => o.setName("channel").setDescription("Channel to nuke (defaults to current)")),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply({ ephemeral: true });
      const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as import("discord.js").GuildChannel;
      if (!channel || !("clone" in channel)) return interaction.editReply({ embeds: [errorEmbed("Invalid Channel")] });
      const cloned = await (channel as import("discord.js").TextChannel).clone({ reason: `Nuked by ${interaction.user.tag}` });
      await cloned.setPosition(channel.position);
      await channel.delete(`Nuked by ${interaction.user.tag}`);
      await cloned.send({ embeds: [modEmbed("💥 Channel Nuked", `This channel was nuked by ${interaction.user.tag}.`)] });
      await interaction.editReply({ content: "Channel nuked successfully." });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("clonechannel")
      .setDescription("Clone a channel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((o) => o.setName("channel").setDescription("Channel to clone (defaults to current)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as import("discord.js").GuildChannel;
      if (!channel || !("clone" in channel)) return interaction.reply({ embeds: [errorEmbed("Invalid Channel")], ephemeral: true });
      const cloned = await (channel as import("discord.js").TextChannel).clone({ reason: `Cloned by ${interaction.user.tag}` });
      await interaction.reply({ embeds: [successEmbed("Channel Cloned", `Cloned ${channel.toString()} → ${cloned.toString()}`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("archive")
      .setDescription("Archive a channel (make read-only)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((o) => o.setName("channel").setDescription("Channel to archive (defaults to current)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as import("discord.js").GuildChannel;
      if (!channel || !("permissionOverwrites" in channel)) return interaction.reply({ embeds: [errorEmbed("Invalid Channel")], ephemeral: true });
      await channel.permissionOverwrites.edit(interaction.guildId!, { SendMessages: false, AddReactions: false });
      await (channel as import("discord.js").TextChannel).setName(`archived-${channel.name}`).catch(() => null);
      await interaction.reply({ embeds: [successEmbed("Channel Archived", `${channel.toString()} has been archived (read-only).`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("unarchive")
      .setDescription("Unarchive a channel (restore send permissions)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
      .addChannelOption((o) => o.setName("channel").setDescription("Channel to unarchive (defaults to current)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as import("discord.js").GuildChannel;
      if (!channel || !("permissionOverwrites" in channel)) return interaction.reply({ embeds: [errorEmbed("Invalid Channel")], ephemeral: true });
      await channel.permissionOverwrites.edit(interaction.guildId!, { SendMessages: null, AddReactions: null });
      const name = channel.name.replace(/^archived-/, "");
      await (channel as import("discord.js").TextChannel).setName(name).catch(() => null);
      await interaction.reply({ embeds: [successEmbed("Channel Unarchived", `${channel.toString()} has been unarchived.`)] });
    },
  },
];
