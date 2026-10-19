import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { getOrganizationContext } from "../clerkAuth";
import { requireFeature } from "../feature-gates";

const router = Router();

// Initialize OpenAI client using Replit AI Integrations
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// POST /api/chat/completions
// Send a chat message and get AI response with streaming
// Requires aiAudits feature (Enterprise-only)
router.post("/completions", requireFeature("aiAudits"), async (req: Request, res: Response) => {
  try {
    const orgContext = await getOrganizationContext(req);
    if (!orgContext) {
      return res.status(401).json({ error: "Organization context not found" });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array required" });
    }

    // Set up SSE headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    // Flush headers immediately to prevent hanging with compression/proxies
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // System prompt tailored for DoorSurvey Pro
    const systemPrompt: ChatMessage = {
      role: "system",
      content: `You are an AI assistant for DoorSurvey Pro, a commercial door industry SaaS platform. You help users with:
- Door surveys and project management
- Building code compliance (ADA, IBC, NFPA, FGI)
- Hardware selection and specifications
- Cost estimation and quotes
- AR-powered measurements
- Project workflows and best practices

Provide clear, concise, and professional responses. When discussing building codes or technical specifications, be accurate and cite relevant standards when possible.`,
    };

    const allMessages = [systemPrompt, ...messages];

    // Stream the response
    const stream = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: allMessages,
      max_completion_tokens: 8192,
      stream: true,
    });

    // Send chunks as SSE
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Error in chat completion:", error);
    
    // If headers already sent (streaming started), we can't send JSON error
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message || "Failed to process chat" });
    }
  }
});

export default router;
