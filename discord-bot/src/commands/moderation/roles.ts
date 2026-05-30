import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../../types.js";
import { successEmbed, errorEmbed, infoEmbed } from "../../lib/utils.js";

export const rolesCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("role")
      .setDescription("Manage member roles")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addSubcommand((sub) =>
        sub.setName("add").setDescription("Add a role to a member")
          .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
          .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("remove").setDescription("Remove a role from a member")
          .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
          .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("all").setDescription("Add a role to all members")
          .addRoleOption((o) => o.setName("role").setDescription("Role to add").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("humans").setDescription("Add a role to all human members")
          .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub.setName("bots").setDescription("Add a role to all bots")
          .addRoleOption((o) => o.setName("role").setDescription("Role").setRequired(true))
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const role = interaction.options.getRole("role", true) as import("discord.js").Role;

      if (!interaction.guild!.members.me?.roles.highest.comparePositionTo(role)) {
        return interaction.reply({ embeds: [errorEmbed("Permission Error", "That role is too high for me to manage.")], ephemeral: true });
      }

      if (sub === "add") {
        const user = interaction.options.getUser("user", true);
        const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
        await member.roles.add(role);
        await interaction.reply({ embeds: [successEmbed("Role Added", `Added ${role.toString()} to ${user.tag}.`)] });

      } else if (sub === "remove") {
        const user = interaction.options.getUser("user", true);
        const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
        await member.roles.remove(role);
        await interaction.reply({ embeds: [successEmbed("Role Removed", `Removed ${role.toString()} from ${user.tag}.`)] });

      } else if (sub === "all" || sub === "humans" || sub === "bots") {
        await interaction.deferReply();
        const members = await interaction.guild!.members.fetch();
        const filtered = members.filter((m) => {
          if (sub === "humans") return !m.user.bot;
          if (sub === "bots") return m.user.bot;
          return true;
        });
        let count = 0;
        for (const [, member] of filtered) {
          if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role).catch(() => null);
            count++;
          }
        }
        await interaction.editReply({ embeds: [successEmbed("Role Assigned", `Added ${role.toString()} to **${count}** ${sub === "bots" ? "bot(s)" : sub === "humans" ? "human(s)" : "member(s)"}.`)] });
      }
    },
  },
];
