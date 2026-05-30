import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import type { Command } from "../../types.js";
import { COLORS, randomInt, progressBar } from "../../lib/utils.js";
import { getOrCreateRpgProfile, addXp, addGold, rpgStore } from "../../lib/storage.js";

const SHOP_ITEMS = [
  { id: "iron_sword", name: "Iron Sword", type: "weapon" as const, price: 150, stats: { attack: 5 } },
  { id: "steel_sword", name: "Steel Sword", type: "weapon" as const, price: 400, stats: { attack: 12 } },
  { id: "iron_armor", name: "Iron Armor", type: "armor" as const, price: 200, stats: { defense: 8 } },
  { id: "health_potion", name: "Health Potion", type: "potion" as const, price: 50, stats: { hp: 50 } },
  { id: "mega_potion", name: "Mega Potion", type: "potion" as const, price: 150, stats: { hp: 150 } },
  { id: "lucky_charm", name: "Lucky Charm", type: "misc" as const, price: 300, stats: {} },
];

const CRAFT_RECIPES = [
  { id: "steel_blade", name: "Steel Blade", type: "weapon" as const, ingredients: ["iron_sword", "lucky_charm"], stats: { attack: 20 } },
];

const PET_TYPES = ["🐉 Dragon", "🦊 Fox", "🐺 Wolf", "🐉 Phoenix", "🦅 Eagle", "🐱 Cat"];

export const rpgCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("profile")
      .setDescription("View your RPG profile")
      .addUserOption((o) => o.setName("user").setDescription("User (defaults to yourself)")),
    async execute(interaction: ChatInputCommandInteraction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const p = getOrCreateRpgProfile(user.id, interaction.guildId!);
      const xpNeeded = p.level * 100;
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.gold)
          .setTitle(`⚔️ ${user.tag}'s Profile`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: "Level", value: `**${p.level}**`, inline: true },
            { name: "XP", value: `${p.xp}/${xpNeeded}\n${progressBar(p.xp, xpNeeded)}`, inline: true },
            { name: "Gold", value: `💰 ${p.gold}`, inline: true },
            { name: "HP", value: `❤️ ${p.hp}/${p.maxHp}\n${progressBar(p.hp, p.maxHp)}`, inline: true },
            { name: "Attack", value: `⚔️ ${p.attack}`, inline: true },
            { name: "Defense", value: `🛡️ ${p.defense}`, inline: true },
            { name: "W/L", value: `${p.wins}W/${p.losses}L`, inline: true },
            { name: "Equipment", value: `Weapon: ${p.equipment.weapon ?? "None"}\nArmor: ${p.equipment.armor ?? "None"}`, inline: true },
            { name: "Pets", value: p.pets.length ? p.pets.map((pet) => `${pet.type} Lv.${pet.level}`).join(", ") : "No pets", inline: true },
          )],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("inventory")
      .setDescription("View your inventory"),
    async execute(interaction: ChatInputCommandInteraction) {
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      if (!p.inventory.length) {
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle("🎒 Inventory").setDescription("Your inventory is empty!")] });
      }
      const items = p.inventory.map((item) => `**${item.name}** x${item.quantity} (${item.type})`).join("\n");
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.gold)
          .setTitle("🎒 Inventory")
          .setDescription(items)
          .setFooter({ text: `${p.inventory.length} unique items | 💰 ${p.gold} gold` })],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("shop")
      .setDescription("Browse the item shop"),
    async execute(interaction: ChatInputCommandInteraction) {
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      const items = SHOP_ITEMS.map((item) => {
        const statsStr = Object.entries(item.stats).map(([k, v]) => `+${v} ${k}`).join(", ");
        return `**${item.name}** — 💰 ${item.price}\n└ ${item.type}${statsStr ? ` | ${statsStr}` : ""}`;
      }).join("\n\n");
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLORS.gold)
          .setTitle("🛒 Item Shop")
          .setDescription(items + `\n\n*Use \`/equip\` to equip weapons/armor, \`/craft\` to craft items*`)
          .setFooter({ text: `Your gold: 💰 ${p.gold} | Use /buy [item] to purchase` })],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("equip")
      .setDescription("Equip a weapon or armor from your inventory")
      .addStringOption((o) => o.setName("item").setDescription("Item name to equip").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const itemName = interaction.options.getString("item", true).toLowerCase();
      const key = `${interaction.guildId!}:${interaction.user.id}`;
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      const item = p.inventory.find((i) => i.name.toLowerCase().includes(itemName));
      if (!item) return interaction.reply({ content: `❌ You don't have that item!`, ephemeral: true });
      if (!["weapon", "armor"].includes(item.type)) return interaction.reply({ content: `❌ You can only equip weapons and armor!`, ephemeral: true });
      if (item.type === "weapon") {
        p.equipment.weapon = item.name;
        p.attack += item.stats?.attack ?? 0;
      } else {
        p.equipment.armor = item.name;
        p.defense += item.stats?.defense ?? 0;
      }
      rpgStore.set(key, p);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("⚔️ Item Equipped").setDescription(`Equipped **${item.name}**!`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("craft")
      .setDescription("Craft an item from your inventory")
      .addStringOption((o) => o.setName("item").setDescription("Item to craft").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const itemName = interaction.options.getString("item", true).toLowerCase();
      const recipe = CRAFT_RECIPES.find((r) => r.name.toLowerCase().includes(itemName));
      if (!recipe) return interaction.reply({ content: `❌ No recipe for that item! Available: ${CRAFT_RECIPES.map((r) => r.name).join(", ")}`, ephemeral: true });
      const key = `${interaction.guildId!}:${interaction.user.id}`;
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      for (const ingId of recipe.ingredients) {
        const idx = p.inventory.findIndex((i) => i.id === ingId);
        if (idx === -1) return interaction.reply({ content: `❌ Missing ingredient: ${ingId.replace(/_/g, " ")}`, ephemeral: true });
        p.inventory[idx].quantity--;
        if (p.inventory[idx].quantity <= 0) p.inventory.splice(idx, 1);
      }
      const existing = p.inventory.find((i) => i.id === recipe.id);
      if (existing) existing.quantity++;
      else p.inventory.push({ id: recipe.id, name: recipe.name, type: recipe.type, quantity: 1, stats: recipe.stats });
      rpgStore.set(key, p);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("🔨 Item Crafted!").setDescription(`Crafted **${recipe.name}**!`)] });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("pets")
      .setDescription("View or adopt a pet")
      .addStringOption((o) => o.setName("action").setDescription("Action").addChoices({ name: "View", value: "view" }, { name: "Adopt", value: "adopt" }).setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const action = interaction.options.getString("action", true);
      const key = `${interaction.guildId!}:${interaction.user.id}`;
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      if (action === "view") {
        if (!p.pets.length) return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.info).setTitle("🐾 Pets").setDescription("You have no pets! Use `/pets adopt` to get one for 200 💰.")] });
        const list = p.pets.map((pet) => `${pet.type} — Lv.${pet.level} (${pet.xp}/${pet.level * 50} XP)`).join("\n");
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle("🐾 Your Pets").setDescription(list)] });
      } else {
        if (p.gold < 200) return interaction.reply({ content: "❌ Adopting a pet costs 200 💰!", ephemeral: true });
        if (p.pets.length >= 3) return interaction.reply({ content: "❌ You can only have up to 3 pets!", ephemeral: true });
        const petType = randomItem(PET_TYPES);
        p.pets.push({ name: petType.split(" ")[1], type: petType, level: 1, xp: 0 });
        p.gold -= 200;
        rpgStore.set(key, p);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("🐾 Pet Adopted!").setDescription(`You adopted a **${petType}**!`)] });
      }
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("fight")
      .setDescription("Challenge another user to a fight")
      .addUserOption((o) => o.setName("opponent").setDescription("User to fight").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const opponent = interaction.options.getUser("opponent", true);
      if (opponent.bot || opponent.id === interaction.user.id) return interaction.reply({ content: "Invalid opponent!", ephemeral: true });
      const p1 = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      const p2 = getOrCreateRpgProfile(opponent.id, interaction.guildId!);
      let hp1 = p1.hp, hp2 = p2.hp;
      const log: string[] = [];
      let rounds = 0;
      while (hp1 > 0 && hp2 > 0 && rounds < 20) {
        rounds++;
        const dmg1 = Math.max(1, p1.attack - p2.defense + randomInt(-3, 3));
        const dmg2 = Math.max(1, p2.attack - p1.defense + randomInt(-3, 3));
        hp1 -= dmg2; hp2 -= dmg1;
        if (rounds <= 3) log.push(`Round ${rounds}: You deal **${dmg1}**, take **${dmg2}**`);
      }
      const won = hp1 > hp2;
      const winner = won ? interaction.user : opponent;
      const loser = won ? opponent : interaction.user;
      const xpGain = randomInt(20, 50);
      const goldGain = randomInt(10, 30);
      addXp(winner.id, interaction.guildId!, xpGain);
      addGold(winner.id, interaction.guildId!, goldGain);
      if (won) { p1.wins++; p2.losses++; } else { p1.losses++; p2.wins++; }
      rpgStore.set(`${interaction.guildId!}:${interaction.user.id}`, p1);
      rpgStore.set(`${interaction.guildId!}:${opponent.id}`, p2);
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor(won ? COLORS.success : COLORS.error)
          .setTitle(`⚔️ ${interaction.user.tag} vs ${opponent.tag}`)
          .setDescription(log.join("\n") + `\n...\n\n🏆 **${winner.tag} wins!**`)
          .addFields({ name: "Rewards", value: `${winner.tag} gains **+${xpGain} XP** and **+${goldGain} 💰**` })],
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("trade")
      .setDescription("Trade an item with another user")
      .addUserOption((o) => o.setName("user").setDescription("User to trade with").setRequired(true))
      .addStringOption((o) => o.setName("item").setDescription("Item to trade").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const target = interaction.options.getUser("user", true);
      const itemName = interaction.options.getString("item", true).toLowerCase();
      const key = `${interaction.guildId!}:${interaction.user.id}`;
      const p = getOrCreateRpgProfile(interaction.user.id, interaction.guildId!);
      const itemIdx = p.inventory.findIndex((i) => i.name.toLowerCase().includes(itemName));
      if (itemIdx === -1) return interaction.reply({ content: "❌ You don't have that item!", ephemeral: true });
      const item = p.inventory[itemIdx];
      p.inventory[itemIdx].quantity--;
      if (p.inventory[itemIdx].quantity <= 0) p.inventory.splice(itemIdx, 1);
      rpgStore.set(key, p);
      const targetKey = `${interaction.guildId!}:${target.id}`;
      const tp = getOrCreateRpgProfile(target.id, interaction.guildId!);
      const existing = tp.inventory.find((i) => i.id === item.id);
      if (existing) existing.quantity++;
      else tp.inventory.push({ ...item, quantity: 1 });
      rpgStore.set(targetKey, tp);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.success).setTitle("🤝 Trade Complete").setDescription(`Traded **${item.name}** to ${target.tag}!`)] });
    },
  },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
