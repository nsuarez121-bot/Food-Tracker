export async function POST(request) {
  try {
    const { image } = await request.json();

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: `You are a pantry import assistant. The user will share a photo of a grocery or pantry list. Extract all food items and respond ONLY with a JSON array, no markdown:
[
  {
    "name": "item name",
    "quantity": "amount if mentioned, otherwise empty string",
    "category": "one of: Produce, Dairy, Meat & Fish, Leftovers, Drinks, Condiments, Grains & Pasta, Snacks, Canned & Jars, Frozen Meals, Other",
    "location": "one of: fridge, freezer, cupboard - guess based on item type",
    "notes": "any extra info mentioned",
    "daysUntilExpiry": a number representing how many days until this typically expires - use these defaults: Produce=5, Dairy=7, Meat & Fish=3, Leftovers=4, Frozen Meals=90, Canned & Jars=365, Condiments=180, Grains & Pasta=180, Snacks=30, Drinks=7, Other=14
  }
]`,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "Extract all food items from this list." }
          ]
        }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || "[]";
    const items = JSON.parse(text.replace(/```json|```/g, "").trim());

    const today = new Date();
    const itemsWithDates = items.map(item => {
      const expiry = new Date(today);
      expiry.setDate(expiry.getDate() + (item.daysUntilExpiry || 14));
      return {
        ...item,
        id: (Date.now() + Math.random()).toString(),
        expiry: expiry.toISOString().split("T")[0],
      };
    });

    return Response.json({ success: true, items: itemsWithDates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
