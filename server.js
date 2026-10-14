const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PUBLIC_DIR = path.join(__dirname, "public");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function send(res, status, data, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  });
  res.end(typeof data === "string" ? data : JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 100000) req.destroy();
    });
    req.on("end", async () => {
      let body;
      try { body = JSON.parse(raw || "{}"); }
      catch { return send(res, 400, { error: "Invalid request." }); }

      const message = String(body.message || "").trim();
      if (!message) return send(res, 400, { error: "Please write a message." });
      if (message.length > 8000) return send(res, 400, { error: "Message is too long. Please shorten it." });
      if (!API_KEY) return send(res, 503, {
        error: "AI is not connected yet. The site owner must add a GEMINI_API_KEY environment variable."
      });

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: "You are Sana AI, a helpful, clear, friendly assistant. Answer in the language used by the user when possible. Do not claim certainty when unsure." }]
              },
              contents: [{ role: "user", parts: [{ text: message }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
            })
          }
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const detail = result?.error?.message || "AI service request failed.";
          return send(res, 502, { error: detail });
        }
        const answer = (result.candidates?.[0]?.content?.parts || [])
          .map(p => p.text || "")
          .join("\n")
          .trim();
        if (!answer) return send(res, 502, { error: "The AI returned an empty response. Please try again." });
        send(res, 200, { answer });
      } catch {
        send(res, 502, { error: "Could not connect to the AI service. Please try again later." });
      }
    });
    return;
  }

  const urlPath = req.url.split("?")[0] === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const safePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!safePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: "Forbidden" });
  fs.readFile(safePath, (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    send(res, 200, data, mime[path.extname(safePath)] || "application/octet-stream");
  });
});

server.listen(PORT, () => console.log(`Sana AI running on port ${PORT}`));
