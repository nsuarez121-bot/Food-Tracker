import { Resend } from "resend";

export async function POST(request) {
  try {
    const { apiKey, to, subject, html } = await request.json();

    if (!apiKey) return Response.json({ error: "No API key provided" }, { status: 400 });
    if (!to || to.length === 0) return Response.json({ error: "No recipients" }, { status: 400 });

    const resend = new Resend(apiKey);
    const data = await resend.emails.send({
      from: "Food Tracker <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
