export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Password, X-Groq-Key",
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

    // Monta as mensagens no formato OpenAI/Groq (chat.completions)
    const groqMessages = [];
    if (body.system) {
      groqMessages.push({ role: "system", content: body.system });
    }
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      for (const m of body.messages) {
        groqMessages.push({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        });
      }
    } else {
      groqMessages.push({ role: "user", content: "ping" });
    }

    // Chave enviada pelo navegador (campo do site) tem prioridade;
    // se não vier, usa a secret configurada no Worker (env.GROQ_API_KEY).
    const apiKey = request.headers.get("X-Groq-Key") || env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Nenhuma chave da Groq fornecida (nem no site, nem no Worker)." }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const groqBody = {
      model: env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: groqMessages,
      temperature: 1,
      max_tokens: 8192,
    };

    let groqRes, data;
    try {
      groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(groqBody),
      });
      data = await groqRes.json();
    } catch(e) {
      return new Response(JSON.stringify({ error: "Erro Groq fetch: " + e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (data.error) {
      return new Response(JSON.stringify({ error: "Groq erro: " + data.error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const text = data?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  },
};
