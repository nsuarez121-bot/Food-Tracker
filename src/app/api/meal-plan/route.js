import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req) {
  const { messages, system, max_tokens } = await req.json();
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: max_tokens || 1000,
      system,
      messages,
    });
    return Response.json(response);
  } catch (e) {
    console.error("Meal plan API error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
