import {
  ChatInputCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} from "discord.js";
import { api } from "../api";
import type { GameServer } from "../types";

export const serverCommand = new ChatInputCommandBuilder()
  .setName("server")
  .setDescription("Manage game servers")
  .addSubcommands((sub) =>
    sub
      .setName("create")
      .setDescription("Create a new Minecraft server")
      .addStringOptions((opt) =>
        opt.setName("name").setDescription("Server name").setRequired(true)
      )
      .addStringOptions((opt) =>
        opt
          .setName("modpack")
          .setDescription("CurseForge modpack slug (e.g., all-the-mods-10)")
          .setRequired(true)
      )
  )
  .addSubcommands((sub) =>
    sub.setName("list").setDescription("List all servers")
  )
  .addSubcommands((sub) =>
    sub
      .setName("status")
      .setDescription("Get server status")
      .addStringOptions((opt) =>
        opt.setName("name").setDescription("Server name").setRequired(true)
      )
  )
  .addSubcommands((sub) =>
    sub.setName("start").setDescription("Start a server")
  )
  .addSubcommands((sub) =>
    sub.setName("stop").setDescription("Stop a server")
  )
  .addSubcommands((sub) =>
    sub
      .setName("delete")
      .setDescription("Delete a server")
      .addStringOptions((opt) =>
        opt.setName("name").setDescription("Server name").setRequired(true)
      )
  );

export async function handleServerCommand(
  interaction: ChatInputCommandInteraction
) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "create":
      return handleCreate(interaction);
    case "list":
      return handleList(interaction);
    case "status":
      return handleStatus(interaction);
    case "start":
      return handleStartWithMenu(interaction);
    case "stop":
      return handleStopWithMenu(interaction);
    case "delete":
      return handleDelete(interaction);
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const name = interaction.options.getString("name", true);
  const modpack = interaction.options.getString("modpack", true);

  const result = await api.createServer({
    name,
    modpack,
    createdBy: interaction.user.id,
  });

  if (!result.success) {
    await interaction.editReply(`Failed to create server: ${result.error}`);
    return;
  }

  const server = result.data!;
  const embed = new EmbedBuilder()
    .setTitle("Server Created")
    .setColor(0x57f287)
    .setDescription(`**${server.name}** is being provisioned.`)
    .addFields(
      { name: "Modpack", value: modpack, inline: true },
      { name: "Status", value: server.status, inline: true }
    )
    .setFooter({ text: "Use /server start to bring it online" });

  await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await api.listServers();

  if (!result.success) {
    await interaction.editReply(`Failed to list servers: ${result.error}`);
    return;
  }

  const servers = result.data!;

  if (servers.length === 0) {
    await interaction.editReply("No servers found. Create one with `/server create`");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Game Servers")
    .setColor(0x5865f2)
    .setDescription(
      servers
        .map((s) => `${statusEmoji(s.status)} **${s.name}** - ${s.modpack || "vanilla"} (${s.status})`)
        .join("\n")
    );

  await interaction.editReply({ embeds: [embed] });
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const name = interaction.options.getString("name", true);
  const result = await api.getServer(name);

  if (!result.success) {
    await interaction.editReply(`Failed to get status: ${result.error}`);
    return;
  }

  const server = result.data!;
  const embed = new EmbedBuilder()
    .setTitle(server.name)
    .setColor(statusColor(server.status))
    .addFields(
      { name: "Status", value: `${statusEmoji(server.status)} ${server.status}`, inline: true },
      { name: "Modpack", value: server.modpack || "vanilla", inline: true },
      { name: "Port", value: server.port?.toString() || "N/A", inline: true }
    );

  await interaction.editReply({ embeds: [embed] });
}

async function handleStartWithMenu(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await api.listServers();
  if (!result.success) {
    await interaction.editReply(`Failed to list servers: ${result.error}`);
    return;
  }

  const stopped = result.data!.filter((s) => s.status === "stopped");
  if (stopped.length === 0) {
    await interaction.editReply("No stopped servers to start.");
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("start-server")
    .setPlaceholder("Select a server to start")
    .addOptions(
      stopped.map((s) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(s.name)
          .setDescription(s.modpack || "vanilla")
          .setValue(s.name)
      )
    );

  const row = new ActionRowBuilder().addComponents(select);
  await interaction.editReply({ content: "Which server?", components: [row] });

  const message = await interaction.fetchReply();
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60_000,
  });

  collector.on("collect", async (menu) => {
    const serverName = menu.values[0]!;
    await menu.deferUpdate();

    const startResult = await api.startServer(serverName);
    if (!startResult.success) {
      await interaction.editReply({ content: `Failed to start: ${startResult.error}`, components: [] });
    } else {
      await interaction.editReply({ content: `Starting **${serverName}**...`, components: [] });
    }
    collector.stop("handled");
  });

  collector.on("end", async (_, reason) => {
    if (reason !== "handled") {
      await interaction.editReply({ content: "Timed out.", components: [] });
    }
  });
}

async function handleStopWithMenu(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await api.listServers();
  if (!result.success) {
    await interaction.editReply(`Failed to list servers: ${result.error}`);
    return;
  }

  const running = result.data!.filter((s) => s.status === "running");
  if (running.length === 0) {
    await interaction.editReply("No running servers to stop.");
    return;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("stop-server")
    .setPlaceholder("Select a server to stop")
    .addOptions(
      running.map((s) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(s.name)
          .setDescription(s.modpack || "vanilla")
          .setValue(s.name)
      )
    );

  const row = new ActionRowBuilder().addComponents(select);
  await interaction.editReply({ content: "Which server?", components: [row] });

  const message = await interaction.fetchReply();
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60_000,
  });

  collector.on("collect", async (menu) => {
    const serverName = menu.values[0]!;
    await menu.deferUpdate();

    const stopResult = await api.stopServer(serverName);
    if (!stopResult.success) {
      await interaction.editReply({ content: `Failed to stop: ${stopResult.error}`, components: [] });
    } else {
      await interaction.editReply({ content: `Stopping **${serverName}**...`, components: [] });
    }
    collector.stop("handled");
  });

  collector.on("end", async (_, reason) => {
    if (reason !== "handled") {
      await interaction.editReply({ content: "Timed out.", components: [] });
    }
  });
}

async function handleDelete(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const name = interaction.options.getString("name", true);
  const result = await api.deleteServer(name);

  if (!result.success) {
    await interaction.editReply(`Failed to delete server: ${result.error}`);
    return;
  }

  await interaction.editReply(`Deleted **${name}**.`);
}

function statusEmoji(status: GameServer["status"]): string {
  switch (status) {
    case "running": return "🟢";
    case "stopped": return "🔴";
    case "starting": return "🟡";
    case "stopping": return "🟠";
    case "error": return "❌";
    default: return "⚪";
  }
}

function statusColor(status: GameServer["status"]): number {
  switch (status) {
    case "running": return 0x57f287;
    case "stopped": return 0xed4245;
    case "starting": return 0xfee75c;
    case "stopping": return 0xe67e22;
    case "error": return 0xed4245;
    default: return 0x95a5a6;
  }
}
