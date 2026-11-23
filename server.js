import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "NEXA AI" }));

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Send at least one message." });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "NEXA AI is not configured. Add OPENAI_API_KEY to your hosting environment." });
    }
    const safeMessages = messages
      .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content.slice(0, 12000) }));
    if (!safeMessages.length || safeMessages.at(-1).role !== "user") {
      return res.status(400).json({ error: "Your latest message must be from the user." });
    }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: "You are NEXA, a capable, friendly, practical AI assistant. Be clear, accurate, and conversational. Admit uncertainty instead of inventing facts. Help with planning, learning, writing, coding, and everyday tasks. Do not claim to perform actions outside this chat.",
      input: safeMessages.map(m => ({ role: m.role, content: m.content }))
    });
    res.json({ reply: response.output_text || "I couldn't generate a response. Try again." });
  } catch (error) {
    console.error("NEXA chat error:", { status: error?.status, code: error?.code, type: error?.type });
    const status = error?.status === 401 ? 401 : 500;
    res.status(status).json({
      error: status === 401 ? "The API key was rejected. Check your server environment settings." : "NEXA couldn't reach the AI service. Please try again."
    });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log("NEXA AI running on port " + PORT));
