import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "../../types.js";
import { warnsStore, casesStore, strikesStore } from "../../lib/storage.js";
import { infoEmbed, errorEmbed, formatTimestamp, COLORS } from "../../lib/utils.js";

export const investigationCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("Get detailed information about a user")
      .addUserOption((o) => o.setName("user").setDescription("User (defaults to yourself)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      const warns = (warnsStore.get(`${interaction.guildId!}:${user.id}`) ?? []).length;
      const cases = Object.values(casesStore.getAll()).filter((c) => c.guildId === interaction.guildId && c.userId === user.id).length;
      const strikes = (strikesStore.get(`${interaction.guildId!}:${user.id}`) ?? []).length;
      const embed = new EmbedBuilder()
        .setColor(member?.displayColor ?? COLORS.info)
        .setTitle(`👤 ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "User ID", value: user.id, inline: true },
          { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
          { name: "Account Created", value: formatTimestamp(user.createdTimestamp), inline: true },
        );
      if (member) {
        embed.addFields(
          { name: "Joined Server", value: member.joinedAt ? formatTimestamp(member.joinedAt.getTime()) : "Unknown", inline: true },
          { name: "Nickname", value: member.nickname ?? "None", inline: true },
          { name: "Highest Role", value: member.roles.highest.toString(), inline: true },
          { name: "Roles", value: member.roles.cache.filter((r) => r.id !== interaction.guildId).map((r) => r.toString()).join(", ").slice(0, 500) || "None" },
          { name: "Moderation", value: `Warns: ${warns} | Cases: ${cases} | Strikes: ${strikes}`, inline: false },
        );
        if (member.communicationDisabledUntilTimestamp) {
          embed.addFields({ name: "Timed Out Until", value: formatTimestamp(member.communicationDisabledUntilTimestamp), inline: true });
        }
      }
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("avatar")
      .setDescription("Show a user's avatar")
      .addUserOption((o) => o.setName("user").setDescription("User (defaults to yourself)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      const embed = new EmbedBuilder().setColor(COLORS.info).setTitle(`🖼️ ${user.tag}'s Avatar`)
        .setImage(user.displayAvatarURL({ size: 1024 }));
      if (member?.avatar && member.avatar !== user.avatar) {
        embed.setDescription(`[Server Avatar](${member.displayAvatarURL({ size: 1024 })}) | [Global Avatar](${user.displayAvatarURL({ size: 1024 })})`);
      }
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("banner")
      .setDescription("Show a user's banner")
      .addUserOption((o) => o.setName("user").setDescription("User")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const fullUser = await user.fetch(true);
      if (!fullUser.banner) return interaction.reply({ embeds: [infoEmbed("No Banner", `${user.tag} has no banner.`)] });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle(`🖼️ ${user.tag}'s Banner`).setImage(fullUser.bannerURL({ size: 1024 })!)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("history")
      .setDescription("Show moderation history of a user")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      const guildId = interaction.guildId!;
      const warns = warnsStore.get(`${guildId}:${user.id}`) ?? [];
      const strikes = strikesStore.get(`${guildId}:${user.id}`) ?? [];
      const userCases = Object.values(casesStore.getAll()).filter((c) => c.guildId === guildId && c.userId === user.id);

      const embed = new EmbedBuilder().setColor(COLORS.mod).setTitle(`📜 History: ${user.tag}`)
        .addFields(
          { name: "Warnings", value: warns.length ? warns.map((w) => `\`${w.id}\` ${formatTimestamp(w.timestamp)} — ${w.reason}`).join("\n").slice(0, 500) : "None", inline: false },
          { name: "Strikes", value: strikes.length ? strikes.map((s) => `\`${s.id}\` — ${s.reason}`).join("\n").slice(0, 300) : "None", inline: false },
          { name: "Cases", value: userCases.length ? userCases.map((c) => `\`${c.id}\` **${c.type}** — ${c.reason.slice(0, 40)}`).join("\n").slice(0, 500) : "None", inline: false },
        );
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("modhistory")
      .setDescription("Show cases a moderator has handled")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption((o) => o.setName("moderator").setDescription("Moderator").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const mod = interaction.options.getUser("moderator", true);
      const guildId = interaction.guildId!;
      const modCases = Object.values(casesStore.getAll()).filter((c) => c.guildId === guildId && c.moderatorId === mod.id);
      if (!modCases.length) return interaction.reply({ embeds: [infoEmbed("No Cases", `${mod.tag} has no moderation history.`)] });
      const list = modCases.slice(0, 15).map((c) => `\`${c.id}\` **${c.type}** on <@${c.userId}> — ${c.reason.slice(0, 40)}`).join("\n");
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle(`🛡️ Mod History: ${mod.tag}`).setDescription(list).setFooter({ text: `${modCases.length} total action(s)` })] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("roles")
      .setDescription("List roles of a user")
      .addUserOption((o) => o.setName("user").setDescription("User (defaults to yourself)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const member = await interaction.guild!.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [errorEmbed("User Not Found")], ephemeral: true });
      const roles = member.roles.cache.filter((r) => r.id !== interaction.guildId).sort((a, b) => b.position - a.position);
      const embed = new EmbedBuilder().setColor(COLORS.info).setTitle(`🏷️ Roles: ${user.tag}`)
        .setDescription(roles.map((r) => r.toString()).join(", ") || "No roles")
        .setFooter({ text: `${roles.size} role(s)` });
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("joinposition")
      .setDescription("Show a member's join position in the server")
      .addUserOption((o) => o.setName("user").setDescription("User (defaults to yourself)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      await interaction.deferReply();
      const members = await interaction.guild!.members.fetch();
      const sorted = members.sort((a, b) => (a.joinedTimestamp ?? 0) - (b.joinedTimestamp ?? 0));
      const position = [...sorted.keys()].indexOf(user.id) + 1;
      if (position === 0) return interaction.editReply({ embeds: [errorEmbed("Not Found")] });
      await interaction.editReply({ embeds: [infoEmbed(`Join Position: ${user.tag}`, `**${user.tag}** joined as member **#${position}** of ${members.size}.`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("accountage")
      .setDescription("Show a user's account age")
      .addUserOption((o) => o.setName("user").setDescription("User (defaults to yourself)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const ms = Date.now() - user.createdTimestamp;
      const days = Math.floor(ms / 86400000);
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      const remainDays = days % 30;
      const ageStr = `${years > 0 ? years + "y " : ""}${months > 0 ? months + "mo " : ""}${remainDays}d`;
      await interaction.reply({ embeds: [infoEmbed(`Account Age: ${user.tag}`, `Created ${formatTimestamp(user.createdTimestamp)}\nAge: **${ageStr}**`).setThumbnail(user.displayAvatarURL())] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("mutualservers")
      .setDescription("Show mutual servers with the bot"),
    async execute(interaction: ChatInputCommandInteraction) {
      const count = interaction.client.guilds.cache.size;
      await interaction.reply({ embeds: [infoEmbed("Mutual Servers", `I share **${count}** server(s) with users (Discord privacy limits individual lookups).`)] });
    },
  },
];
