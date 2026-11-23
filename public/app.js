const form = document.querySelector("#chatForm");
const input = document.querySelector("#messageInput");
const messagesEl = document.querySelector("#messages");
const welcome = document.querySelector("#welcome");
const sendButton = document.querySelector("#sendButton");
const toast = document.querySelector("#toast");
const historyKey = "nexa-chat-v1";
let messages = [];
let busy = false;

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function saveMessages() {
  try { localStorage.setItem(historyKey, JSON.stringify(messages.slice(-40))); } catch {}
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
  messages = [];
  saveMessages();
  render();
  input.focus();
}
document.querySelector("#newChat").addEventListener("click", newChat);
document.querySelector("#clearChat").addEventListener("click", newChat);
document.querySelector("#mobileMenu").addEventListener("click", () => {
  document.querySelector("#sidebar").classList.toggle("open");
});
document.querySelector("#historyButton").addEventListener("click", () => notify("Saved chat history is coming in a later update."));
try {
  const saved = JSON.parse(localStorage.getItem(historyKey) || "[]");
  if (Array.isArray(saved)) messages = saved.filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-40);
} catch { messages = []; }
render();

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
