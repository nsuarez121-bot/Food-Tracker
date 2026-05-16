export async function POST(request) {
  try {
    const { text, image } = await request.json();

    const messages = image
      ? [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
          { type: "text", text: text ? `Recipe text: ${text}\n\nExtract the recipe details.` : "Extract the recipe details from this image." }
        ]}]
      : [{ role: "user", content: text }];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `You are a recipe parser. Extract recipe details and respond ONLY with a JSON object, no markdown:
{
  "name": "recipe name",
  "servings": number,
  "prepTime": "e.g. 20 mins",
  "cookTime": "e.g. 30 mins",
  "ingredients": [
    { "item": "ingredient name", "amount": "e.g. 2 cups", "optional": false }
  ],
  "steps": ["step 1", "step 2"],
  "tags": ["e.g. Italian", "Chicken", "Quick"]
}`,
        messages,
      }),
    });

    const data = await res.json();
    const recipeText = data.content?.[0]?.text || "{}";
    const recipe = JSON.parse(recipeText.replace(/```json|```/g, "").trim());
    return Response.json({ success: true, recipe });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
