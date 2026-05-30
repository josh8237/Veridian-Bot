import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "./types.js";
import { deployCommands } from "./deploy-commands.js";

// ─── Import all commands ──────────────────────────────────────────────────────
import { punishmentCommands } from "./commands/moderation/punishments.js";
import { advancedCommands } from "./commands/moderation/advanced.js";
import { casesCommands } from "./commands/moderation/cases.js";
import { reportsCommands } from "./commands/moderation/reports.js";
import { notesCommands } from "./commands/moderation/notes.js";
import { investigationCommands } from "./commands/moderation/investigation.js";
import { channelCommands } from "./commands/moderation/channel.js";
import { messagesCommands } from "./commands/moderation/messages.js";
import { rolesCommands } from "./commands/moderation/roles.js";
import { automodCommands } from "./commands/moderation/automod.js";
import { loggingCommands } from "./commands/moderation/logging.js";
import { staffCommands } from "./commands/moderation/staff.js";
import { quickGameCommands } from "./commands/minigames/quick.js";
import { multiplayerCommands } from "./commands/minigames/multiplayer.js";
import { quizCommands } from "./commands/minigames/quiz.js";
import { wordCommands } from "./commands/minigames/word.js";
import { casinoCommands } from "./commands/minigames/casino.js";
import { rpgCommands } from "./commands/minigames/rpg.js";
import { adventureCommands } from "./commands/minigames/adventure.js";
import { reactionCommands } from "./commands/minigames/reaction.js";
import { survivalCommands } from "./commands/minigames/survival.js";
import { funCommands } from "./commands/fun/fun.js";

// ─── Automod helpers ─────────────────────────────────────────────────────────
import { automodStore, nickLockStore, tempbanStore } from "./lib/storage.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN is not set.");
  process.exit(1);
}

// ─── Build command collection ─────────────────────────────────────────────────
const allCommands: Command[] = [
  ...punishmentCommands,
  ...advancedCommands,
  ...casesCommands,
  ...reportsCommands,
  ...notesCommands,
  ...investigationCommands,
  ...channelCommands,
  ...messagesCommands,
  ...rolesCommands,
  ...automodCommands,
  ...loggingCommands,
  ...staffCommands,
  ...quickGameCommands,
  ...multiplayerCommands,
  ...quizCommands,
  ...wordCommands,
  ...casinoCommands,
  ...rpgCommands,
  ...adventureCommands,
  ...reactionCommands,
  ...survivalCommands,
  ...funCommands,
];

const commands = new Collection<string, Command>();
for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

// ─── Create client ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ─── Ready event ──────────────────────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(`📊 Serving ${c.guilds.cache.size} guild(s)`);
  console.log(`🔧 ${commands.size} commands loaded`);

  c.user.setActivity("🛡️ Protecting servers | /help");

  // Deploy slash commands
  await deployCommands().catch(console.error);

  // Start tempban checker
  setInterval(checkTempbans, 60000);
  checkTempbans();
});

// ─── Interaction handler ──────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const reply = { content: "❌ An error occurred while executing that command.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(console.error);
    } else {
      await interaction.reply(reply).catch(console.error);
    }
  }
});

// ─── Automod: message handler ─────────────────────────────────────────────────
client.on(Events.MessageCreate, async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const settings = automodStore.get(msg.guild.id);
  if (!settings) return;

  const content = msg.content;
  let shouldDelete = false;
  let warnReason = "";

  // Spam detection (simplified - track via memory)
  if (settings.invites.enabled && /discord\.gg\/\w+/i.test(content)) {
    shouldDelete = true; warnReason = "Posting Discord invites";
  }
  if (settings.links.enabled && /https?:\/\/\S+/i.test(content)) {
    const url = content.match(/https?:\/\/([^\s/]+)/i)?.[1] ?? "";
    if (!settings.links.whitelist.some((w) => url.endsWith(w))) {
      shouldDelete = true; warnReason = "Posting links";
    }
  }
  if (settings.caps.enabled && content.length > 10) {
    const capsRatio = (content.match(/[A-Z]/g)?.length ?? 0) / content.replace(/\s/g, "").length * 100;
    if (capsRatio > settings.caps.threshold) { shouldDelete = true; warnReason = "Excessive caps"; }
  }
  if (settings.mentions.enabled) {
    const mentions = (content.match(/<@[!&]?\d+>/g) ?? []).length;
    if (mentions > settings.mentions.threshold) { shouldDelete = true; warnReason = "Mass mentions"; }
  }
  if (settings.profanity.enabled && settings.profanity.words.some((w) => content.toLowerCase().includes(w))) {
    shouldDelete = true; warnReason = "Profanity";
  }

  if (shouldDelete) {
    await msg.delete().catch(() => null);
    const warn = await msg.channel.send(`⚠️ ${msg.author.toString()}, your message was removed: **${warnReason}**.`).catch(() => null);
    if (warn) setTimeout(() => warn.delete().catch(() => null), 5000);
  }
});

// ─── Nickname lock handler ────────────────────────────────────────────────────
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const lockedNick = nickLockStore.get(`${newMember.guild.id}:${newMember.id}`);
  if (lockedNick && newMember.nickname !== lockedNick) {
    await newMember.setNickname(lockedNick).catch(() => null);
  }
});

// ─── Tempban checker ──────────────────────────────────────────────────────────
async function checkTempbans() {
  const now = Date.now();
  for (const [key, ban] of tempbanStore.entries()) {
    if (ban.expiresAt <= now) {
      try {
        const guild = client.guilds.cache.get(ban.guildId);
        if (guild) {
          await guild.bans.remove(ban.userId, "Temporary ban expired").catch(() => null);
          console.log(`Unbanned ${ban.userId} from ${ban.guildId} (tempban expired)`);
        }
        tempbanStore.delete(key);
      } catch (err) {
        console.error("Error processing tempban expiry:", err);
      }
    }
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
console.log("🚀 Starting Discord bot...");
client.login(token).catch((err) => {
  console.error("Failed to login:", err);
  process.exit(1);
});
