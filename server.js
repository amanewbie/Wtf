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
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ error: "NEXA AI is not configured. Add GROQ_API_KEY to your hosting environment." });
    }

    const safeMessages = messages
      .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content.slice(0, 12000) }));

    if (!safeMessages.length || safeMessages.at(-1).role !== "user") {
      return res.status(400).json({ error: "Your latest message must be from the user." });
    }

    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const completion = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: "You are NEXA, a capable, friendly, practical AI assistant. Be clear, accurate, and conversational. Admit uncertainty instead of inventing facts. Help with planning, learning, writing, coding, and everyday tasks. Do not claim to perform actions outside this chat."
        },
        ...safeMessages
      ],
      temperature: 0.7,
      max_tokens: 1200
    });

    res.json({
      reply: completion.choices?.[0]?.message?.content || "I couldn't generate a response. Try again."
    });
  } catch (error) {
    // Log only safe diagnostic fields; never print request headers or API credentials.
    console.error("NEXA chat error:", {
      status: error?.status,
      code: error?.code,
      type: error?.type
    });

    const status = error?.status === 401 ? 401 : error?.status === 429 ? 429 : 500;
    let message = "NEXA couldn't reach the AI service. Please try again.";
    if (status === 401) message = "The Groq API key was rejected. Check GROQ_API_KEY in your hosting environment.";
    if (status === 429) message = "NEXA has reached the free API usage limit. Please wait and try again later.";
    res.status(status).json({ error: message });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log("NEXA AI running on port " + PORT));
