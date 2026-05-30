import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type TextChannel,
  type Message,
} from "discord.js";
import type { Command } from "../../types.js";
import { COLORS, randomItem, randomInt } from "../../lib/utils.js";

const EIGHT_BALL_RESPONSES = [
  "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes, definitely.",
  "You may rely on it.", "As I see it, yes.", "Most likely.", "Outlook good.",
  "Yes.", "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
  "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
  "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful.",
];

type RpsChoice = "rock" | "paper" | "scissors";

export const quickGameCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("coinflip")
      .setDescription("Flip a coin")
      .addIntegerOption((o) => o.setName("times").setDescription("Number of flips (1-10)").setMinValue(1).setMaxValue(10)),
    async execute(interaction: ChatInputCommandInteraction) {
      const times = interaction.options.getInteger("times") ?? 1;
      const results = Array.from({ length: times }, () => (Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails"));
      const heads = results.filter((r) => r.includes("Heads")).length;
      const embed = new EmbedBuilder().setColor(COLORS.gold)
        .setTitle("🪙 Coin Flip")
        .setDescription(times === 1 ? results[0] : results.join("\n"))
        .setFooter(times > 1 ? { text: `Heads: ${heads} | Tails: ${times - heads}` } : null);
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("dice")
      .setDescription("Roll dice")
      .addIntegerOption((o) => o.setName("sides").setDescription("Number of sides (default: 6)").setMinValue(2).setMaxValue(1000))
      .addIntegerOption((o) => o.setName("count").setDescription("Number of dice (1-10)").setMinValue(1).setMaxValue(10)),
    async execute(interaction: ChatInputCommandInteraction) {
      const sides = interaction.options.getInteger("sides") ?? 6;
      const count = interaction.options.getInteger("count") ?? 1;
      const rolls = Array.from({ length: count }, () => randomInt(1, sides));
      const total = rolls.reduce((a, b) => a + b, 0);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.info)
          .setTitle(`🎲 Dice Roll (d${sides})`)
          .setDescription(count === 1 ? `**${rolls[0]}**` : `Rolls: ${rolls.join(", ")}\nTotal: **${total}**`)],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("8ball")
      .setDescription("Ask the Magic 8-Ball a question")
      .addStringOption((o) => o.setName("question").setDescription("Your question").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const question = interaction.options.getString("question", true);
      const response = randomItem(EIGHT_BALL_RESPONSES);
      const isPositive = EIGHT_BALL_RESPONSES.indexOf(response) < 10;
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(isPositive ? COLORS.success : EIGHT_BALL_RESPONSES.indexOf(response) < 15 ? COLORS.warning : COLORS.error)
          .setTitle("🎱 Magic 8-Ball")
          .addFields({ name: "Question", value: question }, { name: "Answer", value: response })],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("guessnumber")
      .setDescription("Start a number guessing game")
      .addIntegerOption((o) => o.setName("min").setDescription("Minimum number (default: 1)").setMinValue(1))
      .addIntegerOption((o) => o.setName("max").setDescription("Maximum number (default: 100)").setMaxValue(10000)),
    async execute(interaction: ChatInputCommandInteraction) {
      const min = interaction.options.getInteger("min") ?? 1;
      const max = interaction.options.getInteger("max") ?? 100;
      const secret = randomInt(min, max);
      let attempts = 0;
      const maxAttempts = Math.ceil(Math.log2(max - min + 1)) + 2;

      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.blue)
          .setTitle("🔢 Guess the Number!")
          .setDescription(`I'm thinking of a number between **${min}** and **${max}**.\nYou have **${maxAttempts}** attempts. Reply with your guess in chat!`)],
      });

      const channel = interaction.channel as TextChannel;
      if (!channel) return;
      const collector = channel.createMessageCollector({
        filter: (m: Message) => m.author.id === interaction.user.id && !isNaN(Number(m.content)),
        time: 60000,
        max: maxAttempts,
      });

      collector.on("collect", async (msg: Message) => {
        const guess = parseInt(msg.content);
        attempts++;
        if (guess === secret) {
          collector.stop("won");
          await msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("🎉 Correct!").setDescription(`You guessed **${secret}** in **${attempts}** attempt(s)!`)] });
        } else if (attempts >= maxAttempts) {
          collector.stop("lost");
        } else {
          await msg.reply(`${guess < secret ? "📈 Too low!" : "📉 Too high!"} (${maxAttempts - attempts} attempts left)`);
        }
      });

      collector.on("end", async (_col: unknown, reason: string) => {
        if (reason === "time") await channel.send(`⏰ Time's up! The number was **${secret}**.`);
        else if (reason === "lost") await channel.send(`❌ Out of attempts! The number was **${secret}**.`);
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("higherlower")
      .setDescription("Higher or lower number game"),
    async execute(interaction: ChatInputCommandInteraction) {
      let current = randomInt(1, 100);
      let score = 0;

      const makeRow = (disabled = false) =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("higher").setLabel("Higher ⬆️").setStyle(ButtonStyle.Primary).setDisabled(disabled),
          new ButtonBuilder().setCustomId("lower").setLabel("Lower ⬇️").setStyle(ButtonStyle.Danger).setDisabled(disabled),
        );

      const makeEmbed = (num: number, sc: number, ended = false) =>
        new EmbedBuilder().setColor(ended ? COLORS.gold : COLORS.blue)
          .setTitle("📊 Higher or Lower")
          .setDescription(`Current number: **${num}**\nScore: **${sc}**${ended ? `\n\n**Game over! Final score: ${sc}**` : "\n\nWill the next number be higher or lower?"}`);

      const msg = await interaction.reply({ embeds: [makeEmbed(current, score)], components: [makeRow()], fetchReply: true });

      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) { await btn.reply({ content: "This is not your game!", ephemeral: true }); return; }
        const next = randomInt(1, 100);
        const correct = (btn.customId === "higher" && next > current) || (btn.customId === "lower" && next < current);
        current = next;
        if (correct) {
          score++;
          await btn.update({ embeds: [makeEmbed(current, score)], components: [makeRow()] });
        } else {
          collector.stop();
          await btn.update({ embeds: [makeEmbed(current, score, true)], components: [makeRow(true)] });
        }
      });

      collector.on("end", async () => {
        await msg.edit({ components: [makeRow(true)] }).catch(() => null);
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("rps")
      .setDescription("Play Rock Paper Scissors")
      .addStringOption((o) =>
        o.setName("choice").setDescription("Your choice").setRequired(true)
          .addChoices({ name: "Rock 🪨", value: "rock" }, { name: "Paper 📄", value: "paper" }, { name: "Scissors ✂️", value: "scissors" })
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const choices: RpsChoice[] = ["rock", "paper", "scissors"];
      const emojis: Record<RpsChoice, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
      const player = interaction.options.getString("choice", true) as RpsChoice;
      const bot = randomItem(choices);
      const wins: Record<RpsChoice, RpsChoice> = { rock: "scissors", paper: "rock", scissors: "paper" };
      const result = player === bot ? "draw" : wins[player] === bot ? "win" : "lose";
      const colors = { win: COLORS.success, lose: COLORS.error, draw: COLORS.warning };
      const titles = { win: "🎉 You Win!", lose: "😔 You Lose!", draw: "🤝 It's a Draw!" };
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(colors[result])
          .setTitle(titles[result])
          .addFields(
            { name: "Your choice", value: `${emojis[player]} ${player}`, inline: true },
            { name: "My choice", value: `${emojis[bot]} ${bot}`, inline: true },
          )],
      });
    },
  },
];
