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
import { COLORS, randomInt, randomItem } from "../../lib/utils.js";

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchTrivia(category?: string, difficulty?: string) {
  const params = new URLSearchParams({ amount: "1", type: "multiple" });
  if (category) params.set("category", category);
  if (difficulty) params.set("difficulty", difficulty);
  const res = await fetch(`https://opentdb.com/api.php?${params}`);
  const data = await res.json() as { results?: Array<{ question: string; correct_answer: string; incorrect_answers: string[]; category: string; difficulty: string }> };
  return data.results?.[0] ?? null;
}

function decodeHtml(str: string) {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

export const quizCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("trivia")
      .setDescription("Answer a trivia question")
      .addStringOption((o) =>
        o.setName("difficulty").setDescription("Difficulty").addChoices(
          { name: "Easy", value: "easy" }, { name: "Medium", value: "medium" }, { name: "Hard", value: "hard" }
        )
      )
      .addStringOption((o) =>
        o.setName("category").setDescription("Category").addChoices(
          { name: "General", value: "9" }, { name: "Science", value: "17" }, { name: "History", value: "23" },
          { name: "Sports", value: "21" }, { name: "Geography", value: "22" }, { name: "Video Games", value: "15" },
        )
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();
      const difficulty = interaction.options.getString("difficulty") ?? undefined;
      const category = interaction.options.getString("category") ?? undefined;
      const q = await fetchTrivia(category, difficulty).catch(() => null);
      if (!q) { await interaction.editReply({ content: "Failed to fetch a question. Try again!" }); return; }

      const correct = decodeHtml(q.correct_answer);
      const all = shuffleArr([correct, ...q.incorrect_answers.map(decodeHtml)]);
      const letters = ["A", "B", "C", "D"];
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...all.map((ans, i) => new ButtonBuilder().setCustomId(`trivia_${i}`).setLabel(`${letters[i]}. ${ans.slice(0, 75)}`).setStyle(ButtonStyle.Secondary))
      );
      const embed = new EmbedBuilder().setColor(COLORS.blue).setTitle("❓ Trivia").setDescription(`**${decodeHtml(q.question)}**`).setFooter({ text: `Category: ${q.category} | Difficulty: ${q.difficulty} | 30s` });
      const msg = await interaction.editReply({ embeds: [embed], components: [row] });
      const correctIdx = all.indexOf(correct);
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000, max: 1 });
      collector.on("collect", async (btn) => {
        const chosen = parseInt(btn.customId.split("_")[1]);
        const isCorrect = chosen === correctIdx;
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...all.map((ans, i) => new ButtonBuilder().setCustomId(`trivia_${i}_done`).setLabel(`${letters[i]}. ${ans.slice(0, 75)}`).setStyle(i === correctIdx ? ButtonStyle.Success : i === chosen && !isCorrect ? ButtonStyle.Danger : ButtonStyle.Secondary).setDisabled(true))
        );
        await btn.update({ embeds: [embed.setColor(isCorrect ? COLORS.success : COLORS.error).setFooter({ text: isCorrect ? `✅ Correct! ${correct}` : `❌ Wrong! ${correct}` })], components: [disabledRow] });
      });
      collector.on("end", async (col) => { if (col.size === 0) await interaction.editReply({ content: "⏰ Time's up!" }).catch(() => null); });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("mathquiz")
      .setDescription("Solve a math problem")
      .addStringOption((o) => o.setName("difficulty").setDescription("Difficulty").addChoices({ name: "Easy", value: "easy" }, { name: "Medium", value: "medium" }, { name: "Hard", value: "hard" })),
    async execute(interaction: ChatInputCommandInteraction) {
      const diff = interaction.options.getString("difficulty") ?? "easy";
      let question = "", answer = 0;
      if (diff === "easy") {
        const a = randomInt(1, 20), b = randomInt(1, 20);
        const op = randomItem(["+", "-", "×"] as const);
        answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
        question = `${a} ${op} ${b}`;
      } else if (diff === "medium") {
        const a = randomInt(10, 50), b = randomInt(2, 12);
        const op = randomItem(["+", "-", "×", "÷"] as const);
        if (op === "÷") { answer = a; question = `${a * b} ÷ ${b}`; }
        else { answer = op === "+" ? a + b : op === "-" ? a - b : a * b; question = `${a} ${op} ${b}`; }
      } else {
        const a = randomInt(10, 30), b = randomInt(2, 10), c = randomInt(1, 20);
        answer = a * b + c; question = `${a} × ${b} + ${c}`;
      }
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle("🧮 Math Quiz").setDescription(`**What is: ${question} = ?**\n\nType your answer in chat! 20 seconds.`).setFooter({ text: `Difficulty: ${diff}` })] });
      const channel = interaction.channel as TextChannel;
      if (!channel) return;
      const collector = channel.createMessageCollector({ filter: (m: Message) => m.author.id === interaction.user.id, time: 20000, max: 3 });
      collector.on("collect", async (msg: Message) => {
        if (Math.abs(parseFloat(msg.content) - answer) < 0.01) { collector.stop("won"); await msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("✅ Correct!").setDescription(`**${question} = ${answer}**`)] }); }
        else { await msg.reply("❌ Wrong, try again!"); }
      });
      collector.on("end", async (_col: unknown, r: string) => { if (r !== "won") await interaction.followUp(`⏰ Time's up! Answer: **${answer}**`); });
    },
  },
  {
    data: new SlashCommandBuilder().setName("flagquiz").setDescription("Guess the country by its flag"),
    async execute(interaction: ChatInputCommandInteraction) {
      const countries = [
        { flag: "🇺🇸", name: "United States" }, { flag: "🇬🇧", name: "United Kingdom" },
        { flag: "🇨🇦", name: "Canada" }, { flag: "🇦🇺", name: "Australia" }, { flag: "🇩🇪", name: "Germany" },
        { flag: "🇫🇷", name: "France" }, { flag: "🇯🇵", name: "Japan" }, { flag: "🇧🇷", name: "Brazil" },
        { flag: "🇮🇳", name: "India" }, { flag: "🇲🇽", name: "Mexico" }, { flag: "🇮🇹", name: "Italy" },
        { flag: "🇷🇺", name: "Russia" }, { flag: "🇰🇷", name: "South Korea" }, { flag: "🇨🇳", name: "China" },
        { flag: "🇿🇦", name: "South Africa" }, { flag: "🇧🇪", name: "Belgium" }, { flag: "🇳🇴", name: "Norway" },
        { flag: "🇸🇪", name: "Sweden" }, { flag: "🇵🇹", name: "Portugal" }, { flag: "🇦🇷", name: "Argentina" },
      ];
      const target = randomItem(countries);
      const wrong = shuffleArr(countries.filter((c) => c.name !== target.name)).slice(0, 3);
      const options = shuffleArr([target, ...wrong]);
      const correctIdx = options.indexOf(target);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...options.map((c, i) => new ButtonBuilder().setCustomId(`flag_${i}`).setLabel(c.name).setStyle(ButtonStyle.Secondary))
      );
      const msg = await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle("🌍 Flag Quiz").setDescription(`What country does this flag belong to?\n\n# ${target.flag}`).setFooter({ text: "30 seconds" })],
        components: [row], fetchReply: true,
      });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000, max: 1 });
      collector.on("collect", async (btn) => {
        const isCorrect = parseInt(btn.customId.split("_")[1]) === correctIdx;
        await btn.update({ embeds: [new EmbedBuilder().setColor(isCorrect ? COLORS.success : COLORS.error).setTitle("🌍 Flag Quiz").setDescription(`${target.flag}\n\n${isCorrect ? "✅ Correct!" : "❌ Wrong!"} The answer was **${target.name}**`)], components: [] });
      });
    },
  },
  {
    data: new SlashCommandBuilder().setName("geographyquiz").setDescription("Answer a geography question"),
    async execute(interaction: ChatInputCommandInteraction) {
      const questions = [
        { q: "What is the capital of France?", a: "Paris" },
        { q: "What is the largest continent by area?", a: "Asia" },
        { q: "What country has the most natural lakes?", a: "Canada" },
        { q: "What is the tallest mountain in the world?", a: "Everest" },
        { q: "What ocean is the largest?", a: "Pacific" },
        { q: "What is the capital of Australia?", a: "Canberra" },
        { q: "What river is the longest in the world?", a: "Nile" },
        { q: "What is the smallest country in the world?", a: "Vatican" },
        { q: "What US state is the largest by area?", a: "Alaska" },
        { q: "What is the capital of Japan?", a: "Tokyo" },
      ];
      const { q, a } = randomItem(questions);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle("🌎 Geography Quiz").setDescription(`**${q}**\n\nType your answer in chat! 20 seconds!`)] });
      const channel = interaction.channel as TextChannel;
      if (!channel) return;
      const collector = channel.createMessageCollector({ filter: (m: Message) => m.author.id === interaction.user.id, time: 20000, max: 3 });
      collector.on("collect", async (msg: Message) => {
        if (msg.content.toLowerCase().includes(a.toLowerCase())) { collector.stop("won"); await msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setDescription(`✅ Correct! The answer was **${a}**!`)] }); }
        else { await msg.reply("❌ Wrong, try again!"); }
      });
      collector.on("end", async (_col: unknown, r: string) => { if (r !== "won") await interaction.followUp(`⏰ Answer: **${a}**`); });
    },
  },
];
