"use client";
import { useState, useEffect } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

const daysUntilExpiry = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const defaultSettings = {
  resendKey: "", yourEmail: "", wifeEmail: "", sendDay: "Sunday",
  essentials: ["milk", "eggs", "bread", "butter", "olive oil"], lastSent: null,
};

export default function EmailSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newEssential, setNewEssential] = useState("");
  const [tab, setTab] = useState("settings");
  const [pantryItems, setPantryItems] = useState([]);
  const [mealPlan, setMealPlan] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [sRes, pRes, mRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/app_settings?id=eq.email_settings`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/pantry_items?select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/meal_plan?select=*`, { headers }),
      ]);
      const [s, p, m] = await Promise.all([sRes.json(), pRes.json(), mRes.json()]);
      if (Array.isArray(s) && s.length > 0) setSettings({ ...defaultSettings, ...s[0].data });
      if (Array.isArray(p)) setPantryItems(p);
      if (Array.isArray(m) && m.length > 0) setMealPlan(m[0].data);
    } catch {}
    setLoaded(true);
  };

  const save = async (newSettings) => {
    setSaving(true);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ id: "email_settings", data: newSettings }),
      });
      setSettings(newSettings); setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }));
  const addEssential = () => { if (!newEssential.trim()) return; setSettings(s => ({ ...s, essentials: [...s.essentials, newEssential.trim().toLowerCase()] })); setNewEssential(""); };
  const removeEssential = (i) => setSettings(s => ({ ...s, essentials: s.essentials.filter((_, idx) => idx !== i) }));

  const buildWeeklyEmail = (pantry, plan, isTest) => {
    const meals = plan?.plan?.filter(p => !p.isPrep && p.meal) || [];
    const groceries = plan?.groceryList || [];
    const expiring = pantry.filter(i => { const d = daysUntilExpiry(i.expiry); return d !== null && d <= 3 && d >= 0; });
    const expired = pantry.filter(i => { const d = daysUntilExpiry(i.expiry); return d !== null && d < 0; });
    const mealsHtml = meals.length > 0 ? meals.map(p => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0ece4;color:#666;font-size:13px;width:100px">${p.day}</td><td style="padding:8px 12px;border-bottom:1px solid #f0ece4;font-size:13px;font-weight:600;color:#1a1a1a">${p.meal.name}</td></tr>`).join("") : `<tr><td colspan="2" style="padding:12px;color:#999;font-size:13px">No meal plan yet.</td></tr>`;
    const groceryHtml = Array.isArray(groceries) && groceries.length > 0 ? `<ul style="margin:0;padding:0 0 0 20px">${groceries.map(g => `<li style="font-size:13px;color:#333;padding:3px 0">${typeof g === 'string' ? g : g.item}</li>`).join("")}</ul>` : `<p style="color:#999;font-size:13px;margin:0">No grocery list yet.</p>`;
    const expiringHtml = expiring.length > 0 ? `<div style="background:#fff8f0;border:1px solid #ffd6a5;border-radius:8px;padding:12px 16px;margin-bottom:16px"><div style="font-size:13px;font-weight:600;color:#b45309;margin-bottom:8px">⚠ Use these up this week</div>${expiring.map(i => `<div style="font-size:13px;color:#92400e;padding:2px 0">${i.name} — ${daysUntilExpiry(i.expiry) === 0 ? "expires today" : `${daysUntilExpiry(i.expiry)}d left`}</div>`).join("")}</div>` : "";
    const expiredHtml = expired.length > 0 ? `<div style="background:#fff0f0;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:16px"><div style="font-size:13px;font-weight:600;color:#dc2626;margin-bottom:8px">❌ Throw these out</div>${expired.map(i => `<div style="font-size:13px;color:#991b1b;padding:2px 0">${i.name}</div>`).join("")}</div>` : "";
    return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#faf8f4;margin:0;padding:20px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e0d0"><div style="background:#1a1a2e;padding:24px;text-align:center"><div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:4px">🥘 Weekly Food Digest</div><div style="color:#888;font-size:13px">${isTest ? "Test email" : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div></div><div style="padding:24px">${expiringHtml}${expiredHtml}<div style="margin-bottom:24px"><div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #f0ece4">🍽 This week's dinners</div><table style="width:100%;border-collapse:collapse">${mealsHtml}</table></div><div><div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #f0ece4">🛒 Shopping list</div>${groceryHtml}</div></div><div style="background:#f5f0e8;padding:16px;text-align:center;font-size:11px;color:#999">Sent from your Home Food Tracker</div></div></body></html>`;
  };

  const buildEmergencyEmail = (lowItems) => {
    const itemsHtml = lowItems.map(i => `<div style="padding:10px 14px;border-bottom:1px solid #fee2e2;font-size:14px;color:#991b1b;font-weight:600">${i.name} <span style="font-weight:400;color:#dc2626">— running low or out</span></div>`).join("");
    return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#faf8f4;margin:0;padding:20px"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #fca5a5"><div style="background:#dc2626;padding:20px;text-align:center"><div style="color:#fff;font-size:20px;font-weight:700">🚨 Low on essentials</div></div><div style="padding:0">${itemsHtml}</div></div></body></html>`;
  };

  const sendEmail = async (subject, html) => {
    const recipients = [settings.yourEmail, settings.wifeEmail].filter(Boolean);
    if (recipients.length === 0) throw new Error("No email addresses set");
    const res = await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: settings.resendKey, to: recipients, subject, html }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Send failed");
    return data;
  };

  const sendTestEmail = async () => { setTestSending(true); setTestResult(null); try { await sendEmail("🥘 [Test] Weekly Food Digest", buildWeeklyEmail(pantryItems, mealPlan, true)); setTestResult({ ok: true, msg: "Test email sent!" }); } catch (e) { setTestResult({ ok: false, msg: e.message }); } setTestSending(false); };
  const sendWeeklyNow = async () => { setSending(true); setSendResult(null); try { await sendEmail("🥘 This week's meal plan & shopping list", buildWeeklyEmail(pantryItems, mealPlan, false)); await save({ ...settings, lastSent: new Date().toISOString() }); setSendResult({ ok: true, msg: "Weekly email sent!" }); } catch (e) { setSendResult({ ok: false, msg: e.message }); } setSending(false); };
  const sendEmergencyNow = async () => {
    setSending(true); setSendResult(null);
    try {
      const lowItems = settings.essentials.filter(name => !pantryItems.find(i => i.name.toLowerCase().includes(name.toLowerCase()))).map(name => ({ name }));
      if (lowItems.length === 0) { setSendResult({ ok: true, msg: "All essentials stocked!" }); setSending(false); return; }
      await sendEmail("🚨 Low on essentials", buildEmergencyEmail(lowItems));
      setSendResult({ ok: true, msg: `Alert sent! ${lowItems.length} items flagged.` });
    } catch (e) { setSendResult({ ok: false, msg: e.message }); }
    setSending(false);
  };

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading...</div>;

  const iStyle = { width: "100%", background: "#faf8f4", border: "1px solid #e0d8cc", borderRadius: 8, padding: "9px 12px", color: "#333", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "Georgia, serif" };
  const lStyle = { fontSize: 12, color: "#888", display: "block", marginBottom: 5 };
  const cardStyle = { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: 16, marginBottom: 12 };
  const btnStyle = { width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e0d8cc", background: "#faf8f4", color: "#333", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" };

  return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 520, margin: "0 auto", padding: "0 0 60px", background: "#faf8f4", minHeight: "100vh" }}>
      <div style={{ padding: "24px 20px 0", borderBottom: "1px solid #e8e0d0", background: "#fff" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#bbb", textTransform: "uppercase", marginBottom: 4 }}>Email reminders</div>
        <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>Email settings</h1>
        <div style={{ display: "flex" }}>
          {[["settings", "Settings"], ["send", "Send emails"], ["essentials", "Essentials"]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", border: "none", background: "transparent", color: tab === t ? "#1a1a1a" : "#aaa", fontWeight: tab === t ? 700 : 400, fontSize: 13, cursor: "pointer", borderBottom: tab === t ? "3px solid #1a1a1a" : "3px solid transparent", fontFamily: "Georgia, serif" }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "20px 16px" }}>
        {tab === "settings" && (
          <div>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Account details</div>
              <div style={{ marginBottom: 12 }}><label style={lStyle}>Resend API key</label><input type="password" value={settings.resendKey} onChange={e => update("resendKey", e.target.value)} placeholder="re_••••••••••••" style={iStyle} /><div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>Stored securely in shared database</div></div>
              <div style={{ marginBottom: 12 }}><label style={lStyle}>Your email</label><input type="email" value={settings.yourEmail} onChange={e => update("yourEmail", e.target.value)} placeholder="you@gmail.com" style={iStyle} /></div>
              <div><label style={lStyle}>Wife's email</label><input type="email" value={settings.wifeEmail} onChange={e => update("wifeEmail", e.target.value)} placeholder="wife@gmail.com" style={iStyle} /></div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Weekly digest</div>
              <div style={{ fontSize: 13, color: "#888" }}>Sends every <strong>Sunday</strong> with your meal plan, grocery list, and anything expiring soon.</div>
              {settings.lastSent && <div style={{ fontSize: 12, color: "#bbb", marginTop: 8 }}>Last sent: {new Date(settings.lastSent).toLocaleDateString()}</div>}
            </div>
            <button onClick={() => save(settings)} disabled={saving} style={{ ...btnStyle, background: saved ? "#e8f5e9" : "#fff", color: saved ? "#2e7d32" : "#1a1a1a", fontWeight: 700, fontSize: 14, borderRadius: 10, padding: "12px" }}>{saved ? "Saved!" : saving ? "Saving..." : "Save settings"}</button>
          </div>
        )}
        {tab === "send" && (
          <div>
            {!settings.resendKey && <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#f57f17" }}>Add your Resend API key in Settings first.</div>}
            <div style={cardStyle}><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Send a test email</div><div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>Preview of the weekly digest.</div><button onClick={sendTestEmail} disabled={testSending || !settings.resendKey} style={btnStyle}>{testSending ? "Sending..." : "Send test email"}</button>{testResult && <div style={{ marginTop: 10, fontSize: 13, padding: "8px 12px", borderRadius: 8, background: testResult.ok ? "#e8f5e9" : "#ffebee", color: testResult.ok ? "#2e7d32" : "#c62828" }}>{testResult.msg}</div>}</div>
            <div style={cardStyle}><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Send weekly digest now</div><div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>Meal plan, grocery list, and expiry warnings.</div><button onClick={sendWeeklyNow} disabled={sending || !settings.resendKey} style={btnStyle}>{sending ? "Sending..." : "Send weekly digest now"}</button></div>
            <div style={cardStyle}><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Check & send emergency alert</div><div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>Alerts you both if essentials are missing.</div><button onClick={sendEmergencyNow} disabled={sending || !settings.resendKey} style={btnStyle}>{sending ? "Checking..." : "Check essentials & alert if low"}</button></div>
            {sendResult && <div style={{ fontSize: 13, padding: "10px 14px", borderRadius: 8, background: sendResult.ok ? "#e8f5e9" : "#ffebee", color: sendResult.ok ? "#2e7d32" : "#c62828" }}>{sendResult.msg}</div>}
          </div>
        )}
        {tab === "essentials" && (
          <div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Items you always want in the house. Emergency alert fires if any are missing.</div>
            <div style={{ ...cardStyle, padding: 0 }}>
              {settings.essentials.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: i < settings.essentials.length - 1 ? "1px solid #e8e0d0" : "none" }}>
                  <span style={{ fontSize: 13, color: "#333", textTransform: "capitalize" }}>{e}</span>
                  <button onClick={() => removeEssential(i)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input value={newEssential} onChange={e => setNewEssential(e.target.value)} onKeyDown={e => e.key === "Enter" && addEssential()} placeholder="Add an essential item..." style={{ ...iStyle, flex: 1 }} />
              <button onClick={addEssential} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #e0d8cc", background: "#fff", color: "#333", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>Add</button>
            </div>
            <button onClick={() => save(settings)} style={{ ...btnStyle, fontWeight: 700, fontSize: 14, borderRadius: 10, padding: "12px" }}>Save essentials</button>
          </div>
        )}
      </div>
    </div>
  );
}
