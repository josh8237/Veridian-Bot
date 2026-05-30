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
import { COLORS } from "../../lib/utils.js";

// ──────────────────────────────── TIC-TAC-TOE ────────────────────────────────
function tttBoard(cells: string[]): string {
  const rows = [];
  for (let i = 0; i < 9; i += 3) rows.push(cells.slice(i, i + 3).join("│"));
  return rows.join("\n──┼──┼──\n");
}

function tttWinner(cells: string[]): string | null {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) if (cells[a] !== "⬜" && cells[a] === cells[b] && cells[b] === cells[c]) return cells[a];
  return null;
}

function makeTttRows(cells: string[], disabled = false) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const taken = cells[i] !== "⬜";
      row.addComponents(new ButtonBuilder().setCustomId(`ttt_${i}`).setLabel(cells[i] === "⬜" ? " " : cells[i]).setStyle(cells[i] === "❌" ? ButtonStyle.Danger : cells[i] === "⭕" ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled || taken));
    }
    rows.push(row);
  }
  return rows;
}

// ──────────────────────────────── CONNECT 4 ──────────────────────────────────
const C4_ROWS = 6, C4_COLS = 7;
const C4_TOKENS = ["🔴", "🟡"];

function c4Drop(board: string[][], col: number, token: string): number {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r][col] === "⬛") { board[r][col] = token; return r; }
  }
  return -1;
}

function c4CheckWin(board: string[][], token: string): boolean {
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (const [dr,dc] of dirs) {
        let count = 0;
        for (let k = 0; k < 4; k++) {
          const nr = r + dr*k, nc = c + dc*k;
          if (nr >= 0 && nr < C4_ROWS && nc >= 0 && nc < C4_COLS && board[nr][nc] === token) count++;
          else break;
        }
        if (count === 4) return true;
      }
    }
  }
  return false;
}

function c4Render(board: string[][]): string {
  return board.map((r) => r.join("")).join("\n") + "\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣";
}

function makeC4Row(disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...Array.from({ length: 7 }, (_, i) =>
      new ButtonBuilder().setCustomId(`c4_${i}`).setLabel((i + 1).toString()).setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    )
  );
}

export const multiplayerCommands: Command[] = [
  {
    data: new SlashCommandBuilder()
      .setName("tictactoe")
      .setDescription("Play Tic-Tac-Toe against another user")
      .addUserOption((o) => o.setName("opponent").setDescription("Opponent").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const opponent = interaction.options.getUser("opponent", true);
      if (opponent.bot || opponent.id === interaction.user.id) {
        await interaction.reply({ content: "Invalid opponent.", ephemeral: true });
        return;
      }
      const players = [interaction.user, opponent];
      let turn = 0;
      const cells = Array(9).fill("⬜");
      const symbols = ["❌", "⭕"];

      const embed = () => new EmbedBuilder().setColor(COLORS.blue)
        .setTitle("❌⭕ Tic-Tac-Toe")
        .setDescription(`${players[turn].toString()}'s turn (${symbols[turn]})\n\n${tttBoard(cells)}`);

      const msg = await interaction.reply({ embeds: [embed()], components: makeTttRows(cells), fetchReply: true });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== players[turn].id) { await btn.reply({ content: "It's not your turn!", ephemeral: true }); return; }
        const idx = parseInt(btn.customId.split("_")[1]);
        cells[idx] = symbols[turn];
        const winner = tttWinner(cells);
        const isDraw = !winner && cells.every((c) => c !== "⬜");
        if (winner || isDraw) {
          collector.stop();
          await btn.update({
            embeds: [new EmbedBuilder().setColor(winner ? COLORS.success : COLORS.warning)
              .setTitle(winner ? `🎉 ${players[turn].tag} Wins!` : "🤝 Draw!")
              .setDescription(tttBoard(cells))],
            components: makeTttRows(cells, true),
          });
        } else {
          turn = 1 - turn;
          await btn.update({ embeds: [embed()], components: makeTttRows(cells) });
        }
      });

      collector.on("end", async (_col, reason) => {
        if (reason === "time") await msg.edit({ components: makeTttRows(cells, true) }).catch(() => null);
      });
    },
  },
  {
    data: new SlashCommandBuilder()
      .setName("connect4")
      .setDescription("Play Connect 4 against another user")
      .addUserOption((o) => o.setName("opponent").setDescription("Opponent").setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
      const opponent = interaction.options.getUser("opponent", true);
      if (opponent.bot || opponent.id === interaction.user.id) {
        await interaction.reply({ content: "Invalid opponent.", ephemeral: true });
        return;
      }
      const players = [interaction.user, opponent];
      let turn = 0;
      const board: string[][] = Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill("⬛"));

      const embed = () => new EmbedBuilder().setColor(turn === 0 ? COLORS.error : COLORS.warning)
        .setTitle("🔴🟡 Connect 4")
        .setDescription(`${players[turn].toString()}'s turn (${C4_TOKENS[turn]})\n\n${c4Render(board)}`);

      const msg = await interaction.reply({ embeds: [embed()], components: [makeC4Row()], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 180000 });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== players[turn].id) { await btn.reply({ content: "It's not your turn!", ephemeral: true }); return; }
        const col = parseInt(btn.customId.split("_")[1]);
        const dropped = c4Drop(board, col, C4_TOKENS[turn]);
        if (dropped === -1) { await btn.reply({ content: "Column is full!", ephemeral: true }); return; }
        const won = c4CheckWin(board, C4_TOKENS[turn]);
        const isDraw = !won && board[0].every((c) => c !== "⬛");
        if (won || isDraw) {
          collector.stop();
          await btn.update({
            embeds: [new EmbedBuilder().setColor(won ? COLORS.success : COLORS.warning)
              .setTitle(won ? `🎉 ${players[turn].tag} Wins!` : "🤝 Draw!")
              .setDescription(c4Render(board))],
            components: [makeC4Row(true)],
          });
        } else {
          turn = 1 - turn;
          await btn.update({ embeds: [embed()], components: [makeC4Row()] });
        }
      });

      collector.on("end", async (_col, reason) => {
        if (reason === "time") await msg.edit({ components: [makeC4Row(true)] }).catch(() => null);
      });
    },
  },
];
