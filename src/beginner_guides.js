import { ANIMAL_DATA, ASCENSION_RANK_DATA, BASE_CROPS, BASE_CROP_MACHINE, BOOSTS, FEED_RECIPE, FLOWER_ICON, RESOURCE_DATA, SKILL_BOOSTS, computeCropMachineBatch, currentSeason, escapeHtml, fmtInt, formatDuration, gatherAllProfitItems, computeGuideResourceFallback, computeResourceFigures, isBoostActive, isCropInSeason, isCropMachineUnlocked, isFruitInSeason, isSkillActive, profileBuildFilterMatches, profileGetG } from "./calculator.js";

import { findCosmeticPriceForName, findLiveNftPriceForName, findLivePriceForName } from "./prices.js";

import { dailyProfitGuideSnapshot, getBoostIcon, getIcon } from "./ui.js";

const GUIDE_TABS = [ [ "leveling", "Leveling" ], [ "farming", "Farming" ], [ "mining", "Mining" ], [ "animals", "Animals" ] ];

const FARM_STRATS = {
  balance: {
    label: "Balance Farming",
    desc: "A balanced crop setup with strong yield and speed for every crop tier. It uses most of the Crops skill tree, so it suits farms that grow a mix of crops.",
    skills: [ [ "skill_old_farmer", 1 ], [ "skill_green_thumb", 1 ], [ "skill_bettys_friend", 1 ], [ "skill_young_farmer", 1 ], [ "skill_experienced_farmer", 1 ], [ "skill_lauries_gains", 1 ], [ "skill_strong_roots", 1 ], [ "skill_horror_mike", 1 ], [ "skill_instant_growth", 1 ], [ "skill_acre_farm", 1 ], [ "skill_hectare_farm", 1 ] ]
  },
  basic: {
    label: "Basic & Medium Farming",
    desc: "Built for Basic and Medium crops. It needs fewer skill points and puts your shards into Hectare Farm for a larger boosted area.",
    skills: [ [ "skill_green_thumb", 1 ], [ "skill_bettys_friend", 1 ], [ "skill_young_farmer", 1 ], [ "skill_experienced_farmer", 1 ], [ "skill_chonky_scarecrow", 1 ], [ "skill_horror_mike", 1 ], [ "skill_instant_growth", 1 ], [ "skill_hectare_farm", 3 ] ]
  },
  advance: {
    label: "Advance Farming",
    desc: "Built for Advanced crops. It focuses on Old Farmer, Laurie's Gains and Strong Roots, and puts your shards into Acre Farm.",
    skills: [ [ "skill_green_thumb", 1 ], [ "skill_bettys_friend", 1 ], [ "skill_old_farmer", 1 ], [ "skill_lauries_gains", 1 ], [ "skill_strong_roots", 1 ], [ "skill_instant_growth", 1 ], [ "skill_acre_farm", 3 ] ]
  }
};

const FARM_CATEGORIES = [ {
  id: "crops",
  title: "Crops",
  icon: "Sunflower",
  skillCat: "crops",
  boostCat: "crops"
}, {
  id: "fruits",
  title: "Fruits",
  icon: "Apple",
  skillCat: "fruitpatch",
  boostCat: "fruits"
}, {
  id: "greenhouse",
  title: "Greenhouse",
  icon: "Greenhouse",
  skillCat: "greenhouse",
  boostCat: "greenhouse"
}, {
  id: "machine",
  title: "Crop Machine",
  icon: "Crop Machine",
  skillCat: "machine",
  boostCat: "cropmachine"
} ];

const MINING_CATEGORIES = [ {
  id: "Wood",
  title: "Tree",
  icon: "Wood"
}, {
  id: "Stone",
  title: "Stone",
  icon: "Stone"
}, {
  id: "Iron",
  title: "Iron",
  icon: "Iron"
}, {
  id: "Gold",
  title: "Gold",
  icon: "Gold"
}, {
  id: "Crimstone",
  title: "Crimstone",
  icon: "Crimstone"
}, {
  id: "Obsidian",
  title: "Obsidian",
  icon: "Obsidian",
  where: "Lava Pit"
}, {
  id: "Sunstone",
  title: "Sunstone",
  icon: "Sunstone",
  special: "Sunstone is not tradable, so its market profit is not what matters. You spend it to buy nodes and expand your mining, which makes it one of the most valuable resources in the game."
}, {
  id: "Oil",
  title: "Oil",
  icon: "Oil",
  special: "Oil is not tradable, so its market profit is not what matters. It is used in many parts of the game, such as speeding up cooking and unlocking upgrades, which makes it one of the most valuable resources in the game."
} ];

const FREE_TOOLS = {
  Axe: 50,
  Pickaxe: 15,
  "Stone Pickaxe": 5,
  "Iron Pickaxe": 1,
  Rod: 10,
  "Sand Shovel": 5
};

const ANIMAL_BUILDINGS = {
  chicken: "Hen House",
  cow: "Barn",
  sheep: "Barn"
};

const CROP_TIERS = [ [ "Basic", "Basic" ], [ "Medium", "Medium" ], [ "Advanced", "Advance" ] ];

let farmStrat = "balance";

let farmStratTab = "skills";

const catTabs = {};

export function guideTabs() {
  return GUIDE_TABS;
}

export function setFarmStrat(v) {
  farmStrat = FARM_STRATS[v] ? v : "balance";
}

export function getFarmStrat() {
  return farmStrat;
}

export function setFarmStratTab(v) {
  farmStratTab = v === "boost" ? "boost" : "skills";
}

export function setCatTab(cat, v) {
  catTabs[cat] = v === "boost" ? "boost" : "skills";
}

export function farmStrategyButtons() {
  return Object.keys(FARM_STRATS).map(k => [ k, FARM_STRATS[k].label ]);
}

function row(inner) {
  return `<div class="fd-item-row bg-line">${inner}</div>`;
}

function flower(v) {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  const text = a >= 100 ? fmtInt(n) : a >= 1 ? n.toFixed(2) : n.toFixed(4);
  return `${text}${FLOWER_ICON}`;
}

function boostPrice(name) {
  const finders = [ findLiveNftPriceForName, findCosmeticPriceForName, findLivePriceForName ];
  for (const fn of finders) {
    try {
      const v = Number(fn(name));
      if (v > 0) return v;
    } catch (e) {}
  }
  return 0;
}

function skillById(id) {
  return SKILL_BOOSTS.find(s => s.id === id) || null;
}

function ownedRank(s) {
  const g = profileGetG();
  const map = g && g.bumpkin && g.bumpkin.skills && typeof g.bumpkin.skills === "object" ? g.bumpkin.skills : {};
  const byName = Number(map[s.name]) || 0;
  if (byName > 0) return byName;
  return isSkillActive(s.id) ? 1 : 0;
}

function skillWhere(s) {
  const cat = s.skillCategory || "";
  return `Skill tree: ${cat.charAt(0).toUpperCase()}${cat.slice(1)} · Tier ${s.skillTier}`;
}

function trimNum(v) {
  return String(Math.round(Math.abs(v) * 1e4) / 1e4);
}

function signedNum(v) {
  return `${v < 0 ? "-" : "+"}${trimNum(v)}`;
}

function skillNoteAtRank(s, rank) {
  const base = s.note || "";
  const data = ASCENSION_RANK_DATA[s.id];
  const r = Math.min(Math.max(Number(rank) || 1, 1), 3);
  if (!data || r <= 1) return base;
  if (s.scope === "tierEffects" && data.values && !Array.isArray(data.values)) {
    const at = key => data.values[`tierEffects.${key}`][r - 1];
    const adv = at("Advanced");
    const bas = at("Basic");
    if (adv > 0) return `${signedNum(adv)} Advanced crop yield / ${signedNum(bas)} Basic & Medium crop yield (stacks with Hectare Farm)`;
    return `${signedNum(bas)} Basic & Medium crop yield / ${signedNum(adv)} Advanced crop yield (stacks with Acre Farm)`;
  }
  if (!Array.isArray(data.values)) return base;
  const v = data.values[r - 1];
  let note = base;
  const size = Array.isArray(s.aoeSizeByRank) ? s.aoeSizeByRank[r - 1] : 0;
  if (size) note = note.replace(/\d+x\d+ \(\d+ plots\)/, `${size}x${size} (${size * size} plots)`);
  if (s.id === "skill_chonky_scarecrow") return v > 0 ? `${note}; ${signedNum(v)} Basic crop yield inside the area` : note;
  if (data.field === "extraYieldAdd") return note.replace(/additional [+-]?[\d.]+/, `additional ${signedNum(v)}`);
  if (data.field === "yieldAdd") return note.replace(/^[+-]?[\d.]+/, signedNum(v));
  if (data.field === "timeMult") return note.replace(/^-[\d.]+%/, `-${trimNum((1 - v) * 100)}%`);
  return base;
}

let skillLevelLookup = null;

export function setSkillLevelLookup(fn) {
  skillLevelLookup = typeof fn === "function" ? fn : null;
}

function skillRow(s, rank, showRank) {
  const have = ownedRank(s);
  const lvText = skillLevelLookup ? skillLevelLookup(s.id, rank) : "";
  const extra = rank > 1 && have >= 1 ? `Rank-up: ${fmtInt((rank - have) * s.skillTier)} shard${(rank - have) * s.skillTier > 1 ? "s" : ""}` : `${fmtInt(s.skillTier)} point${s.skillTier > 1 ? "s" : ""}`;
  return row(`<span class="fd-item-main">${getBoostIcon(s.name)} <strong>${escapeHtml(s.name)}${showRank ? ` [${rank}]` : ""}</strong><span class="bg-why">${escapeHtml(skillNoteAtRank(s, rank))}</span><span class="bg-why">${escapeHtml(skillWhere(s))}</span></span><span class="fd-item-cost bg-right">${escapeHtml(extra)}${lvText ? `<br>${escapeHtml(lvText)}` : ""}</span>`);
}

function boostCostText(b) {
  const price = boostPrice(b.name);
  if (!(price > 0)) return "No market price found";
  return `Market price ${price < 1 ? price.toFixed(4) : price.toFixed(2)}${FLOWER_ICON}`;
}

function boostRows(list) {
  if (!list.length) return `<div class="fd-empty-note">You already have every boost for this.</div>`;
  const sorted = list.slice().sort((a, b) => {
    const pa = boostPrice(a.name);
    const pb = boostPrice(b.name);
    if (pa > 0 !== pb > 0) return pa > 0 ? -1 : 1;
    return pa - pb;
  });
  return sorted.slice(0, 40).map(b => row(`<span class="fd-item-main">${getIcon(b.name)} <strong>${escapeHtml(b.name)}</strong><span class="bg-why">${escapeHtml(b.note || "")}</span><span class="bg-why">${boostCostText(b)}</span></span>`)).join("") + (sorted.length > 40 ? `<div class="bg-mini">+${fmtInt(sorted.length - 40)} more in the Boost panel.</div>` : "");
}

function boostsFor(category, tab, filterId) {
  return BOOSTS.filter(b => {
    if ((b.category || "crops") !== category || b.hideInPanel || b.skillTier || SKILL_BOOSTS.some(s => s.id === b.id)) return false;
    if (/\(|Shrine|Totem|Hourglass/.test(b.name)) return false;
    if (isBoostActive(b.id)) return false;
    return filterId ? profileBuildFilterMatches(b, tab, filterId) : true;
  });
}

function skillsFor(skillCats, tab, filterId) {
  const seen = new Set;
  return SKILL_BOOSTS.filter(s => {
    if (seen.has(s.id)) return false;
    if (skillCats.indexOf(s.skillCategory) < 0 || s.hideInPanel || s.isActiveAbility) return false;
    if (/convenience|no yield\/time change/i.test(s.note || "")) return false;
    if (ownedRank(s) >= 1) return false;
    if (filterId && !profileBuildFilterMatches(s, tab, filterId)) return false;
    seen.add(s.id);
    return true;
  }).sort((a, b) => a.skillTier - b.skillTier);
}

function skillGroups(list) {
  if (!list.length) return `<div class="fd-empty-note">You already own every skill for this.</div>`;
  let html = "";
  [ 1, 2, 3 ].forEach(t => {
    const items = list.filter(s => s.skillTier === t);
    if (items.length) html += `<div class="fd-section-label">Tier ${t}</div>${items.map(s => skillRow(s, 1, false)).join("")}`;
  });
  return html;
}

function pickRow(it, mode, extra) {
  const per = mode === "machine" ? `${formatDuration(it.timeSec)} per batch` : `${fmtInt(Math.round(it.cyclesPerDay * 100) / 100)} cycles / 24h`;
  const hold = it.count > 0 ? ` · your ${fmtInt(it.count)} ${escapeHtml(it.countLabel || "node")}${it.count > 1 ? "s" : ""}: <strong>${flower(it.holdingProfit24h)}</strong>` : "";
  return row(`<span class="fd-item-main">${it.icon || ""} <strong>${escapeHtml(it.name)}</strong><span class="bg-why">${per}${hold}</span>${extra ? `<span class="bg-why">${extra}</span>` : ""}</span><span class="fd-item-cost bg-right"><strong>+${flower(it.unitProfit24h)}</strong><br>per ${escapeHtml((it.countLabel || "node").toLowerCase())} / 24h</span>`);
}

function categoryHtml(cat, picks, verdictNote, skills, boosts, mode) {
  const profitable = picks.length > 0;
  const tab = catTabs[cat.id] || "skills";
  const tabs = [ [ "skills", "Must have skills" ], [ "boost", "Must have boosts" ] ].map(t => `<button type="button" data-bg-ctab="${escapeHtml(cat.id)}|${t[0]}" class="fd-lb-tab${tab === t[0] ? " active" : ""}">${t[1]}</button>`).join("");
  const status = profitable ? `<span class="bg-label bg-best">profitable</span>` : `<span class="bg-label bg-loss">not recommended</span>`;
  const body = profitable ? `<div class="fd-section-label">Most profitable right now</div>${picks.map(p => pickRow(p, mode)).join("")}<div class="bg-mini">${verdictNote}</div>` : `<div class="bg-mini"><strong>${escapeHtml(cat.title)} is not recommended on your current farm.</strong> ${skills.length || boosts.length ? "It loses money unless you get the skills and boosts below." : "It still loses money at current market prices, even with all your skills and boosts."}</div>`;
  const need = profitable ? `These make ${escapeHtml(cat.title.toLowerCase())} even better. Skills and boosts you already own are hidden.` : `Get these first, then ${escapeHtml(cat.title.toLowerCase())} can become profitable.`;
  return `<div class="fd-container is-own bg-cat"><div class="fd-container-head"><span class="fd-container-title">${getIcon(cat.icon) || ""} ${escapeHtml(cat.title)} ${status}</span></div>${body}<div class="bg-mini">${need}</div><div class="bg-switcher bg-modes">${tabs}</div><div class="bg-pane">${tab === "boost" ? boostRows(boosts) : skillGroups(skills)}</div></div>`;
}

function perUnitProfit(i) {
  return i.count > 0 ? i.holdingProfit24h / i.count : i.unitProfit24h;
}

function topPicks(items, filter) {
  return items.filter(filter).map(i => Object.assign({}, i, {
    unitProfit24h: perUnitProfit(i)
  })).filter(i => i.unitProfit24h > 0).sort((a, b) => b.unitProfit24h - a.unitProfit24h).slice(0, 3);
}

function tierSkills(tiers) {
  const seen = new Set;
  const out = [];
  tiers.forEach(t => skillsFor([ "crops" ], "crops", t).forEach(s => {
    if (seen.has(s.id)) return;
    seen.add(s.id);
    out.push(s);
  }));
  return out.sort((a, b) => a.skillTier - b.skillTier);
}

function tierBoosts(tiers) {
  const seen = new Set;
  const out = [];
  tiers.forEach(t => boostsFor("crops", "crops", t).forEach(b => {
    if (seen.has(b.id)) return;
    seen.add(b.id);
    out.push(b);
  }));
  return out;
}

function capByFreeSeeds(ctx, list) {
  if (!ctx.free) return list;
  return list.map(p => {
    const supply = ctx.freeSeeds(p.name);
    const plots = p.count > 0 ? p.count : 1;
    const need = plots * p.cyclesPerDay;
    const factor = need > 0 ? Math.min(1, supply / need) : 1;
    return Object.assign({}, p, {
      freeSupply: supply,
      capFrom: p.cyclesPerDay,
      cyclesPerDay: p.cyclesPerDay * factor,
      unitProfit24h: p.unitProfit24h * factor,
      holdingProfit24h: p.holdingProfit24h * factor,
      capped: factor < 1
    });
  });
}

function freeSeedNote(ctx, p) {
  if (!ctx.free) return "";
  const supply = fmtInt(p.freeSupply);
  if (!p.capped) return `Free seeds: ${supply} per day, enough for all your plots`;
  return `Free seeds: ${supply} per day only cover ${fmtInt(Math.round(p.cyclesPerDay * 100) / 100)} of ${fmtInt(Math.round(p.capFrom))} cycles per plot, so profit is capped to the free seeds`;
}

function cropTierBlock(items, ctx, tier) {
  const base = items.filter(i => i.category === "Crop" && (BASE_CROPS[i.name] || {}).tier === tier[0] && isCropInSeason(i.name, currentSeason) && ctx.seedLevel(i.name) <= ctx.level);
  const pool = base.filter(i => ctx.seedAvailable(i.name));
  const picks = capByFreeSeeds(ctx, topPicks(pool, () => true));
  const title = escapeHtml(tier[1]);
  const noFree = ctx.free && base.length > 0 && pool.length === 0;
  const status = noFree ? `<span class="bg-label bg-loss">not doable free</span>` : picks.length ? `<span class="bg-label bg-best">recommended</span>` : `<span class="bg-label bg-loss">not recommended</span>`;
  let body;
  if (noFree) body = `<div class="bg-mini"><strong>${title} crops cannot be planted in Free to Play.</strong> Their seeds have no free daily supply, so they need a Gem restock. Switch to Invested to see them.</div>`; else if (picks.length) body = picks.map(p => pickRow(p, "plain", freeSeedNote(ctx, p))).join(""); else if (pool.length) body = `<div class="bg-mini"><strong>${title} crops lose money on your current farm.</strong> Planting them costs more than they earn until you get the skills and boosts below.</div>`; else body = `<div class="bg-mini"><strong>No ${title} crop is available to plant right now.</strong> They are locked by your level or out of season.</div>`;
  return {
    losing: pool.length > 0 && picks.length === 0 && !noFree,
    html: `<div class="bg-tier"><div class="fd-section-label">${title} crops ${status}</div>${body}</div>`
  };
}

function cropsHtml(items, ctx) {
  const cat = FARM_CATEGORIES[0];
  const tab = catTabs[cat.id] || "skills";
  const blocks = CROP_TIERS.map(t => ({
    tier: t,
    res: cropTierBlock(items, ctx, t)
  }));
  const losing = blocks.filter(b => b.res.losing).map(b => b.tier);
  const scope = losing.length ? losing : CROP_TIERS;
  const scopeIds = scope.map(t => t[0]);
  const skills = tierSkills(scopeIds);
  const boosts = tierBoosts(scopeIds);
  const names = scope.map(t => t[1]).join(", ");
  const need = losing.length ? `Get these first, then ${escapeHtml(names)} crops can become profitable.` : `These make your crops even better. Skills and boosts you already own are hidden.`;
  const tabs = [ [ "skills", "Must have skills" ], [ "boost", "Must have boosts" ] ].map(t => `<button type="button" data-bg-ctab="${escapeHtml(cat.id)}|${t[0]}" class="fd-lb-tab${tab === t[0] ? " active" : ""}">${t[1]}</button>`).join("");
  return `<div class="fd-container is-own bg-cat"><div class="fd-container-head"><span class="fd-container-title">${getIcon(cat.icon) || ""} ${escapeHtml(cat.title)}</span></div>${blocks.map(b => b.res.html).join("")}<div class="bg-mini">Skills for your selected strategy are listed in the strategy box.</div><div class="bg-mini">${need}</div><div class="bg-switcher bg-modes">${tabs}</div><div class="bg-pane">${tab === "boost" ? boostRows(boosts) : skillGroups(skills)}</div></div>`;
}

function farmingHtml(ctx) {
  const items = gatherAllProfitItems();
  const strat = FARM_STRATS[farmStrat];
  const stratTabs = [ [ "skills", "Skills" ], [ "boost", "Boost" ] ].map(t => `<button type="button" data-bg-fstab="${t[0]}" class="fd-lb-tab${farmStratTab === t[0] ? " active" : ""}">${t[1]}</button>`).join("");
  const stratButtons = farmStrategyButtons().map(b => `<button type="button" data-bg-fstrat="${b[0]}" class="fd-lb-tab${farmStrat === b[0] ? " active" : ""}">${escapeHtml(b[1])}</button>`).join("");
  const missing = strat.skills.map(t => [ skillById(t[0]), t[1] ]).filter(t => t[0] && ownedRank(t[0]) < t[1]);
  const owned = strat.skills.length - missing.length;
  let stratBody;
  if (farmStratTab === "boost") stratBody = boostRows(boostsFor("crops", "crops", null)); else {
    let html = `<div class="fd-section-label">Crops</div>`;
    [ 1, 2, 3 ].forEach(t => {
      const list = missing.filter(m => m[0].skillTier === t);
      if (list.length) html += `<div class="fd-section-label">Tier ${t}</div>${list.map(m => skillRow(m[0], m[1], true)).join("")}`;
    });
    stratBody = missing.length ? html : `<div class="fd-empty-note">You already own every skill of this build.</div>`;
  }
  const stratBox = `<div class="fd-container is-own bg-strat"><div class="fd-container-head"><span class="fd-container-title">${escapeHtml(strat.label)}</span></div><div class="bg-mini bg-strat-desc">${escapeHtml(strat.desc)}</div><div class="bg-mini">You already own ${fmtInt(owned)} of ${fmtInt(strat.skills.length)} skills of this build. Skills you own are hidden. Higher tiers need points spent in the lower tiers of the same tree.</div><div class="bg-switcher bg-modes">${stratTabs}</div><div class="bg-pane">${stratBody}</div></div>`;
  const pickBox = `<div class="fd-container is-own bg-strat bg-strat-pick"><div class="fd-container-head"><span class="fd-container-title">Farming Strategy</span></div><div class="bg-switcher bg-strats">${stratButtons}</div></div>`;
  const top = `<div class="bg-farm-top">${pickBox}${stratBox}</div>`;
  const out = [];
  FARM_CATEGORIES.forEach(cat => {
    if (cat.id === "crops") {
      out.push(cropsHtml(items, ctx));
      return;
    }
    let picks = [];
    let mode = "plain";
    if (cat.id === "fruits") picks = topPicks(items, i => i.category === "Fruit" && isFruitInSeason(i.name, currentSeason) && ctx.seedLevel(i.name) <= ctx.level && ctx.seedAvailable(i.name));
    else if (cat.id === "greenhouse") picks = topPicks(items, i => i.category === "Greenhouse");
    else {
      mode = "machine";
      picks = Object.keys(BASE_CROP_MACHINE).filter(n => isCropMachineUnlocked(n) && ctx.seedAvailable(n)).map(n => {
        const base = BASE_CROP_MACHINE[n];
        const b = computeCropMachineBatch(n, base.seedQty);
        return b ? {
          name: n,
          icon: getIcon(n),
          timeSec: b.timeSec,
          unitProfit24h: b.timeSec > 0 ? b.profitFlower / b.timeSec * 86400 : 0,
          count: 0,
          countLabel: "machine"
        } : null;
      }).filter(Boolean).filter(i => i.unitProfit24h > 0).sort((a, b) => b.unitProfit24h - a.unitProfit24h).slice(0, 3);
    }
    const skills = skillsFor([ cat.skillCat ], null, null);
    const boosts = boostsFor(cat.boostCat, null, null);
    if (ctx.free && (cat.id === "fruits" || cat.id === "greenhouse")) {
      const v = linkedVerdict(cat, null, null, `Its seeds have no free daily supply, so they need a Gem restock.`);
      out.push(linkedCategoryHtml(cat, v, skills, boosts, "", "node"));
      return;
    }
    const note = "Profit is per 24 hours after seed cost, using your current skills and boosts.";
    out.push(categoryHtml(cat, picks, note, skills, boosts, mode));
  });
  return `${top}<div class="bg-cat-grid">${out.join("")}</div>`;
}

function linkedVerdict(cat, entry, fallbackName, lockReason) {
  if (lockReason) {
    return {
      status: "locked",
      profitable: false,
      net: null,
      count: 0,
      source: "locked",
      reason: lockReason
    };
  }
  if (cat.special) {
    return {
      status: "special",
      profitable: true,
      net: entry && entry.net24h != null ? entry.net24h : null,
      count: entry ? entry.count : 0,
      source: "special"
    };
  }
  if (entry && entry.net24h != null) {
    return {
      status: entry.net24h > 0 ? "profit" : "loss",
      profitable: entry.net24h > 0,
      net: entry.net24h,
      count: entry.count,
      source: "panel"
    };
  }
  const est = fallbackName ? computeGuideResourceFallback(fallbackName) : null;
  if (est != null) {
    return {
      status: est > 0 ? "profit" : "loss",
      profitable: est > 0,
      net: est,
      count: 0,
      source: "estimate"
    };
  }
  return {
    status: "nodata",
    profitable: false,
    net: null,
    count: 0,
    source: "none"
  };
}

function linkedCategoryHtml(cat, v, skills, boosts, note, unitLabel) {
  const tab = catTabs[cat.id] || "skills";
  const tabs = [ [ "skills", "Must have skills" ], [ "boost", "Must have boosts" ] ].map(t => `<button type="button" data-bg-ctab="${escapeHtml(cat.id)}|${t[0]}" class="fd-lb-tab${tab === t[0] ? " active" : ""}">${t[1]}</button>`).join("");
  const title = escapeHtml(cat.title);
  const lower = escapeHtml(cat.title.toLowerCase());
  let status;
  if (v.status === "locked") status = `<span class="bg-label bg-loss">not doable free</span>`; else if (v.status === "nodata") status = `<span class="bg-label">no data</span>`; else status = v.profitable ? `<span class="bg-label bg-best">recommended</span>` : `<span class="bg-label bg-loss">not recommended</span>`;
  const countText = v.count > 0 ? ` · your ${fmtInt(v.count)} ${escapeHtml(unitLabel)}${v.count > 1 ? "s" : ""}` : "";
  const netRow = v.net != null ? row(`<span class="fd-item-main">${getIcon(cat.icon) || ""} <strong>${title}</strong><span class="bg-why">${v.source === "estimate" ? `Estimated from market price and tool cost, you have no active ${escapeHtml(unitLabel)} yet` : `Daily Profit panel (average)${countText}`}</span></span><span class="fd-item-cost bg-right"><strong>${v.net >= 0 ? "+" : ""}${flower(v.net)}</strong><br>${v.source === "estimate" ? `per ${escapeHtml(unitLabel)} / 24h` : "net / 24h"}</span>`) : "";
  let body;
  if (v.status === "locked") {
    body = `<div class="bg-mini"><strong>${title} cannot be done in Free to Play.</strong> ${escapeHtml(v.reason)} Switch to Invested to see it.</div>`;
  } else if (v.status === "special") {
    body = `${netRow}<div class="bg-mini"><strong>Special resource.</strong> ${escapeHtml(cat.special)}${v.net != null && v.net < 0 ? " The loss shown above only exists because it cannot be sold on the market." : ""}</div>`;
  } else if (v.status === "profit") {
    body = `<div class="fd-section-label">Linked to your Daily Profit</div>${netRow}<div class="bg-mini">${note}</div>`;
  } else if (v.status === "loss") {
    body = `<div class="fd-section-label">Linked to your Daily Profit</div>${netRow}<div class="bg-mini"><strong>${title} is not recommended on your current farm.</strong> ${skills.length || boosts.length ? "It loses money unless you get the skills and boosts below." : "It still loses money at current market prices, even with all your skills and boosts."}</div>`;
  } else {
    body = `<div class="bg-mini"><strong>No profit data for ${lower} yet.</strong> Sync your farm and get one started, then this will follow your Daily Profit panel.</div>`;
  }
  const freeNote = v.freeNote ? `<div class="bg-mini">${escapeHtml(v.freeNote)}</div>` : "";
  const need = v.status === "locked" ? `These only matter once you switch to Invested.` : v.profitable ? `These make ${lower} even better. Skills and boosts you already own are hidden.` : `Get these first, then ${lower} can become profitable.`;
  const whereTag = cat.where ? ` <span class="bg-mini">(${escapeHtml(cat.where)})</span>` : "";
  return `<div class="fd-container is-own bg-cat"><div class="fd-container-head"><span class="fd-container-title">${getIcon(cat.icon) || ""} ${title}${whereTag} ${status}</span></div>${body}${freeNote}<div class="bg-mini">${need}</div><div class="bg-switcher bg-modes">${tabs}</div><div class="bg-pane">${tab === "boost" ? boostRows(boosts) : skillGroups(skills)}</div></div>`;
}

function miningHtml(ctx) {
  const snap = dailyProfitGuideSnapshot();
  const html = MINING_CATEGORIES.map(cat => {
    const skills = skillsFor([ "trees", "mining" ], "resources", cat.id);
    const boosts = boostsFor("resources", "resources", cat.id);
    const note = `Skills and boosts below increase the yield and speed of ${escapeHtml(cat.title.toLowerCase())}, so you can run more cycles in 24 hours.`;
    const tool = RESOURCE_DATA[cat.id] ? RESOURCE_DATA[cat.id].tool : null;
    let lock = "";
    if (ctx.free && tool && !FREE_TOOLS[tool]) lock = `It needs a ${tool}, and the ${tool} has no free daily supply.`;
    const v = linkedVerdict(cat, snap.items.get(cat.id), cat.id, lock);
    if (ctx.free && tool && FREE_TOOLS[tool] && v.status !== "locked") {
      const supply = FREE_TOOLS[tool];
      const fig = computeResourceFigures(cat.id);
      const cycles = fig && fig.timeSec > 0 ? 86400 / fig.timeSec : 0;
      const uses = (fig && fig.toolUsageTotal > 0 ? fig.toolUsageTotal : 1) * cycles;
      const factor = uses > 0 ? Math.min(1, supply / uses) : 1;
      if (factor < 1 && v.net != null) v.net *= factor;
      v.freeNote = factor < 1 ? `Free to Play: you get ${fmtInt(supply)} free ${tool}${supply > 1 ? "s" : ""} per day but your nodes would use about ${fmtInt(Math.round(uses))}, so profit is capped to ${fmtInt(Math.round(factor * 100))}% of full speed.` : `Free to Play: you get ${fmtInt(supply)} free ${tool}${supply > 1 ? "s" : ""} per day, enough for your nodes.`;
    }
    return linkedCategoryHtml(cat, v, skills, boosts, note, cat.id === "Obsidian" ? "pit" : "node");
  }).join("");
  return `<div class="bg-cat-grid">${html}</div>`;
}

function animalsHtml(ctx) {
  const snap = dailyProfitGuideSnapshot();
  const g = profileGetG();
  const html = Object.keys(ANIMAL_DATA).map(type => {
    const label = ANIMAL_DATA[type].label;
    const cat = {
      id: type,
      title: label,
      icon: label
    };
    const skills = skillsFor([ "animals" ], "animals", type);
    const boosts = boostsFor("animals", "animals", type);
    const building = ANIMAL_BUILDINGS[type];
    let note = `Skills and boosts below increase the yield and speed of ${escapeHtml(label.toLowerCase())}.`;
    if (building && g && (Number(g.inventory && g.inventory[building]) || 0) <= 0) note = `You need the ${escapeHtml(building)} first. ${note}`;
    let lock = "";
    if (ctx.free) {
      const feedCrops = new Set;
      (ANIMAL_DATA[type].levels || []).forEach(l => (FEED_RECIPE[l.feed] || []).forEach(r => feedCrops.add(r.crop)));
      const missing = Array.from(feedCrops).filter(c => !ctx.freeSeeds(c));
      if (missing.length) lock = `Their feed is made from ${missing.join(", ")}, which has no free daily seeds, so you cannot keep them fed.`;
    }
    const v = linkedVerdict(cat, snap.items.get("animal:" + type), null, lock);
    return linkedCategoryHtml(cat, v, skills, boosts, note, "animal");
  }).join("");
  return `<div class="bg-cat-grid">${html}</div>`;
}

export function guideSkillGroups() {
  const strat = FARM_STRATS[farmStrat];
  const stratList = strat.skills.map(t => [ skillById(t[0]), t[1] ]).filter(t => t[0] && ownedRank(t[0]) < t[1]).sort((a, b) => a[0].skillTier - b[0].skillTier).map(t => [ t[0].id, t[1] ]);
  const farm = [];
  tierSkills(CROP_TIERS.map(t => t[0])).forEach(sk => farm.push([ sk.id, 1 ]));
  FARM_CATEGORIES.forEach(cat => {
    if (cat.id === "crops") return;
    skillsFor([ cat.skillCat ], null, null).forEach(sk => farm.push([ sk.id, 1 ]));
  });
  const mining = [];
  MINING_CATEGORIES.forEach(cat => skillsFor([ "trees", "mining" ], "resources", cat.id).forEach(sk => mining.push([ sk.id, 1 ])));
  const animals = [];
  Object.keys(ANIMAL_DATA).forEach(type => skillsFor([ "animals" ], "animals", type).forEach(sk => animals.push([ sk.id, 1 ])));
  return [ stratList, farm, mining, animals ];
}

export function guideBodyHtml(guide, ctx) {
  if (!ctx.synced) return `<div class="fd-container fdm-gap bg-cat"><div class="bg-mini">Sync your farm first. These guides read your real skills and boosts to decide what is profitable on your farm.</div></div>`;
  if (guide === "farming") return farmingHtml(ctx);
  if (guide === "mining") return miningHtml(ctx);
  if (guide === "animals") return animalsHtml(ctx);
  return "";
}
