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

const LOCATIONS = [
  { id: "fridge", label: "Fridge", emoji: "🧊", color: "#4fc3f7" },
  { id: "freezer", label: "Freezer", emoji: "❄️", color: "#81d4fa" },
  { id: "cupboard", label: "Cupboard", emoji: "🗄️", color: "#ffb74d" },
];

const CATEGORIES = ["Produce", "Dairy", "Meat & Fish", "Leftovers", "Drinks", "Condiments", "Grains & Pasta", "Snacks", "Canned & Jars", "Frozen Meals", "Other"];

const daysUntilExpiry = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const expiryColor = (days) => {
  if (days === null) return "#555";
  if (days < 0) return "#ff4444";
  if (days <= 2) return "#ff7043";
  if (days <= 5) return "#ffb74d";
  return "#66bb6a";
};

const expiryLabel = (days) => {
  if (days === null) return "";
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `${days}d left`;
};

const defaultItem = () => ({ id: "", name: "", category: "Other", quantity: "", expiry: "", location: "fridge", notes: "" });

export default function PantryTracker() {
  const [items, setItems] = useState([]);
  const [activeLocation, setActiveLocation] = useState("fridge");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(defaultItem());
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("expiry");
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pantry_items?select=*`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {}
    setLoaded(true);
  };

  const saveItem = async (item) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/pantry_items`, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(item),
      });
    } catch {}
  };

  const deleteItem = async (id) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/pantry_items?id=eq.${id}`, { method: "DELETE", headers });
    } catch {}
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const addOrUpdate = async () => {
    if (!form.name.trim()) return;
    const item = { ...form, id: editId || (Date.now() + Math.random()).toString(), location: editId ? form.location : activeLocation };
    await saveItem(item);
    if (editId) setItems(prev => prev.map(i => i.id === editId ? item : i));
    else setItems(prev => [item, ...prev]);
    setEditId(null); setForm(defaultItem()); setAdding(false);
  };

  const startEdit = (item) => { setForm({ ...item }); setEditId(item.id); setActiveLocation(item.location); setAdding(true); };
  const cancel = () => { setAdding(false); setEditId(null); setForm(defaultItem()); };

  const locationItems = items.filter(i => {
    const matchLoc = i.location === activeLocation;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase());
    const matchExpiring = !showExpiringSoon || (daysUntilExpiry(i.expiry) !== null && daysUntilExpiry(i.expiry) <= 3);
    return matchLoc && matchSearch && matchExpiring;
  });

  const sorted = [...locationItems].sort((a, b) => {
    if (sortBy === "expiry") { const da = daysUntilExpiry(a.expiry) ?? 9999; const db = daysUntilExpiry(b.expiry) ?? 9999; return da - db; }
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "category") return a.category.localeCompare(b.category);
    return 0;
  });

  const expiringSoon = items.filter(i => { const d = daysUntilExpiry(i.expiry); return d !== null && d <= 3; });
  const loc = LOCATIONS.find(l => l.id === activeLocation);
  const countByLoc = (lid) => items.filter(i => i.location === lid).length;

  if (!loaded) return <div style={{ background: "#faf8f4", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#888" }}>Loading pantry…</div>;

  return (
    <div style={{ background: "#faf8f4", minHeight: "100vh", fontFamily: "'Georgia', serif", color: "#2a2a2a", maxWidth: 520, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderBottom: "2px solid #e8e0d0", padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#1a1a1a" }}>Our Pantry</h1>
          {expiringSoon.length > 0 && (
            <button onClick={() => setShowExpiringSoon(!showExpiringSoon)} style={{ background: showExpiringSoon ? "#ff7043" : "#fff3e0", border: "1px solid #ff7043", borderRadius: 20, padding: "2px 10px", color: showExpiringSoon ? "#fff" : "#ff7043", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              ⚠ {expiringSoon.length} expiring soon
            </button>
          )}
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#999", fontStyle: "italic" }}>{items.length} items across all storage</p>
        <div style={{ display: "flex" }}>
          {LOCATIONS.map(l => (
            <button key={l.id} onClick={() => { setActiveLocation(l.id); setAdding(false); setEditId(null); }} style={{ flex: 1, padding: "10px 4px", border: "none", background: "transparent", borderBottom: activeLocation === l.id ? `3px solid ${l.color}` : "3px solid transparent", color: activeLocation === l.id ? "#1a1a1a" : "#aaa", fontFamily: "Georgia, serif", fontSize: 13, cursor: "pointer", fontWeight: activeLocation === l.id ? 700 : 400 }}>
              {l.emoji} {l.label}
              <span style={{ display: "block", fontSize: 10, color: "#bbb", fontWeight: 400 }}>{countByLoc(l.id)} items</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", gap: 8, background: "#f5f0e8", borderBottom: "1px solid #e8e0d0" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" style={{ flex: 1, background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontFamily: "Georgia, serif", outline: "none", color: "#333" }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontFamily: "Georgia, serif", color: "#555", cursor: "pointer", outline: "none" }}>
          <option value="expiry">By expiry</option>
          <option value="name">By name</option>
          <option value="category">By category</option>
        </select>
      </div>
      {adding && (
        <div style={{ background: "#fff", margin: 16, borderRadius: 12, padding: 16, border: `2px solid ${loc.color}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{editId ? "Edit Item" : `Add to ${loc.label}`}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Item name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Greek yogurt" onKeyDown={e => e.key === "Enter" && addOrUpdate()} style={inputStyle} /></div>
            <div><label style={labelStyle}>Quantity</label><input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 2 packs" style={inputStyle} /></div>
            <div><label style={labelStyle}>Use by</label><input type="date" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} style={inputStyle} /></div>
            <div><label style={labelStyle}>Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            {editId && <div><label style={labelStyle}>Move to</label><select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>{LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}</select></div>}
            <div style={{ gridColumn: "1/-1" }}><label style={labelStyle}>Notes</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. opened, half used…" style={inputStyle} /></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addOrUpdate} style={{ flex: 1, background: loc.color, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "Georgia, serif", cursor: "pointer" }}>{editId ? "Save Changes" : "Add Item"}</button>
            <button onClick={cancel} style={{ padding: "10px 16px", background: "none", border: "1px solid #ddd", borderRadius: 8, color: "#888", fontSize: 13, fontFamily: "Georgia, serif", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ padding: "8px 16px 80px" }}>
        {sorted.length === 0 && <div style={{ textAlign: "center", padding: "50px 0", color: "#bbb", fontStyle: "italic", fontSize: 14 }}>{search ? "No items match." : `Nothing in the ${loc.label.toLowerCase()} yet.`}</div>}
        {(() => {
          const groups = {};
          sorted.forEach(item => { if (!groups[item.category]) groups[item.category] = []; groups[item.category].push(item); });
          return Object.entries(groups).map(([cat, catItems]) => (
            <div key={cat}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#bbb", textTransform: "uppercase", padding: "12px 0 6px", borderBottom: "1px solid #ece6da", marginBottom: 6 }}>{cat} · {catItems.length}</div>
              {catItems.map(item => {
                const days = daysUntilExpiry(item.expiry);
                const col = expiryColor(days);
                return (
                  <div key={item.id} style={{ background: "#fff", borderRadius: 10, padding: "11px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: days !== null && days <= 2 ? `1px solid ${col}66` : "1px solid #ece6da" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6 }}><span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{item.name}</span>{item.quantity && <span style={{ fontSize: 12, color: "#999" }}>{item.quantity}</span>}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                        {item.expiry && <span style={{ fontSize: 11, color: col, fontWeight: days !== null && days <= 5 ? 600 : 400 }}>{expiryLabel(days)}</span>}
                        {item.notes && <span style={{ fontSize: 11, color: "#bbb", fontStyle: "italic" }}>{item.notes}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => startEdit(item)} style={{ background: "none", border: "1px solid #e8e0d0", borderRadius: 6, padding: "4px 8px", color: "#aaa", fontSize: 11, cursor: "pointer" }}>Edit</button>
                      <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "1px solid #e8e0d0", borderRadius: 6, padding: "4px 8px", color: "#ddd", fontSize: 12, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>
      {!adding && <button onClick={() => { setAdding(true); setForm({ ...defaultItem(), location: activeLocation }); }} style={{ position: "fixed", bottom: 24, right: "50%", transform: "translateX(50%)", maxWidth: 200, width: "calc(100% - 48px)", background: loc.color, border: "none", borderRadius: 50, padding: "14px 28px", color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "Georgia, serif", cursor: "pointer" }}>+ Add to {loc.label}</button>}
    </div>
  );
}

const inputStyle = { width: "100%", background: "#faf8f4", border: "1px solid #e0d8cc", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "Georgia, serif", color: "#333", outline: "none", boxSizing: "border-box" };
const labelStyle = { fontSize: 11, color: "#999", display: "block", marginBottom: 4 };
