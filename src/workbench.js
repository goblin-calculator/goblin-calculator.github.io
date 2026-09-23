import { escapeHtml, fmtInt, COIN_ICON, BASE_STOCK_TOOLS, farmSyncExtractGameState } from "./calculator.js";

import { farmPanelGameState, farmPanelField } from "./inprogress.js";

import { $, getIcon } from "./ui.js";

// ---- Real Sunflower Land data, pulled from the game's own source ----
// src/features/game/types/tools.ts -> WORKBENCH_TOOLS + LOVE_ANIMAL_TOOLS
// (Pest Net excluded: it ships disabled:true in-game)
const WB_TOOLS = {
  land: [
    { name: "Axe", price: 20, ingredients: {} },
    { name: "Pickaxe", price: 20, ingredients: { Wood: 3 } },
    { name: "Stone Pickaxe", price: 20, ingredients: { Wood: 3, Stone: 5 } },
    { name: "Iron Pickaxe", price: 80, ingredients: { Wood: 3, Iron: 5 } },
    { name: "Gold Pickaxe", price: 100, ingredients: { Wood: 3, Gold: 3 } },
    { name: "Oil Drill", price: 100, ingredients: { Wood: 20, Iron: 9, Leather: 10 } }
  ],
  water: [
    { name: "Rod", price: 20, ingredients: { Wood: 3, Stone: 1 } },
    { name: "Crab Pot", price: 250, ingredients: { Feather: 5, Wool: 3 }, level: 18 },
    { name: "Mariner Pot", price: 500, ingredients: { Feather: 10, "Merino Wool": 10 }, level: 24 },
    { name: "Salt Rake", price: 20, ingredients: { Wood: 3 } }
  ],
  animal: [
    { name: "Petting Hand", price: 0, ingredients: {}, baseExp: 25 },
    { name: "Brush", price: 2000, ingredients: {}, baseExp: 40 },
    { name: "Music Box", price: 50000, ingredients: {}, baseExp: 50 }
  ]
};

const WB_TOOL_SECTION_LABELS = { land: "Land Tools", water: "Water Tools", animal: "Animal Care" };
const WB_TOOL_SECTION_ORDER = [ "land", "water", "animal" ];

// src/features/game/types/collectibles.ts -> HELIOS_BLACKSMITH_ITEMS
// boost text pulled from src/lib/i18n/dictionaries/en.json
const WB_BOOSTS = [
  { name: "Basic Scarecrow", coins: 0, ingredients: { Wood: 2 }, boost: "x0.8 Basic Crops Growth Time" },
  { name: "Scary Mike", coins: 4800, ingredients: { Wood: 30, Carrot: 50, Wheat: 10, Parsnip: 10 }, boost: "+0.2 Medium Crops" },
  { name: "Laurie the Chuckle Crow", coins: 14400, ingredients: { Wood: 100, Radish: 60, Kale: 40, Wheat: 20 }, boost: "+0.2 Advanced Crops" },
  { name: "Bale", coins: 1600, ingredients: { Egg: 200, Wheat: 200, Wood: 100, Stone: 30 }, boost: "+0.1 Egg Yield (+0.1 Milk with Bale Economy skill)" },
  { name: "Immortal Pear", coins: 0, ingredients: { Gold: 5, Apple: 10, Blueberry: 10, Orange: 10 }, boost: "+1 Fruit Patch Harvest per seed" },
  { name: "Squirrel", coins: 1000, ingredients: { Wood: 100 }, boost: "+0.1 Wood" },
  { name: "Iron Beetle", coins: 2000, ingredients: { Iron: 20 }, boost: "+0.1 Iron" },
  { name: "Gold Beetle", coins: 10000, ingredients: { Gold: 20 }, boost: "+0.1 Gold" },
  { name: "Fairy Circle", coins: 25000, ingredients: { "Wild Mushroom": 20 }, boost: "+0.2 Wild Mushroom" },
  { name: "Macaw", coins: 10000, ingredients: { Apple: 10, Blueberry: 10, Orange: 10, Banana: 10, Tomato: 10, Lemon: 10 }, boost: "+0.1 Fruit Patch Yield" },
  { name: "Butterfly", coins: 15000, ingredients: {}, boost: "20% chance of +1 flower" },
  { name: "Salt Sculpture", coins: 2000, ingredients: { "Refined Salt": 30 }, boost: "Cumulative Salt & Aging buffs per level" }
];

// src/features/game/types/buildings.ts -> BUILDINGS (starter/home buildings excluded: Town Center, Market, Fire Pit, Workbench, Tent, House, Manor, Mansion)
const WB_BUILDINGS = [
  { name: "Water Well", level: 2, coins: 100, ingredients: { Wood: 5 } },
  { name: "Hen House", level: 6, coins: 100, ingredients: { Wood: 30, Iron: 5, Gold: 5 } },
  { name: "Kitchen", level: 5, coins: 10, ingredients: { Wood: 30, Stone: 5 } },
  { name: "Compost Bin", level: 7, coins: 0, ingredients: { Wood: 5, Stone: 5 } },
  { name: "Bakery", level: 8, coins: 200, ingredients: { Wood: 50, Stone: 20, Gold: 5 } },
  { name: "Fish Market", level: 10, coins: 0, ingredients: { Wood: 50, Iron: 10, Gold: 5 } },
  { name: "Turbo Composter", level: 12, coins: 0, ingredients: { Wood: 50, Stone: 25 } },
  { name: "Deli", level: 16, coins: 300, ingredients: { Wood: 50, Stone: 50, Gold: 10 } },
  { name: "Premium Composter", level: 18, coins: 0, ingredients: { Gold: 50 } },
  { name: "Warehouse", level: 20, coins: 0, ingredients: { Wood: 250, Stone: 150, Potato: 5000, Pumpkin: 2000, Wheat: 500, Kale: 100 } },
  { name: "Smoothie Shack", level: 23, coins: 0, ingredients: { Wood: 25, Stone: 25, Iron: 10 } },
  { name: "Toolshed", level: 25, coins: 0, ingredients: { Wood: 500, Iron: 30, Gold: 25, Axe: 100, Pickaxe: 50 } },
  { name: "Barn", level: 30, coins: 200, ingredients: { Wood: 150, Iron: 10, Gold: 10 } },
  { name: "Crop Machine", level: 35, coins: 8000, ingredients: { Wood: 1250, Iron: 125, Crimstone: 50 } },
  { name: "Greenhouse", level: 46, coins: 4800, ingredients: { Wood: 500, Stone: 100, Crimstone: 25, Oil: 100 } },
  { name: "Crafting Box", level: 6, coins: 0, ingredients: { Wood: 100, Stone: 5 } },
  { name: "Pet House", level: 0, coins: 5000, ingredients: { Wood: 200, Stone: 100 } },
  { name: "Aging Shed", level: 0, coins: 200, ingredients: { Wood: 30 } }
];

function wbGetOwnedQty(name) {
  if (!farmPanelGameState || typeof farmSyncExtractGameState !== "function") return 0;
  const g = farmSyncExtractGameState(farmPanelGameState);
  if (!g) return 0;
  const inv = typeof farmPanelField === "function" ? farmPanelField(g, "inventory") : g.inventory;
  if (!inv || typeof inv !== "object") return 0;
  const raw = inv[name];
  const q = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  return isNaN(q) ? 0 : q;
}

function wbIngredientsHtml(ingredients) {
  const keys = Object.keys(ingredients || {});
  if (!keys.length) return '<div class="wb-ing-row wb-ing-none">No ingredients</div>';
  const chips = keys.map(name => {
    const need = ingredients[name];
    const have = wbGetOwnedQty(name);
    const short = have < need;
    return `<div class="wb-ing-chip${short ? " wb-ing-short" : ""}" title="${escapeHtml(name)}">
      <span class="wb-ing-icon">${getIcon(name)}</span>
      <span class="wb-ing-qty">${fmtInt(have)}/${fmtInt(need)}</span>
    </div>`;
  }).join("");
  return `<div class="wb-ing-row">${chips}</div>`;
}

function wbItemTileHtml(item, showRestock) {
  const levelBadge = item.level ? `<div class="wb-level-badge">Lvl ${item.level}</div>` : "";
  const boostBadge = item.boost ? `<div class="wb-boost-badge">${escapeHtml(item.boost)}</div>` : "";
  const expBadge = item.baseExp !== undefined ? `<div class="wb-exp-badge">+${fmtInt(item.baseExp)} Animal XP (base)</div>` : "";
  const priceHtml = item.price !== undefined
    ? `<div class="cb-item-cost">${fmtInt(item.price)} ${COIN_ICON}</div>`
    : item.coins !== undefined
      ? `<div class="cb-item-cost">${fmtInt(item.coins)} ${COIN_ICON}</div>`
      : "";
  const baseStock = showRestock ? BASE_STOCK_TOOLS[item.name] : undefined;
  const restockHtml = baseStock !== undefined
    ? `<div class="wb-restock-note">Base Restock Stock: ${fmtInt(baseStock)}</div>`
    : "";
  return `<div class="cb-item wb-item" title="${escapeHtml(item.name)}">
    <div class="cb-item-icon wb-item-icon">${getIcon(item.name)}</div>
    <div class="cb-item-name">${escapeHtml(item.name)}</div>
    ${levelBadge}
    ${priceHtml}
    ${boostBadge}
    ${expBadge}
    ${wbIngredientsHtml(item.ingredients)}
    ${restockHtml}
  </div>`;
}

function wbToolsSectionHtml() {
  const sections = WB_TOOL_SECTION_ORDER.map(key => `
    <div class="wb-tool-section">
      <div class="wb-tool-section-label">${escapeHtml(WB_TOOL_SECTION_LABELS[key])}</div>
      <div class="cb-grid">${WB_TOOLS[key].map(item => wbItemTileHtml(item, true)).join("")}</div>
    </div>
  `).join("");
  return `<div class="cb-column wb-container">
    <div class="cb-column-label">Tools</div>
    ${sections}
  </div>`;
}

function wbBoostSectionHtml() {
  return `<div class="cb-column wb-container">
    <div class="cb-column-label">Boost</div>
    <div class="cb-note wb-boost-note">All 12 items below craft from the Workbench's Boost tab on every island (Basic, Spring, Desert, Volcano and beyond) — none of them are land-locked. If an item isn't showing for you, scroll the panel further; it's not hidden behind a specific island.</div>
    <div class="cb-grid">${WB_BOOSTS.map(item => wbItemTileHtml(item)).join("")}</div>
  </div>`;
}

function wbBuildSectionHtml() {
  return `<div class="cb-column wb-container">
    <div class="cb-column-label">Build</div>
    <div class="cb-grid">${WB_BUILDINGS.map(item => wbItemTileHtml(item)).join("")}</div>
  </div>`;
}

export function renderWorkbenchPanel() {
  const body = $("workbenchBody");
  if (!body) return;
  body.innerHTML = `
    <div class="cb-title">Workbench Recipes</div>
    <div class="cb-note">Every item below is the real Workbench data (Tools, Boost &amp; Build tabs) pulled from the game's own source, shown as base values only — not affected by any of your active boosts. Ingredient chips show YOUR-QTY/NEEDED-QTY — the first number is synced live from your farm's inventory, the second is the fixed recipe requirement. A red chip means you're short on that material. Tools also list their Base Restock Stock for reference only (see the Boost panel's Stocks tab for live restock math). Animal Care tools show their base Animal XP per use (before any Heartwarming Instruments skill or animal-specific bonuses).</div>
    <div class="wb-columns">${wbToolsSectionHtml()}${wbBoostSectionHtml()}${wbBuildSectionHtml()}</div>
  `;
}
