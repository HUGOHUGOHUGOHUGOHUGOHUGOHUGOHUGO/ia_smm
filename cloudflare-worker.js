export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Password",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ content: [{ type: "text", text: "Worker funcionando!" }] }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch(e) {
      return new Response(JSON.stringify({ error: "Body invalido: " + e.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const geminiBody = {
      contents: [{
        parts: [{ text: (body.system || "") + "\n\n" + (body.messages?.[0]?.content || "ping") }]
      }],
      generationConfig: { temperature: 1, maxOutputTokens: 8192 }
    };

    let geminiRes, data;
    try {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMnOpQrStUv-XXXXXXXX}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
        }
      );
      data = await geminiRes.json();
    } catch(e) {
      return new Response(JSON.stringify({ error: "Erro Gemini fetch: " + e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (data.error) {
      return new Response(JSON.stringify({ error: "Gemini erro: " + data.error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  },
};
