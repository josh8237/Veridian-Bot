import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types.js";
import { logsStore } from "../../lib/storage.js";
import { successEmbed, errorEmbed, infoEmbed, COLORS } from "../../lib/utils.js";

const LOG_TYPES = ["moderation", "joins", "leaves", "messages", "voice", "roles", "channels", "bans"];

export const loggingCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("logs")
      .setDescription("Configure logging channels")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((sub) =>
        sub.setName("setup").setDescription("View current log channel configuration")
      )
      .addSubcommand((sub) =>
        sub.setName("channel").setDescription("Set a log channel for a log type")
          .addStringOption((o) =>
            o.setName("type").setDescription("Log type").setRequired(true)
              .addChoices(...LOG_TYPES.map((t) => ({ name: t, value: t })))
          )
          .addChannelOption((o) => o.setName("channel").setDescription("Log channel").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("disable").setDescription("Disable a log type")
          .addStringOption((o) =>
            o.setName("type").setDescription("Log type to disable").setRequired(true)
              .addChoices(...LOG_TYPES.map((t) => ({ name: t, value: t })))
          )
      )
      .addSubcommand((sub) =>
        sub.setName("export").setDescription("Export current log config")
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guildId!;
      const settings = logsStore.get(guildId) ?? { guildId, channels: {} };

      if (sub === "setup") {
        const fields = LOG_TYPES.map((t) => ({
          name: t.charAt(0).toUpperCase() + t.slice(1),
          value: settings.channels[t] ? `<#${settings.channels[t]}>` : "Not set",
          inline: true,
        }));
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle("📋 Log Channels").addFields(fields)] });

      } else if (sub === "channel") {
        const type = interaction.options.getString("type", true);
        const channel = interaction.options.getChannel("channel", true);
        settings.channels[type] = channel.id;
        logsStore.set(guildId, settings);
        await interaction.reply({ embeds: [successEmbed("Log Channel Set", `**${type}** logs → ${channel.toString()}`)] });

      } else if (sub === "disable") {
        const type = interaction.options.getString("type", true);
        delete settings.channels[type];
        logsStore.set(guildId, settings);
        await interaction.reply({ embeds: [successEmbed("Log Disabled", `**${type}** logging has been disabled.`)] });

      } else if (sub === "export") {
        const json = JSON.stringify(settings, null, 2);
        const buffer = Buffer.from(json, "utf-8");
        await interaction.reply({ content: "Current log configuration:", files: [{ attachment: buffer, name: `logs-${guildId}.json` }] });
      }
    },
  },
];
