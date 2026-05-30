import { REST, Routes } from "discord.js";
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

const allCommands = [
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

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables.");
  process.exit(1);
}

const rest = new REST().setToken(token);

export async function deployCommands() {
  try {
    console.log(`Deploying ${allCommands.length} slash commands globally...`);
    const data = await rest.put(Routes.applicationCommands(clientId!), {
      body: allCommands.map((cmd) => cmd.data.toJSON()),
    }) as unknown[];
    console.log(`✅ Successfully deployed ${data.length} commands.`);
  } catch (err) {
    console.error("Failed to deploy commands:", err);
    throw err;
  }
}

// Run directly if called as a script
deployCommands().catch(console.error);
