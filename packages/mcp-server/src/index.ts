import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { type Request, type Response } from "express";

import { AuthError, authenticateRequest, type AuthContext } from "./auth.js";
import {
  handleNotesByTag,
  handleNotesCreate,
  handleNotesDelete,
  handleNotesGet,
  handleNotesList,
  handleNotesUpdate,
  handleTagsList,
  notesByTagInputSchema,
  notesCreateInputSchema,
  notesDeleteInputSchema,
  notesGetInputSchema,
  notesListInputSchema,
  notesUpdateInputSchema,
  tagsListInputSchema,
} from "./tools.js";

const PORT = Number(process.env.MCP_PORT ?? 3001);
const HOST = process.env.MCP_HOST ?? "0.0.0.0";
const KEEPALIVE_INTERVAL_MS = 30_000;

type Session = {
  auth: AuthContext;
  transport: SSEServerTransport;
  sseRes: Response;
  keepalive: NodeJS.Timeout;
};

const sessions = new Map<string, Session>();

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

function stopKeepalive(session: Session): void {
  clearInterval(session.keepalive);
}

function startKeepalive(session: Session): void {
  session.keepalive = setInterval(() => {
    try {
      // SSE comment line — keeps proxies/Cloud Run from idling the connection
      // without sending a malformed JSON-RPC notification to the client.
      session.sseRes.write(": keepalive\n\n");
    } catch {
      stopKeepalive(session);
    }
  }, KEEPALIVE_INTERVAL_MS);
  session.keepalive.unref?.();
}

function buildServer(auth: AuthContext): McpServer {
  const server = new McpServer(
    {
      name: "notes-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.registerTool(
    "notes_list",
    {
      description:
        "List the authenticated user's notes. Optionally filter by free-text search and/or a tag id.",
      inputSchema: notesListInputSchema,
    },
    async (input) => {
      const data = await handleNotesList(auth, input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "notes_get",
    {
      description: "Fetch a single note by id.",
      inputSchema: notesGetInputSchema,
    },
    async (input) => {
      const data = await handleNotesGet(auth, input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "notes_create",
    {
      description:
        "Create a new note for the authenticated user. Requires a read_write API key.",
      inputSchema: notesCreateInputSchema,
    },
    async (input) => {
      const data = await handleNotesCreate(auth, input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "notes_update",
    {
      description:
        "Update an existing note (title, content, contentText, tagIds). Requires a read_write API key.",
      inputSchema: notesUpdateInputSchema,
    },
    async (input) => {
      const data = await handleNotesUpdate(auth, input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "notes_delete",
    {
      description: "Delete a note by id. Requires a read_write API key.",
      inputSchema: notesDeleteInputSchema,
    },
    async (input) => {
      const data = await handleNotesDelete(auth, input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "tags_list",
    {
      description: "List the authenticated user's tags.",
      inputSchema: tagsListInputSchema,
    },
    async (input) => {
      const data = await handleTagsList(auth, input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    "notes_by_tag",
    {
      description: "List notes that are tagged with the given tagId.",
      inputSchema: notesByTagInputSchema,
    },
    async (input) => {
      const data = await handleNotesByTag(auth, input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  return server;
}

function sendAuthError(err: unknown, res: Response): void {
  if (err instanceof AuthError) {
    res.status(err.status).send(err.message);
    return;
  }
  console.error("Unexpected error during auth:", err);
  if (!res.headersSent) {
    res.status(500).send("Internal server error");
  }
}

app.get("/sse", async (req: Request, res: Response) => {
  let auth: AuthContext;
  try {
    auth = await authenticateRequest(req);
  } catch (err) {
    sendAuthError(err, res);
    return;
  }

  const transport = new SSEServerTransport("/messages", res);
  const session: Session = {
    auth,
    transport,
    sseRes: res,
    keepalive: setInterval(() => undefined, 0),
  };
  stopKeepalive(session);

  sessions.set(transport.sessionId, session);

  transport.onclose = () => {
    sessions.delete(transport.sessionId);
    stopKeepalive(session);
  };

  try {
    const server = buildServer(auth);
    await server.connect(transport);
    startKeepalive(session);
    console.log(
      `SSE connected (session=${transport.sessionId}, user=${auth.userId}, scope=${auth.scope})`,
    );
  } catch (err) {
    console.error("Failed to connect MCP server:", err);
    sessions.delete(transport.sessionId);
    if (!res.headersSent) {
      res.status(500).send("Failed to initialize MCP server");
    }
  }
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    res.status(400).send("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).send("Unknown or expired session");
    return;
  }

  try {
    await authenticateRequest(req);
  } catch (err) {
    sendAuthError(err, res);
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res, req.body);
  } catch (err) {
    console.error("handlePostMessage failed:", err);
    if (!res.headersSent) {
      res.status(500).send("Internal server error");
    }
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`notes-mcp listening on http://${HOST}:${PORT}`);
});

function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down...`);
  for (const session of sessions.values()) {
    stopKeepalive(session);
  }
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));