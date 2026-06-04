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

const MEAL_DAYS = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PREP_DAY = "Sunday";

const MEAL_PREP_PLACEHOLDER = {
  name: "Meal prep day",
  description: "Roast a batch of chicken, veggies, or grains to use throughout the week.",
  mainIngredients: [], usesExpiring: false, isPrep: true,
};

const emptyPlan = () => [
  { day: PREP_DAY, meal: MEAL_PREP_PLACEHOLDER, locked: true, isPrep: true },
  ...MEAL_DAYS.map(day => ({ day, meal: null, locked: false })),
];

export default function MealPlanner() {
  const [pantryItems, setPantryItems] = useState([]);
  const [plan, setPlan] = useState(emptyPlan());
  const [extras, setExtras] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [swapIdx, setSwapIdx] = useState(null);
  const [swapPrompt, setSwapPrompt] = useState("");
  const [swapLoading, setSwapLoading] = useState(false);
  const [groceryList, setGroceryList] = useState([]);
  const [showGrocery, setShowGrocery] = useState(false);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [notes, setNotes] = useState({});

  useEffect(() => { loadAll(); }, []);

  const [prefs, setPrefs] = useState({ hardNos: [], cuisineLoves: [], cuisineHates: [], dietaryNeeds: [] });

  const loadAll = async () => {
    try {
      const [pRes, mRes, prefRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/pantry_items?select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/meal_plan?select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/app_settings?id=eq.preferences`, { headers }),
      ]);
      const [p, m, pref] = await Promise.all([pRes.json(), mRes.json(), prefRes.json()]);
      if (Array.isArray(p)) setPantryItems(p);
      if (Array.isArray(m) && m.length > 0) {
        const saved = m[0].data;
        if (saved.plan) setPlan(saved.plan);
        if (saved.notes) setNotes(saved.notes);
        if (saved.groceryList) setGroceryList(saved.groceryList);
      }
      if (Array.isArray(pref) && pref.length > 0) setPrefs(pref[0].data);
    } catch {}
    setLoaded(true);
  };

  const savePlan = async (newPlan, newNotes, newGrocery) => {
    const data = { plan: newPlan ?? plan, notes: newNotes ?? notes, groceryList: newGrocery ?? groceryList };
    await fetch(`${SUPABASE_URL}/rest/v1/meal_plan`, {
      method: "POST",
      headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ id: "current", data }),
    });
  };

  const pantryText = pantryItems.length > 0
    ? pantryItems.map(i => `${i.name}${i.quantity ? ` (${i.quantity})` : ""}${i.expiry ? ` - use by ${i.expiry}` : ""}`).join(", ")
    : "No pantry data yet";

  const generatePlan = async () => {
    setLoading(true); setShowGrocery(false);
    try {
      const lockedMeals = plan.filter(p => p.locked && !p.isPrep).map(p => `${p.day}: ${p.meal?.name}`).join(", ");
      const unlockedDays = plan.filter(p => !p.locked && !p.isPrep).map(p => p.day);
      const res = await fetch("/api/meal-plan", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: ..., system: ..., messages: ... })
});
      const data = await res.json();
      const meals = JSON.parse(data.content?.[0]?.text.replace(/```json|```/g, "").trim() || "[]");
      const newPlan = plan.map(p => { if (p.locked) return p; const m = meals.find(m => m.day === p.day); return m ? { ...p, meal: m } : p; });
      setPlan(newPlan); await savePlan(newPlan, null, null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const swapMeal = async (idx) => {
    setSwapLoading(true);
    try {
      const day = plan[idx].day; const current = plan[idx].meal?.name;
      const res = await fetch("/api/meal-plan", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: ..., system: ..., messages: ... })
});
      const data = await res.json();
      const meal = JSON.parse(data.content?.[0]?.text.replace(/```json|```/g, "").trim() || "{}");
      const newPlan = plan.map((p, i) => i === idx ? { ...p, meal } : p);
      setPlan(newPlan); await savePlan(newPlan, null, null);
    } catch (e) { console.error(e); }
    setSwapLoading(false); setSwapIdx(null); setSwapPrompt("");
  };

  const toggleLock = async (idx) => { const newPlan = plan.map((p, i) => i === idx ? { ...p, locked: !p.locked } : p); setPlan(newPlan); await savePlan(newPlan, null, null); };
  const updateNote = async (day, val) => { const newNotes = { ...notes, [day]: val }; setNotes(newNotes); await savePlan(null, newNotes, null); };

  const generateGroceryList = async () => {
    setGroceryLoading(true); setShowGrocery(true);
    try {
      const mealsText = plan.filter(p => p.meal).map(p => `${p.day}: ${p.meal.name} (needs: ${p.meal.mainIngredients?.join(", ")})`).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5", max_tokens: 800,
          system: `Shopping assistant. Respond ONLY with a JSON array of strings.`,
          messages: [{ role: "user", content: `Meals:\n${mealsText}\n\nPantry: ${pantryText}\n\nWhat to buy? Only missing. Return JSON array.` }]
        })
      });
      const data = await res.json();
      const list = JSON.parse(data.content?.[0]?.text.replace(/```json|```/g, "").trim() || "[]");
      setGroceryList(list); await savePlan(null, null, list);
    } catch (e) { console.error(e); }
    setGroceryLoading(false);
  };

  const hasPlan = plan.some(p => p.meal && !p.isPrep);
  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Loading...</div>;

  const cardStyle = { background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, marginBottom: 10, overflow: "hidden" };
  const btnStyle = { background: "none", border: "1px solid #e8e0d0", borderRadius: 8, padding: "3px 10px", fontSize: 12, cursor: "pointer", color: "#888" };

  return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 520, margin: "0 auto", padding: "0 0 60px", background: "#faf8f4", minHeight: "100vh" }}>
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #e8e0d0", background: "#fff" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#bbb", textTransform: "uppercase", marginBottom: 4 }}>Week planner</div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>This week's dinners</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#999" }}>{pantryItems.length > 0 ? `${pantryItems.length} items in your pantry` : "No pantry data — add items first"}</p>
      </div>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8e0d0", background: "#f5f0e8" }}>
        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>Extra ingredients you're happy to buy</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={extras} onChange={e => setExtras(e.target.value)} onKeyDown={e => e.key === "Enter" && !loading && generatePlan()} placeholder="e.g. chicken breast, pasta" style={{ flex: 1, fontSize: 13, padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", outline: "none", fontFamily: "Georgia, serif" }} />
          <button onClick={generatePlan} disabled={loading} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", fontSize: 13, cursor: loading ? "not-allowed" : "pointer", fontFamily: "Georgia, serif" }}>
            {loading ? "Planning..." : hasPlan ? "Regenerate" : "Generate plan"}
          </button>
        </div>
      </div>
      <div style={{ padding: "12px 16px" }}>
        {!hasPlan && !loading && <div style={{ textAlign: "center", padding: "50px 0", color: "#bbb", fontStyle: "italic", fontSize: 14 }}>Hit "Generate plan" to get your week's dinners.</div>}
        {plan.map((p, idx) => {
          if (p.isPrep) return (
            <div key={p.day} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
              <div style={{ fontSize: 28 }}>🍗</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>Sunday — Meal prep day</div>
                <div style={{ fontSize: 12, color: "#999" }}>Roast a big batch to build meals from all week.</div>
              </div>
            </div>
          );
          return (
            <div key={p.day} style={{ ...cardStyle, border: `1px solid ${p.locked ? "#ccc" : "#e8e0d0"}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: p.locked ? "#f5f0e8" : "transparent", borderBottom: p.meal ? "1px solid #e8e0d0" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{p.day}</span>
                  {p.meal?.usesExpiring && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#fff3e0", color: "#e65100", fontWeight: 600 }}>uses expiring</span>}
                </div>
                {p.meal && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => toggleLock(idx)} style={{ ...btnStyle, color: p.locked ? "#4caf50" : "#888" }}>{p.locked ? "Locked" : "Lock"}</button>
                    {!p.locked && <button onClick={() => setSwapIdx(swapIdx === idx ? null : idx)} style={btnStyle}>Swap</button>}
                  </div>
                )}
              </div>
              {p.meal ? (
                <div style={{ padding: "10px 14px" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 3 }}>{p.meal.name}</div>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>{p.meal.description}</div>
                  {p.meal.mainIngredients?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {p.meal.mainIngredients.map((ing, i) => <span key={i} style={{ fontSize: 11, padding: "2px 8px", background: "#f5f0e8", border: "1px solid #e8e0d0", borderRadius: 20, color: "#888" }}>{ing}</span>)}
                    </div>
                  )}
                  <input value={notes[p.day] || ""} onChange={e => updateNote(p.day, e.target.value)} placeholder="Add a note…" style={{ width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e8e0d0", background: "#faf8f4", color: "#888", outline: "none", boxSizing: "border-box", fontFamily: "Georgia, serif" }} />
                </div>
              ) : (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "#bbb", fontStyle: "italic" }}>{loading ? "Planning..." : "No meal yet"}</div>
              )}
              {swapIdx === idx && (
                <div style={{ padding: "10px 14px", borderTop: "1px solid #e8e0d0", background: "#f5f0e8" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={swapPrompt} onChange={e => setSwapPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && !swapLoading && swapMeal(idx)} placeholder="Optional: e.g. vegetarian, quick meal" style={{ flex: 1, fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", outline: "none", fontFamily: "Georgia, serif" }} />
                    <button onClick={() => swapMeal(idx)} disabled={swapLoading} style={{ ...btnStyle, padding: "7px 12px" }}>{swapLoading ? "..." : "Swap"}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {hasPlan && <button onClick={generateGroceryList} disabled={groceryLoading} style={{ width: "100%", marginTop: 8, padding: "12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#1a1a1a", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>{groceryLoading ? "Building list..." : "Generate grocery list"}</button>}
        {showGrocery && groceryList.length > 0 && (
          <div style={{ marginTop: 16, background: "#fff", border: "1px solid #e8e0d0", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Shopping list</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
              {groceryList.map((item, i) => <div key={i} style={{ fontSize: 13, color: "#555", padding: "3px 0", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ccc", flexShrink: 0, display: "inline-block" }} />{item}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
