import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types.js";
import {
  COLORS, randomItem, mockText, owoify,
  ROASTS, COMPLIMENTS,
} from "../../lib/utils.js";

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { "Accept": "application/json", ...headers } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

export const funCommands: Command[] = [
  {
    data: new SlashCommandBuilder().setName("meme").setDescription("Get a random meme"),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();
      const data = await fetchJson<{ title: string; url: string; postLink: string; subreddit: string }>("https://meme-api.com/gimme");
      if (!data?.url) { await interaction.editReply({ content: "Couldn't fetch a meme right now!" }); return; }
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle(data.title.slice(0, 256)).setImage(data.url).setFooter({ text: `r/${data.subreddit}` }).setURL(data.postLink)],
      });
    },
  },
  {
    data: new SlashCommandBuilder().setName("joke").setDescription("Get a random joke"),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();
      const data = await fetchJson<{ type: string; setup?: string; delivery?: string; joke?: string }>("https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist");
      if (!data) { await interaction.editReply({ content: "Couldn't fetch a joke!" }); return; }
      const text = data.type === "twopart" ? `**${data.setup}**\n\n||${data.delivery}||` : data.joke!;
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle("😂 Joke").setDescription(text)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("dadjoke").setDescription("Get a dad joke"),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();
      const data = await fetchJson<{ joke: string }>("https://icanhazdadjoke.com/", { "Accept": "application/json" });
      if (!data?.joke) { await interaction.editReply({ content: "Couldn't fetch a dad joke!" }); return; }
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle("👨 Dad Joke").setDescription(data.joke)] });
    },
  },
  {
    data: new SlashCommandBuilder().setName("fact").setDescription("Get a random fact"),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();
      const data = await fetchJson<{ text: string }>("https://uselessfacts.jsph.pl/random.json?language=en");
      if (!data?.text) { await interaction.editReply({ content: "Couldn't fetch a fact!" }); return; }
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle("🧠 Random Fact").setDescription(data.text)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("roast")
      .setDescription("Roast someone!")
      .addUserOption((o) => o.setName("user").setDescription("User to roast").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle(`🔥 Roasting ${user.tag}`).setDescription(`${user.toString()}, ${randomItem(ROASTS)}`).setThumbnail(user.displayAvatarURL())] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("compliment")
      .setDescription("Compliment someone!")
      .addUserOption((o) => o.setName("user").setDescription("User to compliment").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user", true);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle(`💝 Complimenting ${user.tag}`).setDescription(`${user.toString()}, ${randomItem(COMPLIMENTS)}`).setThumbnail(user.displayAvatarURL())] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("ship")
      .setDescription("Ship two users together")
      .addUserOption((o) => o.setName("user1").setDescription("First user").setRequired(true))
      .addUserOption((o) => o.setName("user2").setDescription("Second user").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const u1 = interaction.options.getUser("user1", true);
      const u2 = interaction.options.getUser("user2", true);
      const hash = (u1.id + u2.id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const score = hash % 101;
      const bar = "💕".repeat(Math.ceil(score / 10)) + "🖤".repeat(10 - Math.ceil(score / 10));
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.mod).setTitle("💕 Ship Meter")
          .setDescription(`**${u1.username}** ❤️ **${u2.username}**\n\n${bar}\n\n**${score}%** compatibility`)
          .setFooter({ text: score > 70 ? "A match made in heaven! 💞" : score > 40 ? "There's potential here..." : "Maybe just friends? 🤷" })],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("rate")
      .setDescription("Rate something out of 10")
      .addStringOption((o) => o.setName("thing").setDescription("What to rate").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const thing = interaction.options.getString("thing", true);
      const score = thing.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 11;
      const comments = ["Absolutely terrible.", "Pretty bad.", "Below average.", "Mediocre.", "Just okay.", "Not bad!", "Decent.", "Pretty good!", "Great!", "Excellent!", "PERFECT! 10/10!"];
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle(`⭐ Rating: ${thing}`).setDescription(`${"⭐".repeat(score)}${"☆".repeat(10 - score)}\n\n**${score}/10** — ${comments[score]}`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("mock")
      .setDescription("Mock a message SpOnGeBoB style")
      .addStringOption((o) => o.setName("text").setDescription("Text to mock").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const text = interaction.options.getString("text", true);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.warning).setTitle("🧽 Mock").setDescription(mockText(text))] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("owoify")
      .setDescription("owoify text uwu")
      .addStringOption((o) => o.setName("text").setDescription("Text to owoify").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const text = interaction.options.getString("text", true);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.mod).setTitle("🐱 owoify").setDescription(owoify(text))] });
    },
  },
];
