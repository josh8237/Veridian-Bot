import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types.js";
import { automodStore } from "../../lib/storage.js";
import { successEmbed, infoEmbed, COLORS } from "../../lib/utils.js";
import { EmbedBuilder } from "discord.js";

function getOrCreateAutomod(guildId: string) {
  return automodStore.get(guildId) ?? {
    guildId,
    spam: { enabled: false, threshold: 5 },
    invites: { enabled: false },
    links: { enabled: false, whitelist: [] },
    caps: { enabled: false, threshold: 70 },
    mentions: { enabled: false, threshold: 5 },
    profanity: { enabled: false, words: [] },
    phishing: { enabled: false },
    duplicates: { enabled: false },
  };
}

export const automodCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("automod")
      .setDescription("Configure automod settings")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((sub) =>
        sub.setName("spam").setDescription("Configure spam detection")
          .addBooleanOption((o) => o.setName("enabled").setDescription("Enable?").setRequired(true))
          .addIntegerOption((o) => o.setName("threshold").setDescription("Messages per 5s to trigger").setMinValue(2).setMaxValue(20))
      )
      .addSubcommand((sub) =>
        sub.setName("invites").setDescription("Block Discord invite links")
          .addBooleanOption((o) => o.setName("enabled").setDescription("Enable?").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("links").setDescription("Block external links")
          .addBooleanOption((o) => o.setName("enabled").setDescription("Enable?").setRequired(true))
          .addStringOption((o) => o.setName("whitelist").setDescription("Whitelisted domains (comma-separated)"))
      )
      .addSubcommand((sub) =>
        sub.setName("caps").setDescription("Limit excessive caps")
          .addBooleanOption((o) => o.setName("enabled").setDescription("Enable?").setRequired(true))
          .addIntegerOption((o) => o.setName("threshold").setDescription("% caps to trigger (default: 70)").setMinValue(50).setMaxValue(100))
      )
      .addSubcommand((sub) =>
        sub.setName("mentions").setDescription("Limit mass mentions")
          .addBooleanOption((o) => o.setName("enabled").setDescription("Enable?").setRequired(true))
          .addIntegerOption((o) => o.setName("threshold").setDescription("Max mentions per message").setMinValue(1).setMaxValue(50))
      )
      .addSubcommand((sub) =>
        sub.setName("profanity").setDescription("Filter profanity")
          .addBooleanOption((o) => o.setName("enabled").setDescription("Enable?").setRequired(true))
          .addStringOption((o) => o.setName("words").setDescription("Custom words to filter (comma-separated)"))
      )
      .addSubcommand((sub) =>
        sub.setName("phishing").setDescription("Block known phishing links")
          .addBooleanOption((o) => o.setName("enabled").setDescription("Enable?").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("duplicates").setDescription("Block duplicate/repeated messages")
          .addBooleanOption((o) => o.setName("enabled").setDescription("Enable?").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("status").setDescription("View current automod settings")
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guildId!;
      const settings = getOrCreateAutomod(guildId);

      if (sub === "status") {
        const embed = new EmbedBuilder().setColor(COLORS.info).setTitle("🤖 Automod Settings")
          .addFields(
            { name: "Spam", value: settings.spam.enabled ? `✅ (threshold: ${settings.spam.threshold}/5s)` : "❌", inline: true },
            { name: "Invites", value: settings.invites.enabled ? "✅" : "❌", inline: true },
            { name: "Links", value: settings.links.enabled ? `✅ (whitelist: ${settings.links.whitelist.length})` : "❌", inline: true },
            { name: "Caps", value: settings.caps.enabled ? `✅ (>${settings.caps.threshold}%)` : "❌", inline: true },
            { name: "Mentions", value: settings.mentions.enabled ? `✅ (>${settings.mentions.threshold})` : "❌", inline: true },
            { name: "Profanity", value: settings.profanity.enabled ? `✅ (${settings.profanity.words.length} words)` : "❌", inline: true },
            { name: "Phishing", value: settings.phishing.enabled ? "✅" : "❌", inline: true },
            { name: "Duplicates", value: settings.duplicates.enabled ? "✅" : "❌", inline: true },
          );
        return interaction.reply({ embeds: [embed] });
      }

      const enabled = interaction.options.getBoolean("enabled", true);
      if (sub === "spam") {
        settings.spam.enabled = enabled;
        const t = interaction.options.getInteger("threshold");
        if (t) settings.spam.threshold = t;
      } else if (sub === "invites") {
        settings.invites.enabled = enabled;
      } else if (sub === "links") {
        settings.links.enabled = enabled;
        const wl = interaction.options.getString("whitelist");
        if (wl) settings.links.whitelist = wl.split(",").map((s) => s.trim());
      } else if (sub === "caps") {
        settings.caps.enabled = enabled;
        const t = interaction.options.getInteger("threshold");
        if (t) settings.caps.threshold = t;
      } else if (sub === "mentions") {
        settings.mentions.enabled = enabled;
        const t = interaction.options.getInteger("threshold");
        if (t) settings.mentions.threshold = t;
      } else if (sub === "profanity") {
        settings.profanity.enabled = enabled;
        const words = interaction.options.getString("words");
        if (words) settings.profanity.words = words.split(",").map((s) => s.trim().toLowerCase());
      } else if (sub === "phishing") {
        settings.phishing.enabled = enabled;
      } else if (sub === "duplicates") {
        settings.duplicates.enabled = enabled;
      }

      automodStore.set(guildId, settings);
      await interaction.reply({ embeds: [successEmbed("Automod Updated", `**${sub}** has been **${enabled ? "enabled" : "disabled"}**.`)] });
    },
  },
];
