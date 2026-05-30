import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type TextChannel,
  type Message,
} from "discord.js";
import type { Command } from "../../types.js";
import { COLORS, randomItem, randomInt } from "../../lib/utils.js";

const FIVE_LETTER_WORDS = [
  "apple", "brave", "crane", "dream", "eagle", "flame", "grace", "honey",
  "ivory", "jewel", "knack", "lemon", "magic", "night", "ocean", "piano",
  "quill", "river", "storm", "tower", "ultra", "viola", "whale", "zebra",
  "blast", "cloud", "dance", "ember", "frost", "giant", "house", "image",
  "joker", "karma", "lance", "metro", "nerve", "orbit", "plant", "queen",
  "range", "snake", "tiger", "umbra", "viper", "water", "xeric", "yacht",
];

const LONGER_WORDS = [
  "discord", "python", "server", "kingdom", "dragon", "wizard", "portal",
  "crystal", "phantom", "shadow", "castle", "hunter", "garden", "ancient",
  "barrier", "captain", "destiny", "explore", "fortune", "galaxy",
];

function scramble(word: string): string {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) { const j = randomInt(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.join("") === word ? scramble(word) : arr.join("");
}

export const wordCommands: Command[] = [
  {
    data: new SlashCommandBuilder().setName("hangman").setDescription("Play hangman"),
    async execute(interaction: ChatInputCommandInteraction) {
      const word = randomItem(LONGER_WORDS);
      const guessed = new Set<string>();
      let wrong = 0;
      const maxWrong = 6;
      const STAGES = ["", "👤", "👤🫀", "👤🫀💪", "👤🫀💪💪", "👤🫀💪💪🦵", "💀"];
      const displayWord = () => word.split("").map((c) => guessed.has(c) ? c : "_").join(" ");
      const isDone = () => word.split("").every((c) => guessed.has(c));
      const makeEmbed = (ended = false) => new EmbedBuilder().setColor(ended ? (wrong >= maxWrong ? COLORS.error : COLORS.success) : COLORS.blue)
        .setTitle("🪢 Hangman")
        .setDescription(`${STAGES[wrong]}\n\nWord: \`${displayWord()}\`\nWrong: **${wrong}/${maxWrong}**\nGuessed: ${[...guessed].join(", ") || "none"}` + (ended ? `\n\n**The word was: ${word}**` : ""));
      await interaction.reply({ embeds: [makeEmbed()] });
      const channel = interaction.channel as TextChannel;
      if (!channel) return;
      const collector = channel.createMessageCollector({ filter: (m: Message) => m.author.id === interaction.user.id && m.content.length === 1 && /[a-z]/i.test(m.content), time: 120000 });
      collector.on("collect", async (msg: Message) => {
        const letter = msg.content.toLowerCase();
        if (guessed.has(letter)) { await msg.reply("Already guessed!"); return; }
        guessed.add(letter);
        if (!word.includes(letter)) wrong++;
        if (wrong >= maxWrong || isDone()) { collector.stop(wrong >= maxWrong ? "lost" : "won"); await msg.reply({ embeds: [makeEmbed(true)] }); }
        else { await msg.reply({ embeds: [makeEmbed()] }); }
      });
      collector.on("end", async (_col: unknown, r: string) => { if (r === "time") await interaction.followUp(`⏰ Time's up! Word: **${word}**`); });
    },
  },
  {
    data: new SlashCommandBuilder().setName("scramble").setDescription("Unscramble the word"),
    async execute(interaction: ChatInputCommandInteraction) {
      const word = randomItem([...FIVE_LETTER_WORDS, ...LONGER_WORDS]);
      const scrambled = scramble(word);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle("🔀 Word Scramble").setDescription(`Unscramble this word:\n\n# **${scrambled.toUpperCase()}**\n\nType the answer in chat! 30 seconds!`)] });
      const channel = interaction.channel as TextChannel;
      if (!channel) return;
      const collector = channel.createMessageCollector({ filter: (m: Message) => m.author.id === interaction.user.id, time: 30000, max: 5 });
      collector.on("collect", async (msg: Message) => {
        if (msg.content.toLowerCase() === word) { collector.stop("won"); await msg.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("✅ Correct!").setDescription(`The word was **${word}**!`)] }); }
        else { await msg.reply("❌ Not quite!"); }
      });
      collector.on("end", async (_col: unknown, r: string) => { if (r !== "won") await interaction.followUp(`⏰ The word was **${word}**!`); });
    },
  },
  {
    data: new SlashCommandBuilder().setName("wordguess").setDescription("Guess the 5-letter word (Wordle-style)"),
    async execute(interaction: ChatInputCommandInteraction) {
      const word = randomItem(FIVE_LETTER_WORDS);
      let attempts = 0;
      const history: string[] = [];
      const getHint = (guess: string) =>
        guess.split("").map((c, i) => c === word[i] ? "🟩" : word.includes(c) ? "🟨" : "⬛").join("") + ` \`${guess.toUpperCase()}\``;
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle("🟩 Word Guess (Wordle)").setDescription("Guess the **5-letter word** in 6 tries!\n🟩 = correct 🟨 = wrong position ⬛ = not in word\n\nType a 5-letter word in chat!")] });
      const channel = interaction.channel as TextChannel;
      if (!channel) return;
      const collector = channel.createMessageCollector({ filter: (m: Message) => m.author.id === interaction.user.id && m.content.length === 5 && /^[a-z]+$/i.test(m.content), time: 180000 });
      collector.on("collect", async (msg: Message) => {
        const guess = msg.content.toLowerCase();
        attempts++;
        history.push(getHint(guess));
        const won = guess === word;
        const over = attempts >= 6;
        await msg.reply({ embeds: [new EmbedBuilder().setColor(won ? COLORS.success : over ? COLORS.error : COLORS.blue).setTitle("🟩 Word Guess").setDescription(history.join("\n") + (won || over ? `\n\nThe word was: **${word.toUpperCase()}**` : `\n\nAttempt ${attempts}/6`))] });
        if (won || over) collector.stop(won ? "won" : "lost");
      });
      collector.on("end", async (_col: unknown, r: string) => { if (r === "time") await interaction.followUp(`⏰ Time's up! Word: **${word.toUpperCase()}**`); });
    },
  },
];
