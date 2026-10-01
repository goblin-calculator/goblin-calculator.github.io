import { FACTION_BANNER_ICONS, FACTION_DISPLAY_NAMES, FACTION_PET_HAPPY_ICONS, FACTION_WEEK_START_MS, FLOWER_ICON, MARK_ICON_SRC, coinsToFlower, cookingFindRecipeForFood, escapeHtml, factionGetWeekKey, farmSyncAsObj, farmSyncGetFaction, farmSyncGetFactionPetInfo, fmtInt, fmtXp, readFarmSyncedId, toast } from "./calculator.js";

import { farmPanelGameState } from "./inprogress.js";

import { craftingBoxClearCostCache, craftingBoxHasRecipe, craftingBoxUnitCostCoins } from "./crafting_box.js";

import { cookingCostMode, cookingIngredientUnitCostCoins } from "./prices.js";

import { safeLSJSON } from "./storage.js";

import { $, cookFoodIcon, getIcon, syncFactionSubRoute } from "./ui.js";

const SFL_FACTION_PET_WORKER_BASE = "https://sfl-faction-pet-cache.bossweki.workers.dev";

const FACTION_PET_COMMUNITY_TTL_MS = 3 * 60 * 1000;

const FACTION_PET_COMMUNITY_TIMEOUT_MS = 7000;

let factionPetCommunityCache = null;

let factionPetCommunityUpdatedAt = 0;

let factionPetCommunityPromise = null;

async function fetchFactionPetCommunitySnapshotOnce() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FACTION_PET_COMMUNITY_TIMEOUT_MS);
  try {
    const res = await fetch(SFL_FACTION_PET_WORKER_BASE + "/snapshot", {
      cache: "no-store",
      signal: controller.signal
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.ok || !json.factions) return null;
    return json.factions;
  } finally {
    clearTimeout(timer);
  }
}

function ensureFactionPetCommunityLoaded(forceFresh) {
  if (!forceFresh && factionPetCommunityCache && Date.now() - factionPetCommunityUpdatedAt < FACTION_PET_COMMUNITY_TTL_MS) {
    return Promise.resolve(factionPetCommunityCache);
  }
  if (factionPetCommunityPromise) return factionPetCommunityPromise;
  factionPetCommunityPromise = (async () => {
    try {
      const factions = await fetchFactionPetCommunitySnapshotOnce();
      if (factions) {
        factionPetCommunityCache = factions;
        factionPetCommunityUpdatedAt = Date.now();
        const panel = $("factionPanel");
        if (panel && panel.classList.contains("open")) factionDeliveryRefreshGrid();
      }
    } catch (e) {}
    return factionPetCommunityCache;
  })().finally(() => {
    factionPetCommunityPromise = null;
  });
  return factionPetCommunityPromise;
}

function factionDeliveryCommunityPetFor(factionKey) {
  return (factionPetCommunityCache && factionPetCommunityCache[factionKey]) || null;
}

const FACTION_ROUTINE_CROPS = {
  bumpkins: [ "Pumpkin", "Soybean", "Eggplant", "Cauliflower", "Sunflower", "Parsnip", "Beetroot", "Radish", "Potato", "Kale", "Cabbage", "Carrot" ],
  goblins: [ "Sunflower", "Cabbage", "Kale", "Soybean", "Potato", "Eggplant", "Cauliflower", "Parsnip", "Carrot", "Radish", "Beetroot", "Pumpkin" ],
  sunflorians: [ "Potato", "Beetroot", "Radish", "Cabbage", "Carrot", "Kale", "Soybean", "Eggplant", "Pumpkin", "Parsnip", "Cauliflower", "Sunflower" ],
  nightshades: [ "Carrot", "Cauliflower", "Parsnip", "Beetroot", "Pumpkin", "Radish", "Cabbage", "Kale", "Sunflower", "Eggplant", "Soybean", "Potato" ]
};

const FACTION_ROUTINE_OFFSET = 11;

const FACTION_WEEK_MS = 7 * 24 * 60 * 60 * 1e3;

const FACTION_ORDER = [ "bumpkins", "goblins", "sunflorians", "nightshades" ];

const FACTION_ROUTINE_ANCHOR_KEY = "hl_faction_routine_anchor";

const FACTION_DELIVERY_SETS_KEY = "hl_faction_delivery_learned_sets";

const FACTION_KITCHEN_SETS = {
  potato: [ { item: "Potato", amount: 250 }, { item: "Rice", amount: 1 }, { item: "Oil", amount: 3 } ],
  sunflower: [ { item: "Sunflower", amount: 500 }, { item: "Tomato", amount: 55 }, { item: "Leather", amount: 10 } ],
  pumpkin: [ { item: "Pumpkin", amount: 150 }, { item: "Egg", amount: 20 }, { item: "Wool", amount: 35 } ],
  carrot: [ { item: "Carrot", amount: 75 }, { item: "Lemon", amount: 35 }, { item: "Feather", amount: 60 } ],
  beetroot: [ { item: "Beetroot", amount: 30 }, { item: "Banana", amount: 12 }, { item: "Grape", amount: 2 } ],
  cauliflower: [ { item: "Cauliflower", amount: 25 }, { item: "Blueberry", amount: 20 }, { item: "Olive", amount: 1 } ],
  soybean: [ { item: "Soybean", amount: 50 }, { item: "Apple", amount: 12 }, { item: "Honey", amount: 5 } ],
  cabbage: [ { item: "Cabbage", amount: 100 }, { item: "Orange", amount: 20 }, { item: "Rice", amount: 2 } ],
  eggplant: [ { item: "Eggplant", amount: 20 }, { item: "Rice", amount: 1 }, { item: "Barley", amount: 30 } ],
  parsnip: [ { item: "Parsnip", amount: 25 }, { item: "Olive", amount: 1 }, { item: "Wood", amount: 50 } ],
  radish: [ { item: "Radish", amount: 8 }, { item: "Grape", amount: 1 }, { item: "Egg", amount: 35 } ],
  kale: [ { item: "Kale", amount: 8 }, { item: "Honey", amount: 3 }, { item: "Milk", amount: 3 } ]
};

const FACTION_PET_SETS = {
  potato: [ { food: "Cabbers n Mash", quantity: 1 }, { food: "Power Smoothie", quantity: 2 }, { food: "Tofu Scramble", quantity: 2 }, { food: "Angler Doll", quantity: 1 } ],
  sunflower: [ { food: "Kale Stew", quantity: 1 }, { food: "Banana Blast", quantity: 2 }, { food: "Bumpkin ganoush", quantity: 2 }, { food: "Doll", quantity: 1 } ],
  pumpkin: [ { food: "Fried Tofu", quantity: 1 }, { food: "Sour Shake", quantity: 2 }, { food: "Surimi Rice Bowl", quantity: 1 }, { food: "Lumber Doll", quantity: 1 } ],
  carrot: [ { food: "Bumpkin Broth", quantity: 6 }, { food: "Bumpkin Detox", quantity: 2 }, { food: "Bumpkin ganoush", quantity: 2 }, { food: "Sizzle Doll", quantity: 1 } ],
  beetroot: [ { food: "Roast Veggies", quantity: 2 }, { food: "The Lot", quantity: 1 }, { food: "Apple Pie", quantity: 4 }, { food: "Moo Doll", quantity: 1 } ],
  cauliflower: [ { food: "Boiled Eggs", quantity: 4 }, { food: "Orange Juice", quantity: 4 }, { food: "Surimi Rice Bowl", quantity: 1 }, { food: "Cluck Doll", quantity: 1 } ],
  soybean: [ { food: "Bumpkin Broth", quantity: 4 }, { food: "Apple Juice", quantity: 3 }, { food: "Bumpkin Roast", quantity: 1 }, { food: "Lunar Doll", quantity: 1 } ],
  cabbage: [ { food: "Popcorn", quantity: 2 }, { food: "Purple Smoothie", quantity: 5 }, { food: "Orange Cake", quantity: 4 }, { food: "Gilded Doll", quantity: 1 } ],
  eggplant: [ { food: "Kale Omelette", quantity: 1 }, { food: "Carrot Juice", quantity: 5 }, { food: "Slow Juice", quantity: 1 }, { food: "Harvest Doll", quantity: 1 } ],
  parsnip: [ { food: "Bumpkin Broth", quantity: 6 }, { food: "The Lot", quantity: 1 }, { food: "Goblin Brunch", quantity: 2 }, { food: "Lunar Doll", quantity: 1 } ],
  radish: [ { food: "Popcorn", quantity: 6 }, { food: "Bumpkin Detox", quantity: 2 }, { food: "Caprese Salad", quantity: 1 }, { food: "Buzz Doll", quantity: 1 } ],
  kale: [ { food: "Fried Tofu", quantity: 2 }, { food: "Banana Blast", quantity: 1 }, { food: "Blue Cheese", quantity: 1 }, { food: "Juicy Doll", quantity: 1 } ]
};

function factionRoutineShiftWeek(weekKeyStr, weeks) {
  return factionGetWeekKey(new Date(new Date(weekKeyStr + "T00:00:00Z").getTime() + weeks * FACTION_WEEK_MS));
}

function factionRoutineDateIndex(weekKeyStr) {
  const weekDate = new Date(weekKeyStr + "T00:00:00Z").getTime();
  const weeksSinceStart = Math.floor((weekDate - FACTION_WEEK_START_MS) / FACTION_WEEK_MS);
  return ((weeksSinceStart + FACTION_ROUTINE_OFFSET) % 12 + 12) % 12;
}

function factionRoutineLoadAnchor() {
  const anchor = safeLSJSON(localStorage.getItem(FACTION_ROUTINE_ANCHOR_KEY), null);
  if (!anchor || typeof anchor.week !== "string" || !Number.isInteger(anchor.index)) return null;
  if (anchor.index < 0 || anchor.index > 11) return null;
  if (!isFinite(new Date(anchor.week + "T00:00:00Z").getTime())) return null;
  return anchor;
}

function factionRoutineIndexForWeek(weekKeyStr) {
  const anchor = factionRoutineLoadAnchor();
  if (!anchor) return factionRoutineDateIndex(weekKeyStr);
  const diff = Math.round((new Date(weekKeyStr + "T00:00:00Z").getTime() - new Date(anchor.week + "T00:00:00Z").getTime()) / FACTION_WEEK_MS);
  return ((anchor.index + diff) % 12 + 12) % 12;
}

function factionRoutineDetectIndex(factionName, record) {
  const list = FACTION_ROUTINE_CROPS[factionName];
  if (!list || !record) return -1;
  const requests = record.kitchen || [];
  for (let i = 0; i < requests.length; i++) {
    const item = String(requests[i].item || "").toLowerCase();
    const idx = list.findIndex(c => c.toLowerCase() === item);
    if (idx >= 0) return idx;
  }
  return -1;
}

function factionRoutineUpdateAnchor(record) {
  const index = factionRoutineDetectIndex(record.factionName, record);
  if (index < 0 || !record.week) return;
  const current = factionRoutineLoadAnchor();
  if (current && (current.week > record.week || current.week === record.week && (current.syncedAt || 0) > record.syncedAt)) return;
  localStorage.setItem(FACTION_ROUTINE_ANCHOR_KEY, JSON.stringify({
    week: record.week,
    index: index,
    syncedAt: record.syncedAt
  }));
}

function factionDeliverySetKey(crop) {
  return String(crop).toLowerCase();
}

function factionDeliveryTableSet(crop) {
  const key = factionDeliverySetKey(crop);
  const kitchen = FACTION_KITCHEN_SETS[key];
  const pet = FACTION_PET_SETS[key];
  return kitchen && pet ? {
    kitchen: kitchen,
    pet: pet
  } : null;
}

function factionDeliverySetSignature(set) {
  if (!set) return null;
  return JSON.stringify({
    kitchen: (set.kitchen || []).map(r => [ r.item, r.amount ]).sort((a, b) => a[0].localeCompare(b[0])),
    pet: (set.pet || []).map(r => [ r.food, r.quantity ]).sort((a, b) => a[0].localeCompare(b[0]))
  });
}

function factionDeliveryLoadSets() {
  const sets = safeLSJSON(localStorage.getItem(FACTION_DELIVERY_SETS_KEY), {});
  return sets && typeof sets === "object" ? sets : {};
}

function factionDeliveryLearnSet(record) {
  const index = factionRoutineDetectIndex(record.factionName, record);
  if (index < 0) return;
  const key = factionDeliverySetKey(FACTION_ROUTINE_CROPS[record.factionName][index]);
  const table = factionDeliveryTableSet(key);
  const observed = {
    kitchen: (record.kitchen || []).map(r => ({
      item: r.item,
      amount: r.amount
    })),
    pet: (record.pet || []).map(r => ({
      food: r.food,
      quantity: r.quantity
    }))
  };
  const sets = factionDeliveryLoadSets();
  const existing = sets[key];
  if (table && factionDeliverySetSignature(observed) === factionDeliverySetSignature(table)) {
    if (existing) {
      delete sets[key];
      localStorage.setItem(FACTION_DELIVERY_SETS_KEY, JSON.stringify(sets));
    }
    return;
  }
  if (existing && existing.week > record.week) return;
  sets[key] = {
    week: record.week,
    base: factionDeliverySetSignature(table),
    kitchen: observed.kitchen,
    pet: observed.pet
  };
  localStorage.setItem(FACTION_DELIVERY_SETS_KEY, JSON.stringify(sets));
}

function factionDeliveryLookupSet(crop) {
  const key = factionDeliverySetKey(crop);
  const table = factionDeliveryTableSet(key);
  const learned = factionDeliveryLoadSets()[key];
  if (learned && Array.isArray(learned.kitchen) && Array.isArray(learned.pet) && learned.base === factionDeliverySetSignature(table)) return {
    kitchen: learned.kitchen,
    pet: learned.pet,
    week: learned.week || null
  };
  return table ? {
    kitchen: table.kitchen,
    pet: table.pet,
    week: null
  } : null;
}

function factionDeliveryPredict(factionKey, weekKey) {
  const list = FACTION_ROUTINE_CROPS[factionKey];
  if (!list) return null;
  const index = factionRoutineIndexForWeek(weekKey);
  const crop = list[index];
  return {
    index: index,
    crop: crop,
    set: factionDeliveryLookupSet(crop)
  };
}

const FACTION_DELIVERY_CACHE_KEY = "hl_faction_delivery_cache";

const FACTION_DELIVERY_OWN_KEY = "hl_faction_delivery_own_faction";

function factionDeliveryLoadCache() {
  return safeLSJSON(localStorage.getItem(FACTION_DELIVERY_CACHE_KEY), {});
}

function factionDeliverySaveCache(cache) {
  localStorage.setItem(FACTION_DELIVERY_CACHE_KEY, JSON.stringify(cache));
}

function factionDeliveryGetOwnFaction() {
  return localStorage.getItem(FACTION_DELIVERY_OWN_KEY) || null;
}

function factionDeliverySetOwnFaction(name) {
  if (name) localStorage.setItem(FACTION_DELIVERY_OWN_KEY, name); else localStorage.removeItem(FACTION_DELIVERY_OWN_KEY);
}

function factionDeliverySumDaily(obj) {
  const o = farmSyncAsObj(obj);
  if (!o) return 0;
  return Object.keys(o).reduce((sum, k) => sum + (Number(o[k]) || 0), 0);
}

function factionDeliveryIconHtml(name) {
  return cookingFindRecipeForFood(name) ? cookFoodIcon(name) : getIcon(name);
}

function factionDeliveryFlowerCost(name) {
  try {
    if (craftingBoxHasRecipe(name)) {
      const dollCoins = craftingBoxUnitCostCoins(name);
      return dollCoins > 0 ? coinsToFlower(dollCoins) : 0;
    }
    const coins = cookingIngredientUnitCostCoins(name, cookingCostMode);
    return coins > 0 ? coinsToFlower(coins) : 0;
  } catch (e) {
    return 0;
  }
}

function factionDeliveryBuildRecordFromGameState(g, farmId) {
  const faction = farmSyncGetFaction(g);
  if (!faction) return null;
  const week = factionGetWeekKey();
  const petInfo = farmSyncGetFactionPetInfo(g);
  const kitchen = farmSyncAsObj(faction.kitchen);
  const pet = farmSyncAsObj(faction.pet);
  const kitchenRequests = kitchen && Array.isArray(kitchen.requests) ? kitchen.requests : [];
  const petRequests = pet && Array.isArray(pet.requests) ? pet.requests : [];
  const history = farmSyncAsObj(faction.history);
  const weekHistory = farmSyncAsObj(history && history[week]);
  return {
    factionName: faction.name,
    farmId: farmId != null ? String(farmId) : null,
    syncedAt: Date.now(),
    week: kitchen && kitchen.week ? kitchen.week : week,
    marksThisWeek: weekHistory ? Number(weekHistory.score) || 0 : 0,
    petXPThisWeek: weekHistory ? Number(weekHistory.petXP) || 0 : 0,
    petStreak: petInfo.streak,
    lastWeekStreak: petInfo.lastWeekStreak,
    qualifiesForBoost: petInfo.qualifiesForBoost,
    isContributingMember: petInfo.isContributingMember,
    hasPetData: petInfo.hasPetData,
    totalXP: petInfo.totalXP,
    goalXP: petInfo.goalXP,
    sleeping: petInfo.sleeping,
    goalReached: petInfo.goalReached,
    kitchen: kitchenRequests.map(r => ({
      item: r.item,
      amount: Number(r.amount) || 0,
      fulfilled: factionDeliverySumDaily(r.dailyFulfilled)
    })),
    pet: petRequests.map(r => ({
      food: r.food,
      quantity: Number(r.quantity) || 0,
      fulfilled: factionDeliverySumDaily(r.dailyFulfilled)
    }))
  };
}

function factionDeliveryIngestRecord(record) {
  if (!record || !record.factionName) return;
  const cache = factionDeliveryLoadCache();
  const existing = cache[record.factionName];
  if (existing && (existing.week > record.week || existing.week === record.week && existing.syncedAt > record.syncedAt)) return;
  cache[record.factionName] = record;
  factionDeliverySaveCache(cache);
  factionRoutineUpdateAnchor(record);
  factionDeliveryLearnSet(record);
}

function factionDeliveryIngestMainFarm() {
  if (!farmPanelGameState || !farmPanelGameState.faction) return;
  const mainFarmId = typeof readFarmSyncedId === "function" ? readFarmSyncedId() : $("farmPanelIdInput") ? $("farmPanelIdInput").value : null;
  const record = factionDeliveryBuildRecordFromGameState(farmPanelGameState, mainFarmId);
  if (!record) return;
  factionDeliveryIngestRecord(record);
  factionDeliverySetOwnFaction(record.factionName);
}

function factionDeliveryRequestRowHtml(iconName, qty, label, isFulfilledKnown, fulfilled) {
  const unitCost = factionDeliveryFlowerCost(iconName);
  const lineCost = unitCost * qty;
  const costHtml = lineCost > 0 ? ` <span class="fd-item-cost">(${lineCost.toFixed(2)} ${FLOWER_ICON})</span>` : "";
  const fulfilledHtml = isFulfilledKnown ? `<span class="fd-item-fulfilled">${fmtInt(fulfilled)}/${fmtInt(qty)} delivered</span>` : "";
  return `<div class="fd-item-row">\n    <span class="fd-item-main">${factionDeliveryIconHtml(iconName)} ${fmtInt(qty)} ${escapeHtml(label)}${costHtml}</span>\n    ${fulfilledHtml}\n  </div>`;
}

function factionDeliveryTotalCost(record) {
  let total = 0;
  (record.kitchen || []).forEach(r => total += factionDeliveryFlowerCost(r.item) * r.amount);
  (record.pet || []).forEach(r => total += factionDeliveryFlowerCost(r.food) * r.quantity);
  return total;
}

function factionDeliveryPredictedBodyHtml(factionKey, displayName, weekKey) {
  const prediction = factionDeliveryPredict(factionKey, weekKey);
  if (!prediction) return `<div class="fd-empty-note">No routine is known for ${escapeHtml(displayName)} yet.</div>`;
  const set = prediction.set;
  if (!set) return `<div class="fd-empty-note">No requirement set is recorded for ${escapeHtml(prediction.crop)} yet.</div>`;
  const totalCost = factionDeliveryTotalCost(set);
  const kitchenRows = (set.kitchen || []).map(r => factionDeliveryRequestRowHtml(r.item, r.amount, r.item, false, 0)).join("");
  const petRows = (set.pet || []).map(r => factionDeliveryRequestRowHtml(r.food, r.quantity, r.food, false, 0)).join("");
  const seenText = set.week ? `updated from a synced farm, week of ${escapeHtml(set.week)}` : "recorded routine table";
  return `<div class="fd-total-cost">Estimated delivery cost: ${totalCost.toFixed(2)} ${FLOWER_ICON}</div>\n<div class="fd-section-label">Kitchen</div>\n${kitchenRows}\n<div class="fd-section-label">Pet</div>\n${petRows}\n<div class="fd-synced-note">Estimate from the ${escapeHtml(prediction.crop)} set (${seenText}) · amounts can change between routine cycles</div>`;
}

function factionDeliveryPetSectionHtml(factionKey, record) {
  const displayName = FACTION_DISPLAY_NAMES[factionKey] || factionKey;
  const petIconSrc = FACTION_PET_HAPPY_ICONS[factionKey];
  const iconHtml = petIconSrc ? `<img src="${petIconSrc}" alt="${escapeHtml(displayName)} Pet">` : `<span class="fp-icon-unknown">❓</span>`;
  const hasPetData = !!(record && record.hasPetData);
  const community = factionDeliveryCommunityPetFor(factionKey);
  const hasCommunityData = !hasPetData && !!community;
  const hasAnyData = hasPetData || hasCommunityData;
  const totalXP = hasPetData ? record.totalXP : hasCommunityData ? community.totalXP : 0;
  const goalXP = hasPetData ? record.goalXP : hasCommunityData ? community.goalXP : 0;
  const streak = hasPetData ? record.streak : hasCommunityData ? community.streak : 0;
  const nextWeekGoalXP = community ? community.nextWeekGoalXP : null;
  const pct = goalXP > 0 ? Math.min(100, totalXP / goalXP * 100) : 0;
  const caption = hasAnyData ? `${fmtInt(totalXP)} / ${fmtInt(goalXP)} XP` : "No sync data yet";
  const metaParts = [];
  if (hasAnyData && streak > 0) metaParts.push(`${fmtInt(streak)} week streak`);
  if (nextWeekGoalXP) metaParts.push(`Next week goal (est.): ${fmtInt(nextWeekGoalXP)} XP`);
  if (hasCommunityData) metaParts.push(`via community · ${factionDeliveryRelativeTime(community.updatedAt)}`);
  const metaHtml = metaParts.length ? `<div class="fp-bar-meta">${metaParts.map(escapeHtml).join(" · ")}</div>` : "";
  return `<div class="fd-pet-row">\n    <div class="fp-icon-frame fd-pet-icon">${iconHtml}</div>\n    <div class="fd-pet-bar-wrap">\n      <div class="fp-bar-track"><div class="fp-bar-fill" style="width:${pct}%;"></div></div>\n      <div class="fp-bar-caption"><span>${caption}</span><span>${Number(pct.toFixed(2))}%</span></div>\n      ${metaHtml}\n    </div>\n  </div>`;
}

function factionDeliveryCopyText(displayName, kitchenItems, petItems) {
  const kitchenLines = kitchenItems.map(r => `${fmtInt(r.qty)} ${r.label}`);
  const petLines = petItems.map(r => `${fmtInt(r.qty)} ${r.label}`);
  const blocks = [];
  if (kitchenLines.length) blocks.push(`**Kitchen**\n\`\`\`${kitchenLines.join("\n")}\`\`\``);
  if (petLines.length) blocks.push(`**Pet**\n\`\`\`${petLines.join("\n")}\`\`\``);
  const header = `**___${displayName}___**`;
  return blocks.length ? `${header}\n${blocks.join("\n\n")}` : `${header}\nNo requests found.`;
}

function factionDeliveryEncodeCopy(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch (e) {
    return "";
  }
}

function factionDeliveryDecodeCopy(encoded) {
  try {
    return decodeURIComponent(escape(atob(encoded || "")));
  } catch (e) {
    return "";
  }
}

function factionDeliveryCopyIconHtml(copyText) {
  return `<button type="button" class="fd-copy-icon" data-copy="${factionDeliveryEncodeCopy(copyText)}" title="Copy to clipboard">📋</button>`;
}

function factionDeliveryCopyFallback(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function factionDeliveryDoCopy(text, btn) {
  const onDone = ok => {
    toast(ok ? "📋 Faction requests copied — paste it in Discord!" : "⚠️ Copy failed — please copy manually");
    if (ok && btn) {
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1200);
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => onDone(true)).catch(() => onDone(factionDeliveryCopyFallback(text)));
  } else {
    onDone(factionDeliveryCopyFallback(text));
  }
}

function factionDeliveryContainerHtml(factionKey, record, isOwn, weekKey) {
  const displayName = FACTION_DISPLAY_NAMES[factionKey] || factionKey;
  const bannerIcon = FACTION_BANNER_ICONS[factionKey] ? `<img src="${FACTION_BANNER_ICONS[factionKey]}" alt="" style="width:16px;height:16px;image-rendering:pixelated;vertical-align:-3px;">` : "";
  const badgeHtml = isOwn ? `<span class="fd-badge">★ Your Faction</span>` : "";
  const petHtml = factionDeliveryPetSectionHtml(factionKey, isOwn ? record : null);
  const hasFreshData = isOwn && record && record.week === weekKey;
  let bodyHtml;
  let kitchenItems = [];
  let petItems = [];
  if (!hasFreshData) {
    const prediction = factionDeliveryPredict(factionKey, weekKey);
    const set = prediction ? prediction.set : null;
    if (set) {
      kitchenItems = (set.kitchen || []).map(r => ({
        label: r.item,
        qty: r.amount
      }));
      petItems = (set.pet || []).map(r => ({
        label: r.food,
        qty: r.quantity
      }));
    }
    bodyHtml = factionDeliveryPredictedBodyHtml(factionKey, displayName, weekKey);
  } else {
    const totalCost = factionDeliveryTotalCost(record);
    kitchenItems = (record.kitchen || []).map(r => ({
      label: r.item,
      qty: r.amount
    }));
    petItems = (record.pet || []).map(r => ({
      label: r.food,
      qty: r.quantity
    }));
    const kitchenRows = (record.kitchen || []).map(r => factionDeliveryRequestRowHtml(r.item, r.amount, r.item, isOwn, r.fulfilled)).join("");
    const petRows = (record.pet || []).map(r => factionDeliveryRequestRowHtml(r.food, r.quantity, r.food, isOwn, r.fulfilled)).join("");
    const ownStatsHtml = isOwn ? `<div class="fd-own-stats">\n        <div class="fd-stat"><span class="fd-stat-label">Pet Streak</span><span class="fd-stat-value">${fmtInt(record.petStreak)} Weeks</span></div>\n        <div class="fd-stat"><span class="fd-stat-label">Contributed This Week</span><span class="fd-stat-value">${record.isContributingMember ? "Yes" : "No"}</span></div>\n        <div class="fd-stat"><span class="fd-stat-label">Marks Earned This Week</span><span class="fd-stat-value">${fmtInt(record.marksThisWeek)} <img src="${MARK_ICON_SRC}" alt="Mark" style="width:12px;height:12px;image-rendering:pixelated;vertical-align:-2px;"></span></div>\n      </div>` : "";
    bodyHtml = `<div class="fd-total-cost">Total delivery cost: ${totalCost.toFixed(2)} ${FLOWER_ICON}</div>\n      ${ownStatsHtml}\n      <div class="fd-section-label">Kitchen</div>\n      ${kitchenRows || `<div class="fd-empty-note">No kitchen requests found.</div>`}\n      <div class="fd-section-label">Pet</div>\n      ${petRows || `<div class="fd-empty-note">No pet requests found.</div>`}\n      <div class="fd-synced-note">Synced from Farm #${escapeHtml(record.farmId || "—")} · ${escapeHtml(factionDeliveryRelativeTime(record.syncedAt))}</div>`;
  }
  const copyIconHtml = factionDeliveryCopyIconHtml(factionDeliveryCopyText(displayName, kitchenItems, petItems));
  return `<div class="fd-container${isOwn ? " is-own" : ""}">\n    <div class="fd-container-head">\n      <span class="fd-container-title">${bannerIcon} ${escapeHtml(displayName)} ${copyIconHtml}</span>\n      ${badgeHtml}\n    </div>\n    ${petHtml}\n    ${bodyHtml}\n  </div>`;
}

function factionDeliveryRelativeTime(ts) {
  if (!ts) return "never";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1e3));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const FACTION_LEADERBOARD_WORKER_BASE = "https://sfl-kingdom-leaderboard-cache.bossweki.workers.dev";

const FACTION_LEADERBOARD_API_BASE = FACTION_LEADERBOARD_WORKER_BASE + "/kingdom/";

const FACTION_LEADERBOARD_LIMIT = 100;

const FACTION_LEADERBOARD_TIMEOUT_MS = 12000;

const FACTION_LEADERBOARD_TTL_MS = 3 * 60 * 1000;

const FACTION_LEADERBOARD_LEVEL_XP = [0, 2, 22, 205, 555, 1155, 2155, 3405, 5405, 7905, 10905, 14405, 18405, 22905, 27905, 33655, 40155, 47405, 55405, 64155, 73905, 84655, 96405, 109155, 122905, 137405, 152905, 169405, 186905, 205405, 225405, 246905, 269905, 294405, 320405, 348405, 378405, 410405, 444405, 480405, 518905, 559905, 603405, 649405, 697905, 749405, 803905, 861405, 921905, 985405, 1053905, 1127405, 1205905, 1289405, 1377905, 1476405, 1584905, 1703405, 1831905, 1970405, 2128905, 2287405, 2485905, 2704405, 2942905, 3221405, 3539905, 3898405, 4296905, 4735405, 5233905, 5743905, 6263905, 6793905, 7333905, 7883905, 8443905, 9013905, 9593905, 10183905, 10783905, 11393905, 12013905, 12643905, 13283905, 13933905, 14593905, 15263905, 15943905, 16633905, 17333905, 18043905, 18763905, 19493905, 20233905, 20983905, 21743905, 22513905, 23293905, 24083905, 24893905, 25723905, 26573905, 27443905, 28333905, 29243905, 30173905, 31123905, 32093905, 33083905, 34093905, 35123905, 36173905, 37243905, 38333905, 39443905, 40573905, 41723905, 42893905, 44083905, 45293905, 46523905, 47773905, 49043905, 50333905, 51653905, 53003905, 54383905, 55793905, 57233905, 58708905, 60218905, 61763905, 63343905, 64958905, 66613905, 68308905, 70043905, 71818905, 73633905, 75493905, 77398905, 79348905, 81343905, 83383905, 85473905, 87613905, 89803905, 92043905, 94333905];

function factionLeaderboardLevelFromXp(xp) {
  if (xp == null || isNaN(xp)) return null;
  let level = 1;
  for (let i = 0; i < FACTION_LEADERBOARD_LEVEL_XP.length; i++) {
    if (xp >= FACTION_LEADERBOARD_LEVEL_XP[i]) level = i + 1; else break;
  }
  return level;
}

let factionLeaderboardActiveFaction = null;

let factionLeaderboardData = null;

let factionLeaderboardLoading = false;

let factionLeaderboardError = null;

let factionLeaderboardFetchedForFarmId = null;

let factionLeaderboardFetchedAt = 0;

function factionLeaderboardOwnFarmId() {
  return (readFarmSyncedId() || "").trim();
}

function factionLeaderboardSingularLabel(factionKey) {
  const name = FACTION_DISPLAY_NAMES[factionKey] || factionKey;
  return name.replace(/s$/, "");
}

async function factionLeaderboardFetchData(farmId, force) {
  if (!farmId) {
    factionLeaderboardError = "Sync your farm (or set a Farm ID) to load the leaderboard.";
    factionLeaderboardData = null;
    factionLeaderboardFetchedForFarmId = null;
    factionLeaderboardRenderBody();
    return;
  }
  if (!force && factionLeaderboardData && factionLeaderboardFetchedForFarmId === farmId && Date.now() - factionLeaderboardFetchedAt < FACTION_LEADERBOARD_TTL_MS) return;
  factionLeaderboardLoading = true;
  factionLeaderboardError = null;
  factionLeaderboardRenderBody();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FACTION_LEADERBOARD_TIMEOUT_MS);
  try {
    const url = FACTION_LEADERBOARD_API_BASE + encodeURIComponent(farmId) + "?limit=" + FACTION_LEADERBOARD_LIMIT;
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal
    });
    if (!res.ok) throw new Error("Request failed (" + res.status + ")");
    const json = await res.json();
    if (!json || !json.marks) throw new Error("Unexpected response from leaderboard API");
    factionLeaderboardData = json;
    factionLeaderboardFetchedForFarmId = farmId;
    factionLeaderboardFetchedAt = Date.now();
  } catch (e) {
    factionLeaderboardError = "Couldn't load the leaderboard" + (e && e.message ? " — " + e.message : "") + ".";
  } finally {
    clearTimeout(timer);
    factionLeaderboardLoading = false;
    factionLeaderboardRenderBody();
  }
}

function factionLeaderboardOwnUsername() {
  const name = farmPanelGameState && typeof farmPanelGameState.username === "string" ? farmPanelGameState.username : "";
  return name.trim().toLowerCase();
}

function factionLeaderboardIsOwnRow(row, farmId, username) {
  if (!row) return false;
  if (farmId && row.farmId != null && String(row.farmId) === String(farmId)) return true;
  if (username && typeof row.id === "string" && row.id.trim().toLowerCase() === username) return true;
  return false;
}

function factionLeaderboardRowMetaHtml(row) {
  const level = factionLeaderboardLevelFromXp(row.experience);
  const parts = [];
  if (level != null) parts.push(`Lv. ${fmtInt(level)}`);
  if (row.experience != null) parts.push(`${fmtInt(Math.floor(row.experience))} EXP`);
  if (row.ascensionLevel != null) parts.push(`Asc. ${fmtInt(row.ascensionLevel)}`);
  const metaText = parts.join(" · ");
  if (!metaText) return "";
  return `<div class="fd-lb-row-meta">${escapeHtml(metaText)}</div>`;
}

function factionLeaderboardRowHtml(row, index, isYou, useIndexRank) {
  const rank = row.rank != null ? row.rank : useIndexRank ? index + 1 : null;
  const name = row.id || "—";
  const markHtml = `<img src="${MARK_ICON_SRC}" alt="Mark" style="width:12px;height:12px;image-rendering:pixelated;vertical-align:-2px;">`;
  const metaHtml = factionLeaderboardRowMetaHtml(row);
  return `<div class="fd-lb-row${isYou ? " is-you" : ""}">\n    <div class="fd-lb-row-top">\n      <span class="fd-lb-row-rank">${rank != null ? "#" + fmtInt(rank) : "—"}</span>\n      <span class="fd-lb-row-name">${escapeHtml(name)}${isYou ? ` <span class="fd-badge">★ You</span>` : ""}</span>\n      <span class="fd-lb-row-count">${markHtml} ${fmtXp(row.count)}</span>\n    </div>\n    ${metaHtml}\n  </div>`;
}

function factionLeaderboardBodyHtml() {
  const farmId = factionLeaderboardOwnFarmId();
  const username = factionLeaderboardOwnUsername();
  const ownFaction = factionDeliveryGetOwnFaction();
  const faction = factionLeaderboardActiveFaction || ownFaction || FACTION_ORDER[0];
  const label = `${factionLeaderboardSingularLabel(faction)} Leader Board`;
  const tabsHtml = FACTION_ORDER.map(f => {
    const bannerHtml = FACTION_BANNER_ICONS[f] ? `<img src="${FACTION_BANNER_ICONS[f]}" alt="" style="width:14px;height:14px;image-rendering:pixelated;vertical-align:-2px;">` : "";
    return `<button type="button" class="fd-lb-tab${f === faction ? " active" : ""}" data-lb-faction="${f}">${bannerHtml} ${escapeHtml(factionLeaderboardSingularLabel(f))}</button>`;
  }).join("");
  let ownRankHtml = "";
  let listHtml = "";
  let updatedHtml = "";
  if (factionLeaderboardLoading && !factionLeaderboardData) {
    listHtml = `<div class="fd-empty-note">Loading leaderboard…</div>`;
  } else if (factionLeaderboardError) {
    listHtml = `<div class="fd-empty-note">${escapeHtml(factionLeaderboardError)}</div>`;
  } else if (!factionLeaderboardData) {
    listHtml = `<div class="fd-empty-note">No data yet.</div>`;
  } else {
    const marks = factionLeaderboardData.marks || {};
    const rows = (marks.topTens && marks.topTens[faction]) || [];
    if (faction === ownFaction) {
      const windowRows = Array.isArray(marks.marksRankingData) ? marks.marksRankingData.filter(Boolean) : [];
      const ownInTop = rows.find(r => factionLeaderboardIsOwnRow(r, farmId, username));
      const shown = windowRows.length ? windowRows : ownInTop ? [ownInTop] : [];
      const shownHtml = shown.length ? shown.map((r, i) => factionLeaderboardRowHtml(r, i, factionLeaderboardIsOwnRow(r, farmId, username), false)).join("") : `<div class="fd-empty-note">No ranking found for your farm this week yet.</div>`;
      ownRankHtml = `<div class="fd-lb-own-rank">Your Ranking · Farm #${escapeHtml(farmId || "—")}</div><div class="fd-lb-list fd-lb-own-list">${shownHtml}</div>`;
    }
    listHtml = rows.length ? rows.map((r, i) => factionLeaderboardRowHtml(r, i, factionLeaderboardIsOwnRow(r, farmId, username), true)).join("") : `<div class="fd-empty-note">No ranking data yet for ${escapeHtml(factionLeaderboardSingularLabel(faction))}.</div>`;
    if (factionLeaderboardData.lastUpdated) updatedHtml = `<div class="fd-synced-note">Last updated ${escapeHtml(factionDeliveryRelativeTime(factionLeaderboardData.lastUpdated))}</div>`;
  }
  return `<div class="fd-lb-tabs" id="factionLbTabs">${tabsHtml}</div>\n  ${ownRankHtml}\n  <div class="fd-container">\n    <div class="fd-container-head">\n      <span class="fd-container-title">🏆 ${escapeHtml(label)}</span>\n    </div>\n    <div class="fd-lb-list">${listHtml}</div>\n    ${updatedHtml}\n  </div>`;
}

function factionLeaderboardRenderBody() {
  const el = $("factionLbBody");
  if (!el) return;
  el.innerHTML = factionLeaderboardBodyHtml();
  el.querySelectorAll(".fd-lb-tab").forEach(btn => {
    btn.onclick = () => {
      const f = btn.dataset.lbFaction;
      if (!f || factionLeaderboardActiveFaction === f) return;
      factionLeaderboardActiveFaction = f;
      factionLeaderboardRenderBody();
    };
  });
}

function factionLeaderboardViewHtml() {
  return `<div class="fd-lb-statement">Weekly Marks standings for each faction from Sunflower Land's official leaderboard (the game only publishes each faction's top 10, plus a few ranks around your own farm).</div>
  <div class="fd-lb-label">Faction Leader Boards</div>
  <div id="factionLbBody"></div>`;
}

function factionMarksCalcViewHtml() {
  return `<div class="fd-lb-label">Marks Calculator</div>
  <div class="fd-container fd-mc-body" id="factionMarksCalcBody"><div class="fd-empty-note">Bro is still cooking comeback again soon...</div></div>`;
}

const FACTION_SUB_PANELS = {
  leaderboard: {
    viewId: "factionLeaderboardView",
    btnId: "factionLeaderboardBtn",
    label: () => "🏆 Leader Board"
  },
  marks: {
    viewId: "factionMarksCalcView",
    btnId: "factionMarksCalcBtn",
    label: () => `<img src="${MARK_ICON_SRC}" alt="" style="width:14px;height:14px;image-rendering:pixelated;vertical-align:-2px;"> Marks Calculator`
  }
};

const FACTION_SUB_KEYS = Object.keys(FACTION_SUB_PANELS);

const factionSubOpen = {
  leaderboard: false,
  marks: false
};

let factionSubLast = null;

function factionSubIsDesktop() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width:900px)").matches;
}

function factionSubApplyView() {
  const openKeys = FACTION_SUB_KEYS.filter(k => factionSubOpen[k]);
  const anyOpen = openKeys.length > 0;
  const deliveryView = $("factionDeliveryView");
  const wrap = $("factionSubPanels");
  if (deliveryView) deliveryView.style.display = anyOpen ? "none" : "";
  if (wrap) wrap.style.display = anyOpen ? "" : "none";
  FACTION_SUB_KEYS.forEach(k => {
    const cfg = FACTION_SUB_PANELS[k];
    const view = $(cfg.viewId);
    const btn = $(cfg.btnId);
    if (view) view.style.display = factionSubOpen[k] ? "" : "none";
    if (btn) {
      btn.classList.toggle("active", factionSubOpen[k]);
      btn.innerHTML = !factionSubOpen[k] ? cfg.label() : openKeys.length > 1 ? "✕ Close" : "📦 Back to Deliveries";
    }
  });
}

function factionSubSetOpen(key, open, syncRoute) {
  if (!FACTION_SUB_PANELS[key]) return;
  if (factionSubIsDesktop()) {
    FACTION_SUB_KEYS.forEach(k => {
      factionSubOpen[k] = open;
    });
  } else {
    if (open) {
      FACTION_SUB_KEYS.forEach(k => {
        if (k !== key) factionSubOpen[k] = false;
      });
    }
    factionSubOpen[key] = open;
  }
  if (open) {
    factionSubLast = key;
  } else if (factionSubLast === key || !FACTION_SUB_KEYS.some(k => factionSubOpen[k])) {
    factionSubLast = FACTION_SUB_KEYS.find(k => factionSubOpen[k]) || null;
  }
  factionSubApplyView();
  if (open && factionSubOpen.leaderboard) {
    if (!factionLeaderboardActiveFaction) factionLeaderboardActiveFaction = factionDeliveryGetOwnFaction() || FACTION_ORDER[0];
    factionLeaderboardRenderBody();
    factionLeaderboardFetchData(factionLeaderboardOwnFarmId(), false);
  }
  if (syncRoute) syncFactionSubRoute(factionSubLast);
}

function factionSubKeyFromLocation() {
  if (typeof window === "undefined") return null;
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  const key = slug.indexOf("faction/") === 0 ? slug.slice("faction/".length) : null;
  return key && FACTION_SUB_PANELS[key] ? key : null;
}

let factionDeliveryWeekMode = "this";

function factionDeliveryTargetWeek() {
  const current = factionGetWeekKey();
  return factionDeliveryWeekMode === "next" ? factionRoutineShiftWeek(current, 1) : current;
}

function factionDeliveryWeekInfoText(weekKey) {
  const label = factionDeliveryWeekMode === "next" ? "Next week" : "This week";
  return `${label} · week of ${weekKey} (UTC) · routine week ${factionRoutineIndexForWeek(weekKey) + 1}/12`;
}

function factionDeliveryUpdateWeekInfo() {
  const el = $("factionWeekInfo");
  if (!el) return;
  el.textContent = factionDeliveryWeekInfoText(factionDeliveryTargetWeek());
}

function factionDeliveryOrderedFactions(ownFaction) {
  if (!ownFaction || !FACTION_ORDER.includes(ownFaction)) return FACTION_ORDER;
  return [ ownFaction ].concat(FACTION_ORDER.filter(f => f !== ownFaction));
}

function factionDeliveryRefreshGrid() {
  const grid = $("factionDeliveryGrid");
  if (!grid) return;
  craftingBoxClearCostCache();
  factionDeliveryIngestMainFarm();
  const weekKey = factionDeliveryTargetWeek();
  const cache = factionDeliveryLoadCache();
  const ownFaction = factionDeliveryGetOwnFaction();
  grid.innerHTML = factionDeliveryOrderedFactions(ownFaction).map(f => factionDeliveryContainerHtml(f, cache[f], f === ownFaction, weekKey)).join("");
  const filter = $("factionWeekFilter");
  if (filter) filter.querySelectorAll("button").forEach(btn => btn.classList.toggle("active", btn.dataset.week === factionDeliveryWeekMode));
  factionDeliveryUpdateWeekInfo();
}

export function renderFactionDeliveryPanel() {
  const body = $("factionBody");
  if (!body) return;
  factionDeliveryWeekMode = "this";
  FACTION_SUB_KEYS.forEach(k => {
    factionSubOpen[k] = false;
  });
  factionSubLast = null;
  ensureFactionPetCommunityLoaded();
  body.innerHTML = `
    <div class="fd-title">Factions Deliveries</div>
    <div class="fd-note">Your connected farm sets the routine week and shows your faction's real requests. The other three factions follow the same routine for this week and next week.</div>
    <div class="fd-lb-toggle-row">
      <button type="button" class="fd-lb-btn" id="factionLeaderboardBtn">${FACTION_SUB_PANELS.leaderboard.label()}</button>
      <button type="button" class="fd-lb-btn" id="factionMarksCalcBtn">${FACTION_SUB_PANELS.marks.label()}</button>
    </div>
    <div id="factionDeliveryView">
      <div class="pet-food-tab-toggle fd-week-filter" id="factionWeekFilter">
        <button type="button" data-week="this" class="active">This Week</button>
        <button type="button" data-week="next">Next Week</button>
      </div>
      <div class="fd-week-info" id="factionWeekInfo"></div>
      <div class="fd-grid" id="factionDeliveryGrid"></div>
    </div>
    <div id="factionSubPanels" class="fd-sub-stack" style="display:none;">
      <div id="factionLeaderboardView" class="fd-lb-view fd-sub-view" style="display:none;">
        ${factionLeaderboardViewHtml()}
      </div>
      <div id="factionMarksCalcView" class="fd-lb-view fd-sub-view" style="display:none;">
        ${factionMarksCalcViewHtml()}
      </div>
    </div>
  `;
  const filter = $("factionWeekFilter");
  if (filter) {
    filter.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        if (factionDeliveryWeekMode === btn.dataset.week) return;
        factionDeliveryWeekMode = btn.dataset.week;
        factionDeliveryRefreshGrid();
      };
    });
  }
  const grid = $("factionDeliveryGrid");
  if (grid) {
    grid.onclick = e => {
      const btn = e.target.closest(".fd-copy-icon");
      if (!btn) return;
      const text = factionDeliveryDecodeCopy(btn.dataset.copy);
      if (!text) return;
      factionDeliveryDoCopy(text, btn);
    };
  }
  FACTION_SUB_KEYS.forEach(k => {
    const btn = $(FACTION_SUB_PANELS[k].btnId);
    if (btn) btn.onclick = () => factionSubSetOpen(k, !factionSubOpen[k], true);
  });
  factionDeliveryRefreshGrid();
  const routeKey = factionSubKeyFromLocation();
  if (routeKey) factionSubSetOpen(routeKey, true, false);
}
