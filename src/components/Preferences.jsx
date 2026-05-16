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

const defaultPrefs = {
  hardNos: [],
  cuisineLoves: [],
  cuisineHates: [],
  dietaryNeeds: [],
};

const DIETARY_OPTIONS = [
  "High protein", "Low carb", "Low calorie", "Dairy free", "Gluten free",
  "Vegetarian", "Vegan", "Nut free", "Low sodium", "Low fat"
];

export default function Preferences() {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("hardnos");
  const [newHardNo, setNewHardNo] = useState("");
  const [newLove, setNewLove] = useState("");
  const [newHate, setNewHate] = useState("");

  useEffect(() => { loadPrefs(); }, []);

  const loadPrefs = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?id=eq.preferences`, { headers });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setPrefs({ ...defaultPrefs, ...data[0].data });
    } catch {}
    setLoaded(true);
  };

  const save = async (newPrefs) => {
    setSaving(true);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ id: "preferences", data: newPrefs }),
      });
      setPrefs(newPrefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const addHardNo = () => { if (!newHardNo.trim()) return; setPrefs(p => ({ ...p, hardNos: [...p.hardNos, newHardNo.trim().toLowerCase()] })); setNewHardNo(""); };
  const removeHardNo = (i) => setPrefs(p => ({ ...p, hardNos: p.hardNos.filter((_, idx) => idx !== i) }));
  const addLove = () => { if (!newLove.trim()) return; setPrefs(p => ({ ...p, cuisineLoves: [...p.cuisineLoves, newLove.trim()] })); setNewLove(""); };
  const removeLove = (i) => setPrefs(p => ({ ...p, cuisineLoves: p.cuisineLoves.filter((_, idx) => idx !== i) }));
  const addHate = () => { if (!newHate.trim()) return; setPrefs(p => ({ ...p, cuisineHates: [...p.cuisineHates, newHate.trim()] })); setNewHate(""); };
  const removeHate = (i) => setPrefs(p => ({ ...p, cuisineHates: p.cuisineHates.filter((_, idx) => idx !== i) }));
  const toggleDietary = (need) => setPrefs(p => ({ ...p, dietaryNeeds: p.dietaryNeeds.includes(need) ? p.dietaryNeeds.filter(d => d !== need) : [...p.dietaryNeeds, need] }));

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#888", fontFamily: "Georgia, serif" }}>Loading...</div>;

  const tabStyle = (t) => ({ flex: 1, padding: "10px", border: "none", background: "transparent", color: tab === t ? "#1a1a1a" : "#aaa", fontWeight: tab === t ? 700 : 400, fontSize: 12, cursor: "pointer", borderBottom: tab === t ? "3px solid #1a1a1a" : "3px solid transparent", fontFamily: "Georgia, serif" });
  const cardStyle = { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: 16, marginBottom: 12 };
  const iStyle = { flex: 1, background: "#faf8f4", border: "1px solid #e0d8cc", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "Georgia, serif", color: "#333", outline: "none" };
  const addBtnStyle = { padding: "8px 16px", borderRadius: 8, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" };
  const tagStyle = (color) => ({ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px", borderRadius: 20, border: `1px solid ${color}44`, background: `${color}11`, color, margin: "0 4px 6px 0" });

  return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 520, margin: "0 auto", background: "#faf8f4", minHeight: "100vh", padding: "0 0 80px" }}>
      <div style={{ background: "#fff", borderBottom: "2px solid #e8e0d0", padding: "20px 20px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#bbb", textTransform: "uppercase", marginBottom: 4 }}>Meal preferences</div>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>Our Preferences</h1>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#999", fontStyle: "italic" }}>The meal planner uses these when suggesting dinners</p>
        <div style={{ display: "flex" }}>
          <button style={tabStyle("hardnos")} onClick={() => setTab("hardnos")}>🚫 Hard Nos</button>
          <button style={tabStyle("cuisines")} onClick={() => setTab("cuisines")}>🍜 Cuisines</button>
          <button style={tabStyle("dietary")} onClick={() => setTab("dietary")}>💪 Dietary</button>
        </div>
      </div>
      <div style={{ padding: "16px 16px 0" }}>
        {tab === "hardnos" && (
          <div>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 14px" }}>These ingredients will never appear in any meal suggestion.</p>
            <div style={cardStyle}>
              {prefs.hardNos.length === 0 ? <div style={{ fontSize: 13, color: "#bbb", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>No hard nos yet</div> : <div style={{ marginBottom: 8 }}>{prefs.hardNos.map((item, i) => <span key={i} style={tagStyle("#ff5252")}>{item}<button onClick={() => removeHardNo(i)} style={{ background: "none", border: "none", color: "#ff5252", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button></span>)}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: prefs.hardNos.length > 0 ? 10 : 0 }}>
                <input value={newHardNo} onChange={e => setNewHardNo(e.target.value)} onKeyDown={e => e.key === "Enter" && addHardNo()} placeholder="e.g. mushrooms, shellfish, cilantro" style={iStyle} />
                <button onClick={addHardNo} style={addBtnStyle}>Add</button>
              </div>
            </div>
          </div>
        )}
        {tab === "cuisines" && (
          <div>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>❤️ We love</div>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>The meal planner will lean towards these</p>
              {prefs.cuisineLoves.length > 0 && <div style={{ marginBottom: 10 }}>{prefs.cuisineLoves.map((item, i) => <span key={i} style={tagStyle("#4caf50")}>{item}<button onClick={() => removeLove(i)} style={{ background: "none", border: "none", color: "#4caf50", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button></span>)}</div>}
              <div style={{ display: "flex", gap: 8 }}><input value={newLove} onChange={e => setNewLove(e.target.value)} onKeyDown={e => e.key === "Enter" && addLove()} placeholder="e.g. Mexican, Italian, Thai" style={iStyle} /><button onClick={addLove} style={addBtnStyle}>Add</button></div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>👎 We don't like</div>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>The meal planner will avoid these</p>
              {prefs.cuisineHates.length > 0 && <div style={{ marginBottom: 10 }}>{prefs.cuisineHates.map((item, i) => <span key={i} style={tagStyle("#ff7043")}>{item}<button onClick={() => removeHate(i)} style={{ background: "none", border: "none", color: "#ff7043", cursor: "pointer", fontSize: 14, padding: 0 }}>×</button></span>)}</div>}
              <div style={{ display: "flex", gap: 8 }}><input value={newHate} onChange={e => setNewHate(e.target.value)} onKeyDown={e => e.key === "Enter" && addHate()} placeholder="e.g. Indian, Turkish" style={iStyle} /><button onClick={addHate} style={addBtnStyle}>Add</button></div>
            </div>
          </div>
        )}
        {tab === "dietary" && (
          <div>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 14px" }}>The meal planner will respect these when suggesting meals.</p>
            <div style={cardStyle}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DIETARY_OPTIONS.map(need => { const active = prefs.dietaryNeeds.includes(need); return <button key={need} onClick={() => toggleDietary(need)} style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${active ? "#1a1a1a" : "#e0d8cc"}`, background: active ? "#1a1a1a" : "#fff", color: active ? "#fff" : "#666", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: active ? 600 : 400 }}>{need}</button>; })}
              </div>
            </div>
          </div>
        )}
        <button onClick={() => save(prefs)} disabled={saving} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: saved ? "#e8f5e9" : "#1a1a1a", color: saved ? "#2e7d32" : "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif", marginTop: 8 }}>
          {saved ? "Saved! ✓" : saving ? "Saving..." : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
