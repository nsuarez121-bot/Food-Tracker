"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "food-tracker-data";

const DEFAULT_PROFILES = {
  user1: { name: "You", color: "#4f7cff", goals: { calories: 2000, protein: 150, carbs: 200, fat: 65 }, logs: {} },
  user2: { name: "Wife", color: "#ff6b9d", goals: { calories: 1600, protein: 120, carbs: 160, fat: 55 }, logs: {} },
};

const today = () => new Date().toISOString().split("T")[0];

const MacroBar = ({ label, value, goal, color }) => {
  const pct = Math.min((value / goal) * 100, 100);
  const over = value > goal;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3, color: "#aaa" }}>
        <span>{label}</span>
        <span style={{ color: over ? "#ff5f5f" : "#eee" }}>{Math.round(value)} / {goal}{label === "Calories" ? " kcal" : "g"}</span>
      </div>
      <div style={{ background: "#2a2a3a", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: over ? "#ff5f5f" : color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
};

const MealCard = ({ meal, onDelete }) => (
  <div style={{ background: "#1e1e2e", border: "1px solid #2a2a3a", borderRadius: 10, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, color: "#eee", marginBottom: 4 }}>{meal.description}</div>
      <div style={{ fontSize: 12, color: "#888" }}>{meal.calories} kcal · {meal.protein}g protein · {meal.carbs}g carbs · {meal.fat}g fat</div>
      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{meal.time}</div>
    </div>
    <button onClick={onDelete} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16, padding: "0 0 0 10px" }}>✕</button>
  </div>
);

export default function FoodTracker() {
  const [data, setData] = useState(null);
  const [activeUser, setActiveUser] = useState("user1");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("log");
  const [goalEdit, setGoalEdit] = useState({});
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
      else setData(DEFAULT_PROFILES);
    } catch { setData(DEFAULT_PROFILES); }
  }, []);

  const save = (newData) => {
    setData(newData);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); } catch {}
  };

  const profile = data?.[activeUser];
  const todayLogs = profile?.logs?.[today()] || [];
  const totals = todayLogs.reduce((acc, m) => ({ calories: acc.calories + (m.calories || 0), protein: acc.protein + (m.protein || 0), carbs: acc.carbs + (m.carbs || 0), fat: acc.fat + (m.fat || 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const logMeal = async () => {
    if (!input.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: `You are a nutrition expert. Respond ONLY with a JSON object (no markdown): { "description": "short meal name", "calories": number, "protein": number, "carbs": number, "fat": number }`, messages: [{ role: "user", content: input }] }),
      });
      const json = await res.json();
      const meal = JSON.parse(json.content?.[0]?.text.replace(/```json|```/g, "").trim());
      meal.time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      meal.id = Date.now();
      const newData = { ...data };
      const d = today();
      if (!newData[activeUser].logs[d]) newData[activeUser].logs[d] = [];
      newData[activeUser].logs[d] = [meal, ...newData[activeUser].logs[d]];
      save(newData); setInput("");
    } catch { setError("Couldn't parse that meal. Try being more specific."); }
    setLoading(false);
  };

  const deleteMeal = (id) => { const newData = { ...data }; newData[activeUser].logs[today()] = todayLogs.filter(m => m.id !== id); save(newData); };

  const saveGoals = () => {
    const newData = { ...data };
    newData[activeUser].goals = { calories: Number(goalEdit.calories), protein: Number(goalEdit.protein), carbs: Number(goalEdit.carbs), fat: Number(goalEdit.fat) };
    save(newData); setTab("log");
  };

  const saveName = () => { const newData = { ...data }; newData[activeUser].name = nameInput; save(newData); setEditingName(false); };

  if (!data) return <div style={{ background: "#0f0f1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>Loading...</div>;

  return (
    <div style={{ background: "#0f0f1a", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#eee", maxWidth: 480, margin: "0 auto", padding: "0 0 60px" }}>
      <div style={{ padding: "24px 20px 0", background: "linear-gradient(180deg, #13132a 0%, #0f0f1a 100%)", borderBottom: "1px solid #1e1e2e" }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#fff" }}>Food Tracker</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {["user1", "user2"].map(uid => {
            const p = data[uid]; const active = activeUser === uid;
            return <button key={uid} onClick={() => setActiveUser(uid)} style={{ flex: 1, padding: "10px 8px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer", background: active ? "#1a1a2e" : "transparent", color: active ? p.color : "#555", fontWeight: active ? 700 : 400, fontSize: 14, borderBottom: active ? `2px solid ${p.color}` : "2px solid transparent" }}>{p.name}</button>;
          })}
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid #1e1e2e", background: "#1a1a2e" }}>
        {[["log", "Today"], ["goals", "Goals"]].map(([t, label]) => (
          <button key={t} onClick={() => { if (t === "goals") setGoalEdit({ ...profile.goals }); setTab(t); }} style={{ flex: 1, padding: "10px", border: "none", background: "transparent", color: tab === t ? profile.color : "#555", fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: "pointer", borderBottom: tab === t ? `2px solid ${profile.color}` : "2px solid transparent" }}>{label}</button>
        ))}
      </div>
      <div style={{ padding: "16px 16px 0" }}>
        {tab === "log" && (
          <>
            <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "14px 16px", border: `1px solid ${profile.color}22`, marginBottom: 16 }}>
              <MacroBar label="Calories" value={totals.calories} goal={profile.goals.calories} color={profile.color} />
              <MacroBar label="Protein" value={totals.protein} goal={profile.goals.protein} color={profile.color} />
              <MacroBar label="Carbs" value={totals.carbs} goal={profile.goals.carbs} color={profile.color} />
              <MacroBar label="Fat" value={totals.fat} goal={profile.goals.fat} color={profile.color} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !loading && logMeal()} placeholder={`What did ${profile.name} eat?`} style={{ flex: 1, background: "#1e1e2e", border: `1px solid ${profile.color}44`, borderRadius: 10, padding: "11px 14px", color: "#eee", fontSize: 14, outline: "none" }} />
              <button onClick={logMeal} disabled={loading} style={{ background: profile.color, border: "none", borderRadius: 10, padding: "0 18px", color: "#fff", fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "…" : "Log"}</button>
            </div>
            {error && <div style={{ color: "#ff5f5f", fontSize: 13, marginBottom: 10 }}>{error}</div>}
            {todayLogs.length === 0 ? <div style={{ textAlign: "center", color: "#444", padding: "40px 0", fontSize: 14 }}>No meals logged yet today.</div> : todayLogs.map(m => <MealCard key={m.id} meal={m} onDelete={() => deleteMeal(m.id)} />)}
          </>
        )}
        {tab === "goals" && (
          <div>
            <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #2a2a3a" }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Profile Name</div>
              {editingName ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} style={{ flex: 1, background: "#13132a", border: "1px solid #2a2a3a", borderRadius: 8, padding: "8px 12px", color: "#eee", fontSize: 14, outline: "none" }} />
                  <button onClick={saveName} style={{ background: profile.color, border: "none", borderRadius: 8, padding: "0 14px", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Save</button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: profile.color }}>{profile.name}</span>
                  <button onClick={() => { setEditingName(true); setNameInput(profile.name); }} style={{ background: "none", border: "1px solid #2a2a3a", borderRadius: 8, padding: "5px 12px", color: "#888", fontSize: 12, cursor: "pointer" }}>Edit</button>
                </div>
              )}
            </div>
            <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 16, border: "1px solid #2a2a3a" }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>Daily Goals</div>
              {[["calories", "Calories (kcal)"], ["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fat", "Fat (g)"]].map(([key, label]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 4 }}>{label}</label>
                  <input type="number" value={goalEdit[key] ?? ""} onChange={e => setGoalEdit({ ...goalEdit, [key]: e.target.value })} style={{ width: "100%", background: "#13132a", border: "1px solid #2a2a3a", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <button onClick={saveGoals} style={{ width: "100%", background: profile.color, border: "none", borderRadius: 10, padding: "12px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4 }}>Save Goals</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
