"use client";
import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [groceryList, setGroceryList] = useState([]);
  const [view, setView] = useState("list");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [rRes, pRes, gRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/recipes?select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/pantry_items?select=*`, { headers }),
        fetch(`${SUPABASE_URL}/rest/v1/grocery_list?select=*`, { headers }),
      ]);
      const [r, p, g] = await Promise.all([rRes.json(), pRes.json(), gRes.json()]);
      if (Array.isArray(r)) setRecipes(r.map(row => ({ ...row.data, id: row.id })));
      if (Array.isArray(p)) setPantryItems(p);
      if (Array.isArray(g)) setGroceryList(g.map(row => ({ ...row.data, id: row.id })));
    } catch {}
    setLoaded(true);
  };

  const saveRecipeToDb = async (recipe) => {
    await fetch(`${SUPABASE_URL}/rest/v1/recipes`, {
      method: "POST",
      headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ id: recipe.id.toString(), data: recipe }),
    });
  };

  const saveGroceryToDb = async (items) => {
    // Delete all and reinsert
    await fetch(`${SUPABASE_URL}/rest/v1/grocery_list?id=neq.null`, { method: "DELETE", headers });
    if (items.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/grocery_list`, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(items.map(i => ({ id: i.id.toString(), data: i }))),
      });
    }
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result.split(",")[1]); setImagePreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const parseRecipe = async () => {
    if (!input.trim() && !image) return;
    setLoading(true);
    try {
      const res = await fetch("/api/parse-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, image }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsed(data.recipe);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getMissingIngredients = (ingredients) => {
    return (ingredients || []).filter(ing => {
      const name = ing.item.toLowerCase();
      return !pantryItems.find(p => p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase()));
    });
  };

  const saveRecipe = async () => {
    if (!parsed) return;
    const missing = getMissingIngredients(parsed.ingredients);
    const newRecipe = { ...parsed, id: Date.now(), savedAt: new Date().toISOString() };
    await saveRecipeToDb(newRecipe);
    setRecipes(prev => [newRecipe, ...prev]);
    if (missing.length > 0) {
      const newItems = missing.map(m => ({ id: (Date.now() + Math.random()).toString(), item: m.item, amount: m.amount, recipe: parsed.name, checked: false }));
      const updated = [...groceryList.filter(g => !newItems.find(n => n.item.toLowerCase() === g.item?.toLowerCase())), ...newItems];
      await saveGroceryToDb(updated);
      setGroceryList(updated);
    }
    setParsed(null); setInput(""); setImage(null); setImagePreview(null); setView("list");
  };

  const deleteRecipe = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}`, { method: "DELETE", headers });
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const addToGrocery = async (recipe) => {
    const missing = getMissingIngredients(recipe.ingredients);
    if (missing.length === 0) { alert("You already have everything!"); return; }
    const newItems = missing.map(m => ({ id: (Date.now() + Math.random()).toString(), item: m.item, amount: m.amount, recipe: recipe.name, checked: false }));
    const updated = [...groceryList.filter(g => !newItems.find(n => n.item.toLowerCase() === g.item?.toLowerCase())), ...newItems];
    await saveGroceryToDb(updated);
    setGroceryList(updated);
    alert(`Added ${missing.length} items to grocery list!`);
  };

  const toggleGroceryItem = async (id) => {
    const updated = groceryList.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    await saveGroceryToDb(updated);
    setGroceryList(updated);
  };

  const removeGroceryItem = async (id) => {
    const updated = groceryList.filter(i => i.id !== id);
    await saveGroceryToDb(updated);
    setGroceryList(updated);
  };

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#888", fontFamily: "Georgia, serif" }}>Loading...</div>;

  if (view === "grocery") return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 520, margin: "0 auto", background: "#faf8f4", minHeight: "100vh", padding: "0 0 60px" }}>
      <div style={{ background: "#fff", borderBottom: "2px solid #e8e0d0", padding: "20px 20px 16px" }}>
        <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif", marginBottom: 8 }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>Grocery List</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#999", fontStyle: "italic" }}>{groceryList.filter(i => !i.checked).length} items remaining</p>
      </div>
      <div style={{ padding: "12px 16px" }}>
        {groceryList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#bbb", fontStyle: "italic", fontSize: 14 }}>No items yet.</div>
        ) : (
          <>
            {(() => {
              const groups = {};
              groceryList.forEach(i => { const key = i.recipe || "Other"; if (!groups[key]) groups[key] = []; groups[key].push(i); });
              return Object.entries(groups).map(([recipeName, items]) => (
                <div key={recipeName} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: "#bbb", textTransform: "uppercase", padding: "8px 0 6px", borderBottom: "1px solid #ece6da", marginBottom: 6 }}>{recipeName}</div>
                  {items.map(item => (
                    <div key={item.id} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12, border: "1px solid #ece6da", opacity: item.checked ? 0.5 : 1 }}>
                      <input type="checkbox" checked={item.checked || false} onChange={() => toggleGroceryItem(item.id)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: "#1a1a1a", textDecoration: item.checked ? "line-through" : "none" }}>{item.item}</span>
                        {item.amount && <span style={{ fontSize: 12, color: "#999", marginLeft: 8 }}>{item.amount}</span>}
                      </div>
                      <button onClick={() => removeGroceryItem(item.id)} style={{ background: "none", border: "none", color: "#ddd", cursor: "pointer", fontSize: 16 }}>✕</button>
                    </div>
                  ))}
                </div>
              ));
            })()}
            <button onClick={async () => { const updated = groceryList.filter(i => !i.checked); await saveGroceryToDb(updated); setGroceryList(updated); }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>Clear checked items</button>
          </>
        )}
      </div>
    </div>
  );

  if (view === "add") return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 520, margin: "0 auto", background: "#faf8f4", minHeight: "100vh", padding: "0 0 60px" }}>
      <div style={{ background: "#fff", borderBottom: "2px solid #e8e0d0", padding: "20px 20px 16px" }}>
        <button onClick={() => { setView("list"); setParsed(null); setInput(""); setImage(null); setImagePreview(null); }} style={{ background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif", marginBottom: 8 }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>Add Recipe</h1>
      </div>
      <div style={{ padding: 16 }}>
        {!parsed ? (
          <>
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e8e0d0", marginBottom: 12 }}>
              <label style={lStyle}>Paste recipe text</label>
              <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Paste a recipe here…" rows={6} style={{ width: "100%", background: "#faf8f4", border: "1px solid #e0d8cc", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "Georgia, serif", color: "#333", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e8e0d0", marginBottom: 16 }}>
              <label style={lStyle}>Or upload a photo of the recipe</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
              {imagePreview ? (
                <div>
                  <img src={imagePreview} alt="Recipe" style={{ width: "100%", borderRadius: 8, marginBottom: 8, maxHeight: 200, objectFit: "cover" }} />
                  <button onClick={() => { setImage(null); setImagePreview(null); }} style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#888", cursor: "pointer" }}>Remove photo</button>
                </div>
              ) : (
                <button onClick={() => fileRef.current.click()} style={{ width: "100%", padding: "14px", borderRadius: 8, border: "2px dashed #e0d8cc", background: "#faf8f4", color: "#aaa", fontSize: 14, cursor: "pointer", fontFamily: "Georgia, serif" }}>📷 Tap to upload photo</button>
              )}
            </div>
            <button onClick={parseRecipe} disabled={loading || (!input.trim() && !image)} style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: (!input.trim() && !image) ? "#ddd" : "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {loading ? "Reading recipe..." : "Parse Recipe ↗"}
            </button>
          </>
        ) : (
          <div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e8e0d0", marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{parsed.name}</div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#999", marginBottom: 12 }}>
                {parsed.servings && <span>🍽 {parsed.servings} servings</span>}
                {parsed.prepTime && <span>⏱ {parsed.prepTime}</span>}
                {parsed.cookTime && <span>🔥 {parsed.cookTime}</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Ingredients ({parsed.ingredients?.length})</div>
              {parsed.ingredients?.map((ing, i) => {
                const missing = !pantryItems.find(p => p.name.toLowerCase().includes(ing.item.toLowerCase()) || ing.item.toLowerCase().includes(p.name.toLowerCase()));
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #f5f0e8" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: missing ? "#ff7043" : "#66bb6a", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, flex: 1 }}>{ing.item}</span>
                    <span style={{ fontSize: 12, color: "#999" }}>{ing.amount}</span>
                    {missing && <span style={{ fontSize: 10, color: "#ff7043", fontWeight: 600 }}>NEED</span>}
                  </div>
                );
              })}
              <div style={{ marginTop: 10, fontSize: 12, color: "#ff7043" }}>🛒 {getMissingIngredients(parsed.ingredients || []).length} items will be added to your grocery list</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setParsed(null)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>Re-parse</button>
              <button onClick={saveRecipe} style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Georgia, serif" }}>Save Recipe & Update List</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (view === "detail" && selectedRecipe) return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 520, margin: "0 auto", background: "#faf8f4", minHeight: "100vh", padding: "0 0 60px" }}>
      <div style={{ background: "#fff", borderBottom: "2px solid #e8e0d0", padding: "20px 20px 16px" }}>
        <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "#999", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif", marginBottom: 8 }}>← Back</button>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>{selectedRecipe.name}</h1>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#999" }}>
          {selectedRecipe.servings && <span>🍽 {selectedRecipe.servings} servings</span>}
          {selectedRecipe.prepTime && <span>⏱ {selectedRecipe.prepTime}</span>}
          {selectedRecipe.cookTime && <span>🔥 {selectedRecipe.cookTime}</span>}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e8e0d0", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Ingredients</div>
          {selectedRecipe.ingredients?.map((ing, i) => {
            const missing = !pantryItems.find(p => p.name.toLowerCase().includes(ing.item.toLowerCase()) || ing.item.toLowerCase().includes(p.name.toLowerCase()));
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f5f0e8" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: missing ? "#ff7043" : "#66bb6a", flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1 }}>{ing.item}</span>
                <span style={{ fontSize: 12, color: "#999" }}>{ing.amount}</span>
              </div>
            );
          })}
        </div>
        {selectedRecipe.steps?.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e8e0d0", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Method</div>
            {selectedRecipe.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a1a1a", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700 }}>{i + 1}</div>
                <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.6 }}>{step}</p>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => addToGrocery(selectedRecipe)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>🛒 Add missing to list</button>
          <button onClick={() => { deleteRecipe(selectedRecipe.id); setView("list"); }} style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #ffcdd2", background: "#fff", color: "#e57373", fontSize: 13, cursor: "pointer", fontFamily: "Georgia, serif" }}>Delete</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "Georgia, serif", maxWidth: 520, margin: "0 auto", background: "#faf8f4", minHeight: "100vh", padding: "0 0 80px" }}>
      <div style={{ background: "#fff", borderBottom: "2px solid #e8e0d0", padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>Recipes</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#999", fontStyle: "italic" }}>{recipes.length} saved recipes</p>
          </div>
          <button onClick={() => setView("grocery")} style={{ background: "#f5f0e8", border: "1px solid #e8e0d0", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#666", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}>
            🛒 List {groceryList.filter(i => !i.checked).length > 0 ? `(${groceryList.filter(i => !i.checked).length})` : ""}
          </button>
        </div>
      </div>
      <div style={{ padding: "12px 16px" }}>
        {recipes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#bbb", fontStyle: "italic", fontSize: 14 }}>No recipes yet — add one and it'll check your pantry for what you need to buy.</div>
        ) : (
          recipes.map(recipe => {
            const missing = getMissingIngredients(recipe.ingredients || []);
            return (
              <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setView("detail"); }} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: "1px solid #e8e0d0", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{recipe.name}</div>
                    <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#999" }}>
                      {recipe.servings && <span>🍽 {recipe.servings} servings</span>}
                      {recipe.prepTime && <span>⏱ {recipe.prepTime}</span>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 12 }}>
                    {missing.length > 0
                      ? <span style={{ fontSize: 11, padding: "3px 8px", background: "#fff3e0", border: "1px solid #ffb74d", borderRadius: 20, color: "#e65100", fontWeight: 600 }}>🛒 {missing.length} needed</span>
                      : <span style={{ fontSize: 11, padding: "3px 8px", background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 20, color: "#2e7d32", fontWeight: 600 }}>✓ Ready to cook</span>
                    }
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <button onClick={() => setView("add")} style={{ position: "fixed", bottom: 24, right: "50%", transform: "translateX(50%)", maxWidth: 200, width: "calc(100% - 48px)", background: "#1a1a1a", border: "none", borderRadius: 50, padding: "14px 28px", color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "Georgia, serif", cursor: "pointer", boxShadow: "0 6px 24px rgba(0,0,0,0.2)" }}>
        + Add Recipe
      </button>
    </div>
  );
}

const lStyle = { fontSize: 12, color: "#888", display: "block", marginBottom: 6 };
