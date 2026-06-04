export async function POST(request) {
  try {
    const { messages, system, max_tokens } = await request.json();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: max_tokens || 1000,
        system,
        messages,
      }),
    });
    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    console.error("Meal plan API error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
