"use client";
import { useState } from "react";
import PantryTracker from "../components/PantryTracker";
import FoodTracker from "../components/FoodTracker";
import MealPlanner from "../components/MealPlanner";
import EmailSettings from "../components/EmailSettings";
import Recipes from "../components/Recipes";

const TABS = [
  { id: "pantry", label: "🗄 Pantry", component: PantryTracker },
  { id: "food", label: "🥗 Food Log", component: FoodTracker },
  { id: "meals", label: "🍽 Meals", component: MealPlanner },
  { id: "recipes", label: "📖 Recipes", component: Recipes },
  { id: "email", label: "📧 Emails", component: EmailSettings },
];

export default function Home() {
  const [active, setActive] = useState("pantry");
  const ActiveComponent = TABS.find(t => t.id === active).component;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", minHeight: "100vh" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#fff", borderBottom: "1px solid #e8e0d0",
        display: "flex",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            flex: 1, padding: "10px 2px", border: "none", background: "transparent",
            fontSize: 11, cursor: "pointer", fontFamily: "Georgia, serif",
            color: active === t.id ? "#1a1a1a" : "#aaa",
            fontWeight: active === t.id ? 700 : 400,
            borderBottom: active === t.id ? "3px solid #1a1a1a" : "3px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </nav>
      <ActiveComponent />
    </div>
  );
}
