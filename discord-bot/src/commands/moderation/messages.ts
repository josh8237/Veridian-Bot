import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Message,
  type TextChannel,
} from "discord.js";
import type { Command } from "../../types.js";
import { successEmbed, errorEmbed } from "../../lib/utils.js";

async function bulkDelete(
  interaction: ChatInputCommandInteraction,
  filter: (m: Message) => boolean,
  amount: number
) {
  const channel = interaction.channel as TextChannel;
  if (!channel) return;
  const messages = await channel.messages.fetch({ limit: Math.min(amount, 100) });
  const toDelete = messages.filter((m) => filter(m) && Date.now() - m.createdTimestamp < 1209600000);
  const deleted = await channel.bulkDelete(toDelete, true).catch(() => null);
  const count = deleted?.size ?? 0;
  await interaction.reply({ embeds: [successEmbed("Messages Purged", `Deleted **${count}** message(s).`)], ephemeral: true });
}

export const messagesCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("purge")
      .setDescription("Purge messages from a channel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addSubcommand((sub) =>
        sub.setName("all").setDescription("Purge any messages")
          .addIntegerOption((o) => o.setName("amount").setDescription("Number of messages (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("user").setDescription("Purge messages from a specific user")
          .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
          .addIntegerOption((o) => o.setName("amount").setDescription("Messages to scan (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("bots").setDescription("Purge bot messages")
          .addIntegerOption((o) => o.setName("amount").setDescription("Messages to scan (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("links").setDescription("Purge messages containing links")
          .addIntegerOption((o) => o.setName("amount").setDescription("Messages to scan (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("attachments").setDescription("Purge messages with attachments")
          .addIntegerOption((o) => o.setName("amount").setDescription("Messages to scan (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("embeds").setDescription("Purge messages with embeds")
          .addIntegerOption((o) => o.setName("amount").setDescription("Messages to scan (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("reactions").setDescription("Remove all reactions from recent messages")
          .addIntegerOption((o) => o.setName("amount").setDescription("Messages to scan (1-100)").setMinValue(1).setMaxValue(100).setRequired(true))
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const amount = interaction.options.getInteger("amount", true);

      if (sub === "all") {
        await bulkDelete(interaction, () => true, amount);
      } else if (sub === "user") {
        const user = interaction.options.getUser("user", true);
        await bulkDelete(interaction, (m) => m.author.id === user.id, amount);
      } else if (sub === "bots") {
        await bulkDelete(interaction, (m) => m.author.bot, amount);
      } else if (sub === "links") {
        const urlRegex = /https?:\/\/\S+/i;
        await bulkDelete(interaction, (m) => urlRegex.test(m.content), amount);
      } else if (sub === "attachments") {
        await bulkDelete(interaction, (m) => m.attachments.size > 0, amount);
      } else if (sub === "embeds") {
        await bulkDelete(interaction, (m) => m.embeds.length > 0, amount);
      } else if (sub === "reactions") {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel as TextChannel;
        const messages = await channel.messages.fetch({ limit: Math.min(amount, 100) });
        let cleared = 0;
        for (const msg of messages.values()) {
          if (msg.reactions.cache.size > 0) {
            await msg.reactions.removeAll().catch(() => null);
            cleared++;
          }
        }
        await interaction.editReply({ embeds: [successEmbed("Reactions Cleared", `Cleared reactions from **${cleared}** message(s).`)] });
      }
    },
  },
];
