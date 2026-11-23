const form = document.querySelector("#chatForm");
const input = document.querySelector("#messageInput");
const messagesEl = document.querySelector("#messages");
const welcome = document.querySelector("#welcome");
const sendButton = document.querySelector("#sendButton");
const toast = document.querySelector("#toast");
const historyKey = "nexa-chat-v1";
const chatsKey = "nexa-chats-v1";
let messages = [];
let chats = [];
let activeChatId = null;
let busy = false;
const localPreferenceKey = "nexa-local-ai-enabled";
let localMode = localStorage.getItem(localPreferenceKey) === "true";

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function saveMessages() {
  try { localStorage.setItem(historyKey, JSON.stringify(messages.slice(-100))); } catch {}
  if (!messages.length) return;
  if (!activeChatId) activeChatId = String(Date.now());
  const firstUser = messages.find(message => message.role === "user");
  const title = firstUser ? firstUser.content.slice(0, 42) + (firstUser.content.length > 42 ? "…" : "") : "New chat";
  const existing = chats.find(chat => chat.id === activeChatId);
  const record = { id: activeChatId, title, updatedAt: Date.now(), messages: messages.slice(-100) };
  if (existing) Object.assign(existing, record);
  else chats.unshift(record);
  chats.sort((a, b) => b.updatedAt - a.updatedAt);
  chats = chats.slice(0, 50);
  try { localStorage.setItem(chatsKey, JSON.stringify(chats)); } catch {}
  renderChatHistory();
}
function renderChatHistory() {
  const list = document.querySelector("#chatHistoryList");
  if (!list) return;
  list.replaceChildren();
  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No saved chats yet";
    list.append(empty);
    return;
  }
  chats.forEach(chat => {
    const button = document.createElement("button");
    button.className = "history-chat" + (chat.id === activeChatId ? " active" : "");
    button.textContent = chat.title || "Conversation";
    button.title = chat.title || "Conversation";
    button.addEventListener("click", () => {
      activeChatId = chat.id;
      messages = chat.messages.slice();
      render();
      renderChatHistory();
      document.querySelector("#sidebar").classList.remove("open");
    });
    list.append(button);
  });
}
function addMessage(role, content) {
  const item = document.createElement("div");
  item.className = "message " + role;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "assistant" ? "N" : "Y";
  const body = document.createElement("div");
  body.className = "message-content";
  body.textContent = content;
  item.append(avatar, body);
  messagesEl.append(item);
  return body;
}
function render() {
  messagesEl.replaceChildren();
  welcome.hidden = messages.length > 0;
  messages.forEach(m => addMessage(m.role, m.content));
}
function setBusy(value) {
  busy = value;
  sendButton.disabled = value;
  sendButton.textContent = value ? "…" : "↑";
}
async function sendMessage(text) {
  const content = text.trim();
  if (!content || busy) return;
  messages.push({ role: "user", content });
  addMessage("user", content);
  welcome.hidden = true;
  input.value = "";
  input.style.height = "auto";
  saveMessages();
  const thinking = addMessage("assistant", "NEXA is thinking…");
  thinking.classList.add("typing");
  setBusy(true);
  try {
    if (localMode) {
      if (!window.NEXALocalAI) throw new Error("Local AI is still starting. Refresh once and try again.");
      if (!window.NEXALocalAI.isReady()) {
        notify("Waking up local AI…");
        await window.NEXALocalAI.load();
      }
      const reply = await window.NEXALocalAI.reply(messages.slice(-20));
      messages.push({ role: "assistant", content: reply });
      saveMessages();
      render();
      return;
    }
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-20) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    messages.push({ role: "assistant", content: data.reply });
    saveMessages();
    render();
  } catch (error) {
    thinking.textContent = error.message || "NEXA couldn't respond. Try again.";
    thinking.classList.remove("typing");
    notify(error.message || "Connection error");
  } finally {
    setBusy(false);
    input.focus();
  }
}
form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 180) + "px";
});
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
function newChat() {
  if (messages.length) saveMessages();
  messages = [];
  activeChatId = null;
  try { localStorage.removeItem(historyKey); } catch {}
  render();
  renderChatHistory();
  input.focus();
}
document.querySelector("#newChat").addEventListener("click", newChat);
document.querySelector("#clearChat").addEventListener("click", newChat);
document.querySelector("#mobileMenu").addEventListener("click", () => {
  document.querySelector("#sidebar").classList.toggle("open");
});
document.querySelector("#historyButton").addEventListener("click", () => {
  document.querySelector("#chatHistoryList").classList.toggle("history-hidden");
});
try {
  const savedChats = JSON.parse(localStorage.getItem(chatsKey) || "[]");
  if (Array.isArray(savedChats)) chats = savedChats.filter(chat => chat && typeof chat.id === "string" && Array.isArray(chat.messages)).slice(0, 50);
  if (!chats.length) {
    const oldMessages = JSON.parse(localStorage.getItem(historyKey) || "[]");
    if (Array.isArray(oldMessages) && oldMessages.length) {
      messages = oldMessages.filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-100);
      if (messages.length) saveMessages();
    }
  } else {
    const latest = chats[0];
    activeChatId = latest.id;
    messages = latest.messages.slice(-100);
  }
} catch { chats = []; messages = []; }
render();
renderChatHistory();

// Installable app support (PWA).
let installPrompt = null;
const installButton = document.querySelector("#installApp");
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    notify("Open your browser menu and choose Install app or Add to Home screen.");
    return;
  }
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
  notify("NEXA AI installed.");
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Optional on-device AI. The model is downloaded only after the user chooses to enable it.
const localAiButton = document.querySelector("#localAiButton");
localAiButton.addEventListener("click", async () => {
  if (localMode) {
    localMode = false;
    localStorage.setItem(localPreferenceKey, "false");
    localAiButton.textContent = "Local AI";
    notify("Cloud mode selected.");
    return;
  }
  if (!window.NEXALocalAI) {
    notify("Local AI is still starting. Try again in a moment.");
    return;
  }
  const accepted = window.confirm("Enable on-device AI? This downloads a model of about 1 GB to your browser. It may use significant memory and battery. Continue?");
  if (!accepted) return;
  localAiButton.disabled = true;
  localAiButton.textContent = "Loading…";
  try {
    await window.NEXALocalAI.load(progress => {
      if (progress?.text) notify(progress.text);
    });
    localMode = true;
    localStorage.setItem(localPreferenceKey, "true");
    localAiButton.textContent = "Local ON";
    notify("Local AI is ready. Your messages will run on this device.");
  } catch (error) {
    localAiButton.textContent = "Local AI";
    notify(error.message || "Could not start local AI. Cloud mode is unchanged.");
  } finally {
    localAiButton.disabled = false;
  }
});


// Restore the user's Local AI choice after refresh; never silently fall back to paid cloud mode.
if (localMode) {
  localAiButton.disabled = true;
  localAiButton.textContent = "Starting local…";
  window.addEventListener("load", async () => {
    try {
      if (!window.NEXALocalAI) throw new Error("Local AI module did not load.");
      await window.NEXALocalAI.load();
      localAiButton.textContent = "Local ON";
      notify("Local AI is ready on this device.");
    } catch (error) {
      localMode = false;
      localStorage.setItem(localPreferenceKey, "false");
      localAiButton.textContent = "Local AI";
      notify(error.message || "Local AI could not restart. Tap Local AI to try again.");
    } finally {
      localAiButton.disabled = false;
    }
  }, { once: true });
}
