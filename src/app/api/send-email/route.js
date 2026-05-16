export async function POST(request) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || to.length === 0) return Response.json({ error: "No recipients" }, { status: 400 });

    const scriptUrl = "https://script.google.com/macros/s/AKfycbwk465cobk452kShlMLmCzFZ7kY-BUdmSabltOuZ5gJnpd4EOSGTxD3WUOX9m3VZgey0g/exec";

    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body: html }),
    });

    const data = await res.json();
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
