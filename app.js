const form = document.getElementById("composer");
const input = document.getElementById("message");
const chat = document.getElementById("chat");
const sendBtn = document.getElementById("sendBtn");
const welcome = document.getElementById("welcome");
const clearBtn = document.getElementById("clearBtn");

function addMessage(text, who) {
  if (welcome && welcome.isConnected) welcome.remove();
  const row = document.createElement("div");
  row.className = `message-row ${who}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = who === "user" ? "You" : "✦";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.append(avatar, bubble);
  chat.appendChild(row);
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  return bubble;
}

async function ask(message) {
  addMessage(message, "user");
  const answerBubble = addMessage("Thinking…", "assistant");
  sendBtn.disabled = true;
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    answerBubble.textContent = data.answer;
  } catch (error) {
    answerBubble.textContent = "Unable to get an AI response: " + error.message;
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || sendBtn.disabled) return;
  input.value = "";
  input.style.height = "auto";
  ask(message);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.textContent;
    input.focus();
  });
});

clearBtn.addEventListener("click", () => {
  chat.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "welcome";
  panel.innerHTML = '<div class="sparkle">✦</div><h2>How can I help you today?</h2><p>Ask a question, learn something new, or get help with writing.</p><div class="suggestions"><button class="suggestion">Explain artificial intelligence simply</button><button class="suggestion">Help me practice English</button><button class="suggestion">Give me a study plan</button></div>';
  chat.appendChild(panel);
  panel.querySelectorAll(".suggestion").forEach(button => button.addEventListener("click", () => {
    input.value = button.textContent;
    input.focus();
  }));
});
