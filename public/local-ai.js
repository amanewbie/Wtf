// NEXA on-device language model. No API key is used for local replies.
const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
let engine = null;
let loading = null;

async function load(onProgress = () => {}) {
  if (engine) return engine;
  if (loading) return loading;
  loading = (async () => {
    if (!("gpu" in navigator)) {
      throw new Error("This browser does not support WebGPU. Local AI is unavailable here; cloud mode remains available.");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("This device could not start WebGPU. Try an updated Chrome browser; cloud mode remains available.");
    }
    onProgress({ text: "Preparing local AI engine…" });
    const { CreateMLCEngine } = await import("https://esm.run/@mlc-ai/web-llm");
    engine = await CreateMLCEngine(MODEL_ID, {
      initProgressCallback: report => onProgress(report)
    });
    return engine;
  })();
  try {
    return await loading;
  } catch (error) {
    loading = null;
    throw error;
  }
}

async function reply(messages) {
  if (!engine) throw new Error("Local AI has not finished loading.");
  const result = await engine.chat.completions.create({
    messages: messages.map(message => ({
      role: message.role,
      content: message.content
    })),
    temperature: 0.7,
    max_tokens: 512
  });
  return result.choices?.[0]?.message?.content?.trim() || "I couldn't generate a reply. Try again.";
}

window.NEXALocalAI = {
  load,
  reply,
  isReady: () => Boolean(engine)
};
