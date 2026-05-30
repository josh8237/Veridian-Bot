import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../../types.js";
import { notesStore, generateId } from "../../lib/storage.js";
import { successEmbed, errorEmbed, infoEmbed, modEmbed, formatTimestamp } from "../../lib/utils.js";

export const notesCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("note")
      .setDescription("Manage staff notes on users")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addSubcommand((sub) =>
        sub.setName("add").setDescription("Add a note to a user")
          .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
          .addStringOption((o) => o.setName("note").setDescription("Note content").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("remove").setDescription("Remove a note by ID")
          .addStringOption((o) => o.setName("note_id").setDescription("Note ID").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("list").setDescription("List notes for a user")
          .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("search").setDescription("Search notes by keyword")
          .addStringOption((o) => o.setName("query").setDescription("Search query").setRequired(true))
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const guildId = interaction.guildId!;

      if (sub === "add") {
        const user = interaction.options.getUser("user", true);
        const content = interaction.options.getString("note", true);
        const id = generateId();
        notesStore.set(id, { id, guildId, userId: user.id, authorId: interaction.user.id, content, timestamp: Date.now() });
        await interaction.reply({ embeds: [successEmbed("Note Added", `Note \`${id}\` added for ${user.tag}.\n\n> ${content}`)] });

      } else if (sub === "remove") {
        const noteId = interaction.options.getString("note_id", true).toUpperCase();
        const note = notesStore.get(noteId);
        if (!note || note.guildId !== guildId) return interaction.reply({ embeds: [errorEmbed("Note Not Found")], ephemeral: true });
        notesStore.delete(noteId);
        await interaction.reply({ embeds: [successEmbed("Note Removed", `Note \`${noteId}\` has been deleted.`)] });

      } else if (sub === "list") {
        const user = interaction.options.getUser("user", true);
        const userNotes = Object.values(notesStore.getAll()).filter((n) => n.guildId === guildId && n.userId === user.id);
        if (!userNotes.length) return interaction.reply({ embeds: [infoEmbed("No Notes", `No notes found for ${user.tag}.`)] });
        const list = userNotes.map((n) => `\`${n.id}\` by <@${n.authorId}> — ${formatTimestamp(n.timestamp)}\n> ${n.content}`).join("\n\n");
        await interaction.reply({ embeds: [modEmbed(`Notes for ${user.tag}`).setDescription(list.slice(0, 4000))] });

      } else if (sub === "search") {
        const query = interaction.options.getString("query", true).toLowerCase();
        const matches = Object.values(notesStore.getAll()).filter((n) => n.guildId === guildId && n.content.toLowerCase().includes(query));
        if (!matches.length) return interaction.reply({ embeds: [infoEmbed("No Results", `No notes matching "${query}".`)] });
        const list = matches.slice(0, 10).map((n) => `\`${n.id}\` <@${n.userId}> — ${n.content.slice(0, 80)}`).join("\n");
        await interaction.reply({ embeds: [infoEmbed(`Search: "${query}"`, list)] });
      }
    },
  },
];
