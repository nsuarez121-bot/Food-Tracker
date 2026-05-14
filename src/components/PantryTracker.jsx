"use client";
import { useState, useEffect } from "react";

const STORAGE_KEY = "pantry-inventory-v1";

const LOCATIONS = [
  { id: "fridge", label: "Fridge", emoji: "🧊", color: "#4fc3f7" },
  { id: "freezer", label: "Freezer", emoji: "❄️", color: "#81d4fa" },
  { id: "cupboard", label: "Cupboard", emoji: "🗄️", color: "#ffb74d" },
];

const CATEGORIES = ["Produce", "Dairy", "Meat & Fish", "Leftovers", "Drinks", "Condiments", "Grains & Pasta", "Snacks", "Canned & Jars", "Frozen Meals", "Other"];

const daysUntilExpiry = (da
