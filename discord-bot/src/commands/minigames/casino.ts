import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import type { Command } from "../../types.js";
import { COLORS, randomInt, randomItem } from "../../lib/utils.js";
import { getOrCreateRpgProfile, addGold, rpgStore } from "../../lib/storage.js";

function getProfile(userId: string, guildId: string) {
  return getOrCreateRpgProfile(userId, guildId);
}

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣"];
const SLOT_MULTIPLIERS: Record<string, number> = { "💎": 20, "7️⃣": 10, "⭐": 5, "🍇": 3, "🍊": 2, "🍋": 1.5, "🍒": 1.2 };

function spinSlots() {
  return [randomItem(SLOT_SYMBOLS), randomItem(SLOT_SYMBOLS), randomItem(SLOT_SYMBOLS)];
}

function slotsResult(reels: string[], bet: number) {
  if (reels[0] === reels[1] && reels[1] === reels[2]) return Math.floor(bet * (SLOT_MULTIPLIERS[reels[0]] ?? 1) * 3);
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return Math.floor(bet * 0.5);
  return 0;
}

const BJ_SUITS = ["♠", "♥", "♦", "♣"];
const BJ_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function makeDeck() {
  return BJ_SUITS.flatMap((s) => BJ_RANKS.map((r) => `${r}${s}`));
}

function cardValue(card: string) {
  const rank = card.slice(0, -1);
  if (["J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank);
}

function handValue(cards: string[]) {
  let total = cards.reduce((s, c) => s + cardValue(c), 0);
  let aces = cards.filter((c) => c.startsWith("A")).length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

export const casinoCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("slots")
      .setDescription("Spin the slot machine")
      .addIntegerOption((o) => o.setName("bet").setDescription("Gold to bet (10-1000)").setMinValue(10).setMaxValue(1000).setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const bet = interaction.options.getInteger("bet", true);
      const profile = getProfile(interaction.user.id, interaction.guildId!);
      if (profile.gold < bet) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ You only have **${profile.gold}** gold!`)], ephemeral: true }); return; }

      const reels = spinSlots();
      const winnings = slotsResult(reels, bet);
      const net = winnings - bet;
      addGold(interaction.user.id, interaction.guildId!, net);
      const newBal = profile.gold + net;

      const embed = new EmbedBuilder()
        .setColor(winnings > 0 ? COLORS.success : COLORS.error)
        .setTitle("🎰 Slot Machine")
        .setDescription(`╔═══════╗\n║ ${reels.join(" ")} ║\n╚═══════╝`)
        .addFields(
          { name: "Bet", value: `${bet} 💰`, inline: true },
          { name: winnings > 0 ? "Won!" : "Result", value: `${winnings > 0 ? "+" : ""}${net} 💰`, inline: true },
          { name: "Balance", value: `${newBal} 💰`, inline: true },
        );
      if (reels[0] === reels[1] && reels[1] === reels[2]) embed.setFooter({ text: "🎉 JACKPOT!" });
      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("blackjack")
      .setDescription("Play blackjack")
      .addIntegerOption((o) => o.setName("bet").setDescription("Gold to bet (10-1000)").setMinValue(10).setMaxValue(1000).setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const bet = interaction.options.getInteger("bet", true);
      const profile = getProfile(interaction.user.id, interaction.guildId!);
      if (profile.gold < bet) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.error).setDescription("❌ Not enough gold!")], ephemeral: true }); return; }

      const deck = makeDeck().sort(() => Math.random() - 0.5);
      const playerHand = [deck.pop()!, deck.pop()!];
      const dealerHand = [deck.pop()!, deck.pop()!];

      const makeEmbed = (showDealer = false, result?: string) => {
        const pVal = handValue(playerHand);
        const dVal = handValue(dealerHand);
        return new EmbedBuilder()
          .setColor(result === "win" ? COLORS.success : result === "lose" ? COLORS.error : result === "push" ? COLORS.warning : COLORS.blue)
          .setTitle("🃏 Blackjack")
          .addFields(
            { name: "Your Hand", value: `${playerHand.join(" ")} (${pVal})`, inline: true },
            { name: "Dealer's Hand", value: showDealer ? `${dealerHand.join(" ")} (${dVal})` : `${dealerHand[0]} 🂠`, inline: true },
            ...(result ? [{ name: "Result", value: result === "win" ? `🎉 Win! +${bet} 💰` : result === "push" ? "🤝 Push (tie)" : `💸 Lost ${bet} 💰` }] : []),
          );
      };

      const hitBtn = new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary);
      const standBtn = new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(hitBtn, standBtn);

      if (handValue(playerHand) === 21) {
        addGold(interaction.user.id, interaction.guildId!, bet);
        await interaction.reply({ embeds: [makeEmbed(true, "win").setFooter({ text: "Blackjack! 🎉" })], components: [] });
        return;
      }

      const msg = await interaction.reply({ embeds: [makeEmbed()], components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000, filter: (b) => b.user.id === interaction.user.id });

      collector.on("collect", async (btn) => {
        if (btn.customId === "bj_hit") {
          playerHand.push(deck.pop()!);
          const pVal = handValue(playerHand);
          if (pVal > 21) {
            addGold(interaction.user.id, interaction.guildId!, -bet);
            collector.stop();
            await btn.update({ embeds: [makeEmbed(true, "lose").setFooter({ text: "Bust!" })], components: [] });
          } else if (pVal === 21) {
            collector.stop("stand");
            await btn.deferUpdate();
          } else {
            await btn.update({ embeds: [makeEmbed()], components: [row] });
          }
        } else {
          collector.stop("stand");
          await btn.deferUpdate();
        }
      });

      collector.on("end", async (_col, reason) => {
        if (reason !== "stand" && reason !== "time") return;
        while (handValue(dealerHand) < 17) dealerHand.push(deck.pop()!);
        const pVal = handValue(playerHand), dVal = handValue(dealerHand);
        let result: "win" | "lose" | "push";
        if (dVal > 21 || pVal > dVal) result = "win";
        else if (pVal === dVal) result = "push";
        else result = "lose";
        addGold(interaction.user.id, interaction.guildId!, result === "win" ? bet : result === "push" ? 0 : -bet);
        await msg.edit({ embeds: [makeEmbed(true, result)], components: [] }).catch(() => null);
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("roulette")
      .setDescription("Play roulette")
      .addIntegerOption((o) => o.setName("bet").setDescription("Gold to bet").setMinValue(10).setMaxValue(1000).setRequired(true))
      .addStringOption((o) =>
        o.setName("choice").setDescription("What to bet on").setRequired(true)
          .addChoices(
            { name: "Red (2x)", value: "red" }, { name: "Black (2x)", value: "black" },
            { name: "Even (2x)", value: "even" }, { name: "Odd (2x)", value: "odd" },
            { name: "1-18 (2x)", value: "low" }, { name: "19-36 (2x)", value: "high" },
            { name: "First 12 (3x)", value: "first12" }, { name: "Second 12 (3x)", value: "second12" },
          )
      ),
    async execute(interaction: ChatInputCommandInteraction) {
      const bet = interaction.options.getInteger("bet", true);
      const choice = interaction.options.getString("choice", true);
      const profile = getProfile(interaction.user.id, interaction.guildId!);
      if (profile.gold < bet) { await interaction.reply({ content: "Not enough gold!", ephemeral: true }); return; }

      const num = randomInt(0, 36);
      const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      const isRed = RED_NUMS.includes(num);
      let win = false;
      let multiplier = 2;
      switch (choice) {
        case "red": win = isRed; break;
        case "black": win = !isRed && num !== 0; break;
        case "even": win = num > 0 && num % 2 === 0; break;
        case "odd": win = num % 2 === 1; break;
        case "low": win = num >= 1 && num <= 18; break;
        case "high": win = num >= 19 && num <= 36; break;
        case "first12": win = num >= 1 && num <= 12; multiplier = 3; break;
        case "second12": win = num >= 13 && num <= 24; multiplier = 3; break;
      }
      const net = win ? bet * (multiplier - 1) : -bet;
      addGold(interaction.user.id, interaction.guildId!, net);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(win ? COLORS.success : COLORS.error)
          .setTitle("🎡 Roulette")
          .setDescription(`The ball lands on **${num}** (${num === 0 ? "🟢 Green" : isRed ? "🔴 Red" : "⚫ Black"})`)
          .addFields(
            { name: "Your bet", value: `${choice} for ${bet} 💰`, inline: true },
            { name: "Result", value: win ? `✅ Win! +${net} 💰` : `❌ Lost ${bet} 💰`, inline: true },
          )],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("crash")
      .setDescription("Play crash — cash out before it crashes!")
      .addIntegerOption((o) => o.setName("bet").setDescription("Gold to bet").setMinValue(10).setMaxValue(500).setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const bet = interaction.options.getInteger("bet", true);
      const profile = getProfile(interaction.user.id, interaction.guildId!);
      if (profile.gold < bet) { await interaction.reply({ content: "Not enough gold!", ephemeral: true }); return; }

      const crashAt = Math.max(1, +(Math.random() < 0.33 ? (Math.random() * 2 + 1) : Math.random() * 10 + 1).toFixed(2));
      let multiplier = 1.0;
      let cashedOut = false;

      const cashBtn = new ButtonBuilder().setCustomId("crash_out").setLabel("💸 Cash Out").setStyle(ButtonStyle.Success);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(cashBtn);

      const embed = () => new EmbedBuilder().setColor(COLORS.gold)
        .setTitle("📈 Crash")
        .setDescription(`Current multiplier: **${multiplier.toFixed(2)}x**\nPotential win: **${Math.floor(bet * multiplier)} 💰**\n\nClick Cash Out before it crashes!`);

      const msg = await interaction.reply({ embeds: [embed()], components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000, filter: (b) => b.user.id === interaction.user.id });

      const interval = setInterval(async () => {
        multiplier = +(multiplier + 0.1 * multiplier).toFixed(2);
        if (multiplier >= crashAt) {
          clearInterval(interval);
          collector.stop("crashed");
          if (!cashedOut) {
            addGold(interaction.user.id, interaction.guildId!, -bet);
            await msg.edit({ embeds: [new EmbedBuilder().setColor(COLORS.error).setTitle("💥 CRASHED!").setDescription(`Crashed at **${multiplier.toFixed(2)}x**\nYou lost **${bet} 💰**`)], components: [] }).catch(() => null);
          }
        } else {
          await msg.edit({ embeds: [embed()], components: [row] }).catch(() => { clearInterval(interval); });
        }
      }, 1500);

      collector.on("collect", async (btn) => {
        cashedOut = true;
        clearInterval(interval);
        const winnings = Math.floor(bet * multiplier) - bet;
        addGold(interaction.user.id, interaction.guildId!, winnings);
        await btn.update({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("💸 Cashed Out!").setDescription(`Cashed out at **${multiplier.toFixed(2)}x**\nWon: **+${winnings} 💰**\n\nCrash was at: **${crashAt.toFixed(2)}x**`)], components: [] });
        collector.stop("cashed");
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("coinbet")
      .setDescription("Bet on a coin flip")
      .addIntegerOption((o) => o.setName("amount").setDescription("Gold to bet").setMinValue(10).setMaxValue(1000).setRequired(true))
      .addStringOption((o) => o.setName("choice").setDescription("Heads or Tails").setRequired(true).addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" })),
    async execute(interaction: ChatInputCommandInteraction) {
      const amount = interaction.options.getInteger("amount", true);
      const choice = interaction.options.getString("choice", true);
      const profile = getProfile(interaction.user.id, interaction.guildId!);
      if (profile.gold < amount) { await interaction.reply({ content: "Not enough gold!", ephemeral: true }); return; }

      const result = Math.random() < 0.5 ? "heads" : "tails";
      const won = result === choice;
      addGold(interaction.user.id, interaction.guildId!, won ? amount : -amount);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(won ? COLORS.success : COLORS.error)
          .setTitle(`🪙 ${won ? "You Win!" : "You Lose!"}`)
          .setDescription(`Coin lands: **${result === "heads" ? "Heads 🪙" : "Tails 🪙"}**\nYour bet: **${choice}**`)
          .addFields({ name: "Result", value: won ? `+${amount} 💰` : `-${amount} 💰`, inline: true })],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("poker")
      .setDescription("Draw poker — make the best 5-card hand")
      .addIntegerOption((o) => o.setName("bet").setDescription("Gold to bet").setMinValue(10).setMaxValue(500).setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const bet = interaction.options.getInteger("bet", true);
      const profile = getProfile(interaction.user.id, interaction.guildId!);
      if (profile.gold < bet) { await interaction.reply({ content: "Not enough gold!", ephemeral: true }); return; }

      const SUITS = ["♠","♥","♦","♣"];
      const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
      const deck = SUITS.flatMap((s) => RANKS.map((r) => `${r}${s}`)).sort(() => Math.random() - 0.5);
      const hand = deck.splice(0, 5);

      const rankCounts: Record<string, number> = {};
      hand.forEach((c) => { const r = c.slice(0, -1); rankCounts[r] = (rankCounts[r] ?? 0) + 1; });
      const counts = Object.values(rankCounts).sort((a, b) => b - a);
      const isFlush = new Set(hand.map((c) => c.slice(-1))).size === 1;
      const rankIndices = hand.map((c) => RANKS.indexOf(c.slice(0, -1))).sort((a, b) => a - b);
      const isStraight = rankIndices[4] - rankIndices[0] === 4 && new Set(rankIndices).size === 5;

      let handName = "High Card";
      let multiplier = 0;
      if (isFlush && isStraight && rankIndices[0] === 8) { handName = "Royal Flush 👑"; multiplier = 50; }
      else if (isFlush && isStraight) { handName = "Straight Flush"; multiplier = 25; }
      else if (counts[0] === 4) { handName = "Four of a Kind"; multiplier = 10; }
      else if (counts[0] === 3 && counts[1] === 2) { handName = "Full House"; multiplier = 6; }
      else if (isFlush) { handName = "Flush"; multiplier = 5; }
      else if (isStraight) { handName = "Straight"; multiplier = 4; }
      else if (counts[0] === 3) { handName = "Three of a Kind"; multiplier = 3; }
      else if (counts[0] === 2 && counts[1] === 2) { handName = "Two Pair"; multiplier = 2; }
      else if (counts[0] === 2) { handName = "Pair"; multiplier = 1; }

      const winnings = Math.floor(bet * multiplier) - bet;
      addGold(interaction.user.id, interaction.guildId!, winnings);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(multiplier > 0 ? COLORS.success : COLORS.error)
          .setTitle("🃏 Video Poker")
          .setDescription(`**Your hand:** ${hand.join(" ")}\n\n**${handName}**`)
          .addFields(
            { name: "Bet", value: `${bet} 💰`, inline: true },
            { name: "Result", value: winnings > 0 ? `+${winnings} 💰` : winnings === 0 ? "Break even" : `${winnings} 💰`, inline: true },
            { name: "Multiplier", value: `${multiplier}x`, inline: true },
          )],
      });
    },
  },
];
