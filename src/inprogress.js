import { ALL_ANIMAL_PRODUCTS, ANIMAL_BASE_CYCLE_SEC, ANIMAL_DATA, ANIMAL_PRODUCT_LOOKUP, ASCENSION_RANK_DATA, BAIT_RECIPES, BAIT_RECIPE_NAME_MATCH, BASE_CROPS, BASE_FRUITS, BASE_GREENHOUSE, BEE_SWARM_ICON, BOOSTS, CALENDAR_SEASONAL_BOOSTS, COIN_ICON, CRIMSTONE_KNOWN_IDS, CROPS_GLOBAL_EXCLUDED_FROM_GREENHOUSE, CROP_AOE_RANKS, CROP_HARVEST_SEC, CROP_KNOWN_IDS, CROP_PRNG_EXCLUDE, FARM_LEVEL_NODES, FARM_PANEL_SCROLL_IDLE_MS, FEED_LABELS, FLOWER_ICON, FLOWER_SEEDS, FLOWER_VARIETIES, FRUIT_KNOWN_IDS, FRUIT_PRNG_EXCLUDE, GAMESTATE_SECTION_KEYS, GEM_ICON, GOLD_KNOWN_IDS, IMAGE_ICONS, IRON_KNOWN_IDS, MUTANT_TYPE_EMOJI, OIL_BONUS_DROP_AMOUNT, OIL_SINGLE_HARVEST_BASE, PATCH_FRUIT_ONLY_GLOBAL_BOOSTS_EXCLUDED_FROM_GREENHOUSE, RCM_GREENHOUSE_ICON_HTML, REQUIRED_FOOD_QTY_MAP, RESOURCE_DATA, RESOURCE_NODE_TIERS, SALT_BASE_CHARGE_CAP, SALT_BASE_TIME_SEC, SALT_BASE_YIELD, STONE_KNOWN_IDS, SYNODIC_MONTH_DAYS, TREE_KNOWN_IDS, __farmPanelSaveGameStateHandle, __gameStateSectionLenSigs, __set___farmPanelSaveGameStateHandle, __set___gameStateSectionLenSigs, allResourceBudBoostEntries, coinPerFlower, computeAnimalFeedFigures, computeAnimalFeedsToNextLevel, computeAnimalTypeFigures, computeAnimalYieldsForLevel, computeBaitFigures, computeBoostedCropStats, computeBoostedFruitStats, computeBoostedGreenhouseStats, computeBoostedLavaPitStats, computeBoostedResourceStats, computeDestroyedCropPlotIds, computeHiveStats, computeQtyRestockGems, currentSeason, escapeHtml, farmIdPromptStartSync, farmSyncExtractBudTraits, farmSyncExtractGameState, farmSyncExtractPetTraits, farmSyncFindBagByNameHeuristic, farmSyncGetAnimalRecords, farmSyncGetPetRecords, farmSyncPickActivePlacedInstances, feePercent, fmt, fmtAnimal, fullMoonSeedStockQty, getActiveAnimalBoosts, getActiveBoostsForHive, getActiveFeedInfo, getActiveSaltRechargeMult, getActiveSaltYieldBonus, getActiveSeasonGuardianName, getAnimalLevelFromXp, getAscensionRank, getCropPlotSunshowerSpeedMultiplier, getCurrentChapterMutantSet, getCurrentChapterName, getEffectiveYieldAdd, getNodeIconHtml, getNodeLabel, getSpiceLickDurationHarvests, isBoostActive, isCropInSeason, isOvernightGroundCrop, isSkillActive, onDeferredInitialRenderDone, parseYieldBoostAmount, resourceBuds, saltSculptureLevel, sflPrngChance, syncCookingCountsFromInventory } from './calculator.js';
import { SFL_COMMUNITY_PROXY_BASE, SFL_NFT_PRICE_API, SFL_PROXY_BASE, getActiveShrineDailyCostStable, getItemCostByName, getSpiceCostPerUseFlower, marketItems } from './prices.js';
import { $, getBoostIcon, getIcon, renderAnimalCardProductDetailRow, renderAnimalYieldGroupsList, renderBeehiveListHtml, renderCardProductDetailRow, renderCrimstoneInstantMineBoostHtml, renderCrimstoneNodeYieldList, renderFarmPanelTabContent, renderFruitHarvestsLeftHtml, renderGoldInstantMineBoostHtml, renderNodeTierYieldList, renderOilNodeYieldList, renderPlantYieldNodeList, renderSaltNodeYieldList, renderTotalsBreakdown, renderTurnaroundBoostHtml } from './ui.js';

export function farmPanelDetectNodeTier(resourceName, node) {
  const tiers = RESOURCE_NODE_TIERS[resourceName];
  if (!tiers) return null;
  const rawLabel = node && (node.name || node.sftType || node.type) || null;
  const norm = rawLabel ? String(rawLabel).trim().toLowerCase() : null;
  const match = norm ? tiers.find(t => t.label.toLowerCase() === norm) : null;
  return match || tiers.find(t => t.key === "base");
}

function farmPanelGetSaltActiveBoosts() {
  return BOOSTS.filter(b => isBoostActive(b.id) && b.category === "salt" && b.scope === "saltGlobal").map(b => ({
    name: b.name,
    yieldAdd: b.saltYieldAdd || 0,
    timeMult: b.saltRechargeTimeMult || undefined,
    freeCost: b.freeCost || undefined
  }));
}

function farmPanelGetHoneyActiveBoosts() {
  const active = typeof getActiveBoostsForHive === "function" ? getActiveBoostsForHive() : [];
  return active.map(b => ({
    name: b.name,
    yieldAdd: b.honeyYieldAdd || 0
  }));
}

export let farmPanelSyncInFlight = false;

export function farmPanelGetLastInfo() {
  return {
    id: localStorage.getItem("hl_farm_panel_id") || "",
    level: localStorage.getItem("hl_farm_panel_level") || "",
    experience: parseFloat(localStorage.getItem("hl_farm_panel_experience")) || 0,
    ascensionLevel: parseInt(localStorage.getItem("hl_farm_panel_ascension_level"), 10) || 0,
    time: parseFloat(localStorage.getItem("hl_farm_panel_time")) || 0,
    vipActive: localStorage.getItem("hl_farm_panel_vip_active") === "1",
    vipExpiresAt: parseFloat(localStorage.getItem("hl_farm_panel_vip_expires")) || null,
    vipLifetime: localStorage.getItem("hl_farm_panel_vip_lifetime") === "1",
    factionName: localStorage.getItem("hl_farm_panel_faction_name") || null,
    factionIsMember: localStorage.getItem("hl_farm_panel_faction_is_member") === "1",
    factionHasPetData: localStorage.getItem("hl_farm_panel_faction_has_pet") === "1",
    factionTotalXP: parseFloat(localStorage.getItem("hl_farm_panel_faction_total_xp")) || 0,
    factionGoalXP: parseFloat(localStorage.getItem("hl_farm_panel_faction_goal_xp")) || 0,
    factionStreak: parseInt(localStorage.getItem("hl_farm_panel_faction_streak"), 10) || 0,
    factionLastWeekStreak: parseInt(localStorage.getItem("hl_farm_panel_faction_last_week_streak"), 10) || 0,
    factionQualifiesForBoost: localStorage.getItem("hl_farm_panel_faction_qualifies_for_boost") === "1",
    factionIsContributing: localStorage.getItem("hl_farm_panel_faction_is_contributing") === "1"
  };
}

export function farmPanelSaveLastInfo(id, level, vipStatus, factionInfo, experience, ascensionLevel) {
  localStorage.setItem("hl_farm_panel_id", id);
  localStorage.setItem("hl_farm_panel_level", level != null ? String(level) : "");
  localStorage.setItem("hl_farm_panel_experience", experience != null ? String(experience) : "");
  localStorage.setItem("hl_farm_panel_ascension_level", ascensionLevel != null ? String(ascensionLevel) : "0");
  localStorage.setItem("hl_farm_panel_time", String(Date.now()));
  localStorage.setItem("hl_farm_panel_vip_active", vipStatus && vipStatus.active ? "1" : "0");
  localStorage.setItem("hl_farm_panel_vip_expires", vipStatus && vipStatus.expiresAt != null ? String(vipStatus.expiresAt) : "");
  localStorage.setItem("hl_farm_panel_vip_lifetime", vipStatus && vipStatus.lifetime ? "1" : "0");
  const fi = factionInfo || {};
  localStorage.setItem("hl_farm_panel_faction_name", fi.factionName || "");
  localStorage.setItem("hl_farm_panel_faction_is_member", fi.isMember ? "1" : "0");
  localStorage.setItem("hl_farm_panel_faction_has_pet", fi.hasPetData ? "1" : "0");
  localStorage.setItem("hl_farm_panel_faction_total_xp", String(fi.totalXP || 0));
  localStorage.setItem("hl_farm_panel_faction_goal_xp", String(fi.goalXP || 0));
  localStorage.setItem("hl_farm_panel_faction_streak", String(fi.streak || 0));
  localStorage.setItem("hl_farm_panel_faction_last_week_streak", String(fi.lastWeekStreak || 0));
  localStorage.setItem("hl_farm_panel_faction_qualifies_for_boost", fi.qualifiesForBoost ? "1" : "0");
  localStorage.setItem("hl_farm_panel_faction_is_contributing", fi.isContributingMember ? "1" : "0");
}

export let farmPanelGameState = null;

let farmPanelHoneySnapshotMs = Date.now();

export let farmPanelTabContentDirty = false;

export let farmPanelActiveTab = "inprogress";

export let farmPanelExpandedNames = new Set;

export let farmPanelInProgressCategoryFilter = "all";

let farmPanelRenderAtMs = 0;

let farmPanelUserScrolling = false;

let farmPanelScrollIdleTimer = null;

export function farmPanelMarkScrollActivity() {
  farmPanelUserScrolling = true;
  const wrap = $("farmPanelTabContent");
  if (wrap) wrap.classList.add("is-scrolling");
  if (farmPanelScrollIdleTimer) clearTimeout(farmPanelScrollIdleTimer);
  farmPanelScrollIdleTimer = setTimeout(() => {
    farmPanelUserScrolling = false;
    if (wrap) wrap.classList.remove("is-scrolling");
  }, FARM_PANEL_SCROLL_IDLE_MS);
}

export function farmPanelField(g, key) {
  if (!g) return null;
  if (g[key] != null) return g[key];
  if (g.land && g.land[key] != null) return g.land[key];
  return null;
}

export function farmPanelGrowTimeSec(name) {
  if (BASE_CROPS[name]) return BASE_CROPS[name].timeSec;
  if (BASE_FRUITS[name]) return BASE_FRUITS[name].timeSec;
  if (BASE_GREENHOUSE[name]) return BASE_GREENHOUSE[name].timeSec;
  if (RESOURCE_DATA[name]) return RESOURCE_DATA[name].timeSec;
  if (FLOWER_SEEDS[name]) return FLOWER_SEEDS[name].timeSec;
  if (FLOWER_VARIETIES[name]) return FLOWER_SEEDS[FLOWER_VARIETIES[name].seed].timeSec;
  return null;
}

function farmPanelFormatCountdown(sec) {
  if (sec <= 0) return "Ready now";
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (h > 0 || m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ") + " left";
}

export function farmPanelGetMarketPriceFlower(name) {
  const m = marketItems.find(x => (x.name || "").toLowerCase() === (name || "").toLowerCase());
  if (m && m.flowerPrice) return m.flowerPrice;
  if (BASE_CROPS[name] && BASE_CROPS[name].marketPrice) return BASE_CROPS[name].marketPrice;
  if (BASE_FRUITS[name] && BASE_FRUITS[name].marketPrice) return BASE_FRUITS[name].marketPrice;
  if (BASE_GREENHOUSE[name] && BASE_GREENHOUSE[name].marketPrice) return BASE_GREENHOUSE[name].marketPrice;
  return 0;
}

function farmPanelGetCostPerUnitFlower(name) {
  const coins = getItemCostByName(name);
  return (coins || 0) / (coinPerFlower || 1);
}

function farmPanelGetBaseYield(name) {
  if (name === "Obsidian") return 1;
  if (BASE_CROPS[name]) return BASE_CROPS[name].baseYield || 1;
  if (BASE_FRUITS[name]) return BASE_FRUITS[name].yieldPerHarvest || 1;
  if (BASE_GREENHOUSE[name]) return BASE_GREENHOUSE[name].baseYield || 1;
  if (RESOURCE_DATA[name]) return RESOURCE_DATA[name].yieldPer || 1;
  return 1;
}

export function farmPanelGetBoostedYieldStats(name) {
  if (name === "Obsidian") return computeBoostedLavaPitStats(259200);
  if (BASE_CROPS[name]) {
    const d = BASE_CROPS[name];
    return computeBoostedCropStats(name, d.baseYield || 1, d.timeSec, undefined, undefined, true);
  }
  if (BASE_FRUITS[name]) {
    const d = BASE_FRUITS[name];
    return computeBoostedFruitStats(name, d.yieldPerHarvest || 1, d.timeSec, d.minHarvest || 1);
  }
  if (BASE_GREENHOUSE[name]) {
    const d = BASE_GREENHOUSE[name];
    return computeBoostedGreenhouseStats(name, d.baseYield || 1, d.timeSec);
  }
  if (RESOURCE_DATA[name]) {
    const d = RESOURCE_DATA[name];
    return computeBoostedResourceStats(name, d.yieldPer, d.timeSec);
  }
  return {
    yieldVal: 1,
    activeBoosts: []
  };
}

export function farmPanelGetMarketId(name) {
  if (name === "Obsidian") return "resource_Obsidian";
  if (BASE_CROPS[name]) return "crop_" + name;
  if (BASE_FRUITS[name]) return "fruit_" + name;
  if (BASE_GREENHOUSE[name]) return "greenhouse_" + name;
  if (RESOURCE_DATA[name]) return "resource_" + name;
  return null;
}

export function farmPanelComputeEconomics(name, count, totalYield) {
  const price = farmPanelGetMarketPriceFlower(name);
  const costPerUnit = farmPanelGetCostPerUnitFlower(name);
  const seedCost = costPerUnit * totalYield;
  const marketId = farmPanelGetMarketId(name);
  const restockInfo = marketId ? computeQtyRestockGems(marketId, totalYield) : null;
  const restockCost = restockInfo ? restockInfo.flowerCost : 0;
  const totalCost = seedCost + restockCost;
  const grossRevenue = price * totalYield;
  const feeAmount = grossRevenue * ((feePercent || 0) / 100);
  const netRevenue = grossRevenue - feeAmount;
  const profit = netRevenue - totalCost;
  return {
    name: name,
    count: count,
    totalYield: totalYield,
    price: price,
    costPerUnit: costPerUnit,
    seedCost: seedCost,
    restockInfo: restockInfo,
    restockCost: restockCost,
    totalCost: totalCost,
    grossRevenue: grossRevenue,
    feeAmount: feeAmount,
    netRevenue: netRevenue,
    profit: profit
  };
}

function farmPanelJobMutantRewardName(job) {
  if (!job) return null;
  const reward = job.reward;
  if (!reward || !Array.isArray(reward.items) || !reward.items.length) return null;
  const first = reward.items[0];
  return first && first.name ? first.name : null;
}

export function farmPanelDetectActiveMutants(json) {
  const g = farmSyncExtractGameState(json);
  const results = [];
  const flowersField = farmPanelField(g, "flowers");
  const flowerBeds = flowersField && flowersField.flowerBeds;
  const flowerCounts = {};
  if (flowerBeds && typeof flowerBeds === "object") {
    Object.values(flowerBeds).forEach(bed => {
      const name = farmPanelJobMutantRewardName(bed && bed.flower);
      if (name) flowerCounts[name] = (flowerCounts[name] || 0) + 1;
    });
  }
  Object.keys(flowerCounts).forEach(name => {
    results.push({
      type: "Flower",
      name: name,
      count: flowerCounts[name]
    });
  });
  [ "Chicken", "Sheep", "Cow" ].forEach(typeLabel => {
    const animalKey = typeLabel.toLowerCase();
    const bag = farmSyncGetAnimalRecords(g, animalKey);
    const counts = {};
    if (bag && typeof bag === "object") {
      Object.values(bag).forEach(animal => {
        const name = farmPanelJobMutantRewardName(animal);
        if (name) counts[name] = (counts[name] || 0) + 1;
      });
    }
    Object.keys(counts).forEach(name => {
      results.push({
        type: typeLabel,
        name: name,
        count: counts[name]
      });
    });
  });
  return results;
}

export function farmPanelRenderMutantAlertCard(entry) {
  const icon = IMAGE_ICONS[entry.name] ? getIcon(entry.name) : `<span style="font-size:24px;">${MUTANT_TYPE_EMOJI[entry.type] || "✨"}</span>`;
  const countNote = entry.count > 1 ? ` ×${entry.count}` : "";
  return `\n  <div class="mutant-alert-card" data-search="mutant-${entry.type.toLowerCase()}">\n    <div class="mutant-alert-shine"></div>\n    <div class="mutant-alert-icon">${icon}</div>\n    <div class="mutant-alert-text">\n      <div class="mutant-alert-title">You have a Mutant! <span class="mutant-alert-type">[${escapeHtml(entry.type)}]</span></div>\n      <div class="mutant-alert-name">${escapeHtml(entry.name)}${countNote}</div>\n    </div>\n  </div>`;
}

function farmPanelTreeTypeForNode(node) {
  return node && typeof node.name === "string" && TREE_KNOWN_IDS[node.name] ? node.name : "Tree";
}

function farmPanelPredictTreeTypeRoll(json, treeType, criticalHitName, chance) {
  if (!(chance > 0)) return null;
  const lastInfo = farmPanelGetLastInfo();
  const farmId = Number(lastInfo.id);
  if (!Number.isFinite(farmId) || farmId <= 0) return null;
  const g = farmSyncExtractGameState(json);
  const farmActivity = farmPanelField(g, "farmActivity");
  if (!farmActivity || typeof farmActivity !== "object") return null;
  const itemId = TREE_KNOWN_IDS[treeType];
  if (!itemId) return null;
  const activityKey = `${treeType === "Tree" ? "Basic Tree" : treeType} Chopped`;
  const counter = typeof farmActivity[activityKey] === "number" ? farmActivity[activityKey] : 0;
  return sflPrngChance({
    farmId: farmId,
    itemId: itemId,
    counter: counter,
    chance: chance,
    criticalHitName: criticalHitName
  });
}

function farmPanelBuildSequentialWoodRolls(json, treeType, count) {
  const lastInfo = farmPanelGetLastInfo();
  const farmId = Number(lastInfo.id);
  if (!Number.isFinite(farmId) || farmId <= 0) return null;
  const g = farmSyncExtractGameState(json);
  const farmActivity = farmPanelField(g, "farmActivity");
  if (!farmActivity || typeof farmActivity !== "object") return null;
  const itemId = TREE_KNOWN_IDS[treeType];
  if (!itemId) return null;
  if (count <= 0) return [];
  const activityKey = `${treeType === "Tree" ? "Basic Tree" : treeType} Chopped`;
  const baseCounter = typeof farmActivity[activityKey] === "number" ? farmActivity[activityKey] : 0;
  const toughTreeOwned = isSkillActive("skill_tough_tree");
  const toughTreeChance = toughTreeOwned ? [ 10, 20, 30 ][Math.min(Math.max(getAscensionRank("skill_tough_tree"), 1), 3) - 1] : 0;
  
  
  
  const turnaroundOwned = isSkillActive("skill_tree_turnaround");
  const turnaroundChance = turnaroundOwned ? ASCENSION_RANK_DATA.skill_tree_turnaround.values[Math.min(Math.max(getAscensionRank("skill_tree_turnaround"), 1), 3) - 1] : 0;
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const counter = baseCounter + i;
    const toughTreeCrit = toughTreeOwned && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: toughTreeChance,
      criticalHitName: "Tough Tree"
    });
    const nativeHit = sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 20,
      criticalHitName: "Native"
    });
    const turnaroundHit = turnaroundOwned && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: turnaroundChance,
      criticalHitName: "Tree Turnaround"
    });
    rolls.push({
      toughTreeCrit: toughTreeCrit,
      nativeHit: nativeHit,
      turnaroundHit: turnaroundHit
    });
  }
  return rolls;
}

function farmPanelPredictWoodCritRolls(json, treeType) {
  const rolls = farmPanelBuildSequentialWoodRolls(json, treeType, 1);
  return rolls && rolls.length ? rolls[0] : null;
}

function farmPanelBuildSequentialWoodRollChains(json, treeType, count) {
  const lastInfo = farmPanelGetLastInfo();
  const farmId = Number(lastInfo.id);
  if (!Number.isFinite(farmId) || farmId <= 0) return null;
  const g = farmSyncExtractGameState(json);
  const farmActivity = farmPanelField(g, "farmActivity");
  if (!farmActivity || typeof farmActivity !== "object") return null;
  const itemId = TREE_KNOWN_IDS[treeType];
  if (!itemId) return null;
  if (count <= 0) return [];
  const activityKey = `${treeType === "Tree" ? "Basic Tree" : treeType} Chopped`;
  const baseCounter = typeof farmActivity[activityKey] === "number" ? farmActivity[activityKey] : 0;
  const toughTreeOwned = isSkillActive("skill_tough_tree");
  const toughTreeChance = toughTreeOwned ? [ 10, 20, 30 ][Math.min(Math.max(getAscensionRank("skill_tough_tree"), 1), 3) - 1] : 0;
  const turnaroundOwned = isSkillActive("skill_tree_turnaround");
  const turnaroundChance = turnaroundOwned ? ASCENSION_RANK_DATA.skill_tree_turnaround.values[Math.min(Math.max(getAscensionRank("skill_tree_turnaround"), 1), 3) - 1] : 0;
  const rollAt = counter => {
    const toughTreeCrit = toughTreeOwned && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: toughTreeChance,
      criticalHitName: "Tough Tree"
    });
    const nativeHit = sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 20,
      criticalHitName: "Native"
    });
    const turnaroundHit = turnaroundOwned && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: turnaroundChance,
      criticalHitName: "Tree Turnaround"
    });
    return {
      counter: counter,
      toughTreeCrit: toughTreeCrit,
      nativeHit: nativeHit,
      turnaroundHit: turnaroundHit
    };
  };
  
  
  
  const MAX_CHAIN_LENGTH = 500;
  let counter = baseCounter;
  const chains = [];
  for (let i = 0; i < count; i++) {
    const chain = [];
    let roll = rollAt(counter);
    chain.push(roll);
    counter++;
    while (roll.turnaroundHit && chain.length < MAX_CHAIN_LENGTH) {
      roll = rollAt(counter);
      chain.push(roll);
      counter++;
    }
    chains.push(chain);
  }
  return chains;
}

function farmPanelGetBudYieldForResource(resourceName) {
  const entries = typeof allResourceBudBoostEntries === "function" ? allResourceBudBoostEntries() : [];
  const perBud = {};
  entries.forEach(e => {
    if (!e || !e.yieldAdd) return;
    const applies = e.scope === "resource" ? e.target === resourceName : e.scope === "resourceList" ? Array.isArray(e.resources) && e.resources.includes(resourceName) : false;
    if (!applies) return;
    const key = e.budId || e.id;
    perBud[key] = (perBud[key] || 0) + e.yieldAdd;
  });
  const totals = Object.values(perBud);
  return totals.length ? Math.max(...totals) : 0;
}

function farmPanelComputeExactWoodYieldForNode(node, treeType, critRolls) {
  if (!critRolls) return null;
  let amount = 1;
  const hasBeaverReady = isBoostActive("woody_the_beaver") || isBoostActive("apprentice_beaver") || isBoostActive("foreman_beaver");
  if (hasBeaverReady) amount *= 1.2;
  if (isBoostActive("discord_mod")) amount *= 1.35;
  if (isBoostActive("lumberjack")) amount *= 1.1;
  if (critRolls.toughTreeCrit) amount *= 3;
  if (isSkillActive("skill_lumberjacks_extra")) {
    const rank = getAscensionRank("skill_lumberjacks_extra");
    const values = ASCENSION_RANK_DATA.skill_lumberjacks_extra.values;
    amount += values[Math.min(Math.max(rank, 1), values.length) - 1];
  }
  if (isBoostActive("wood_nymph_wendy")) amount += .2;
  if (isBoostActive("tiki_totem")) amount += .1;
  if (isBoostActive("squirrel")) amount += .1;
  if (isBoostActive("faction_shield_res")) amount += .25;
  if (critRolls.nativeHit) amount += 1;
  if (isBoostActive("legendary_shrine_res")) amount += 1;
  amount += farmPanelGetBudYieldForResource("Wood");
  const multiplier = node && typeof node.multiplier === "number" ? node.multiplier : 1;
  amount *= multiplier;
  const tier = node && typeof node.tier === "number" ? node.tier : treeType === "Sacred Tree" ? 3 : treeType === "Ancient Tree" ? 2 : 1;
  if (tier === 2) amount += .5;
  if (tier === 3) amount += 2.5;
  return amount;
}

function farmPanelRockNameForNode(node, knownIds, defaultName) {
  return node && typeof node.name === "string" && knownIds[node.name] ? node.name : defaultName;
}

function farmPanelGetMiningPrngContext(json, knownIds, rockName) {
  const lastInfo = farmPanelGetLastInfo();
  const farmId = Number(lastInfo.id);
  if (!Number.isFinite(farmId) || farmId <= 0) return null;
  const g = farmSyncExtractGameState(json);
  const farmActivity = farmPanelField(g, "farmActivity");
  if (!farmActivity || typeof farmActivity !== "object") return null;
  const itemId = knownIds[rockName];
  if (!itemId) return null;
  const counter = typeof farmActivity[`${rockName} Mined`] === "number" ? farmActivity[`${rockName} Mined`] : 0;
  return {
    farmId: farmId,
    itemId: itemId,
    counter: counter
  };
}

export function farmPanelGetCollectiblePosition(g, name) {
  const collectibles = farmPanelField(g, "collectibles");
  const arr = collectibles && collectibles[name];
  const active = farmSyncPickActivePlacedInstances(arr);
  const placed = active[0];
  if (!placed) return null;
  return {
    x: placed.coordinates.x,
    y: placed.coordinates.y
  };
}

export function farmPanelGnomeComboPresent() {
  if (!farmPanelGameState) return false;
  const g = farmSyncExtractGameState(farmPanelGameState);
  const gnomePos = farmPanelGetCollectiblePosition(g, "Gnome");
  const cobaltPos = farmPanelGetCollectiblePosition(g, "Cobalt");
  const clementinePos = farmPanelGetCollectiblePosition(g, "Clementine");
  if (!gnomePos || !cobaltPos || !clementinePos) return false;
  return cobaltPos.y === gnomePos.y && cobaltPos.x + 1 === gnomePos.x && clementinePos.y === gnomePos.y && clementinePos.x - 1 === gnomePos.x;
}

export function farmPanelIsWithinTurtleAOE(turtlePos, rockPos) {
  const dx = turtlePos.x - rockPos.x;
  const dy = turtlePos.y - rockPos.y;
  return Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx !== 0 || dy !== 0);
}

function farmPanelGetRockRecoveryDurationMsFromSync(node, baseRecoverySec, resourceName) {
  const jobData = node && node.stone;
  const baseMs = baseRecoverySec * 1e3;
  if (!jobData) return baseMs;
  if (typeof jobData.baseDurationMs === "number") {
    if (!resourceName) return jobData.baseDurationMs;
    const boosted = farmPanelGetBoostedYieldStats(resourceName);
    const boostedMs = typeof boosted.timeVal === "number" ? boosted.timeVal * 1e3 : baseMs;
    const ratio = baseMs > 0 ? boostedMs / baseMs : 1;
    return jobData.baseDurationMs * ratio;
  }
  return baseMs - (typeof jobData.boostedTime === "number" ? jobData.boostedTime : 0);
}

export function farmPanelCheckTurtleAOEBonus(g, turtleName, node, baseRecoverySec, atTime, resourceName) {
  if (!node || typeof node.x !== "number" || typeof node.y !== "number") return false;
  const turtlePos = farmPanelGetCollectiblePosition(g, turtleName);
  if (!turtlePos) return false;
  if (!farmPanelIsWithinTurtleAOE(turtlePos, {
    x: node.x,
    y: node.y
  })) return false;
  const aoeState = farmPanelField(g, "aoe") || {};
  const dx = node.x - turtlePos.x;
  const dy = node.y - turtlePos.y;
  const lastUsed = aoeState[turtleName] && aoeState[turtleName][dx] && typeof aoeState[turtleName][dx][dy] === "number" ? aoeState[turtleName][dx][dy] : 0;
  const cooldownMs = farmPanelGetRockRecoveryDurationMsFromSync(node, baseRecoverySec, resourceName);
  const referenceTime = typeof atTime === "number" ? atTime : Date.now();
  const idleMs = referenceTime - lastUsed;
  return idleMs >= cooldownMs;
}

function farmPanelBuildSequentialStoneRolls(json, rockName, count) {
  const ctx = farmPanelGetMiningPrngContext(json, STONE_KNOWN_IDS, rockName);
  if (!ctx) return null;
  if (count <= 0) return [];
  const {farmId: farmId, itemId: itemId, counter: baseCounter} = ctx;
  const rockGolemOwned = isBoostActive("rock_golem");
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const counter = baseCounter + i;
    const rockGolemCrit = rockGolemOwned && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 10,
      criticalHitName: "Rock Golem"
    });
    const nativeHit = sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 20,
      criticalHitName: "Native"
    });
    rolls.push({
      rockGolemCrit: rockGolemCrit,
      nativeHit: nativeHit
    });
  }
  return rolls;
}

function farmPanelPredictStoneCritRolls(json, rockName) {
  const rolls = farmPanelBuildSequentialStoneRolls(json, rockName, 1);
  return rolls && rolls.length ? rolls[0] : null;
}

function farmPanelComputeExactStoneYieldForNode(json, node, rockName, critRolls, atTime) {
  if (!critRolls) return null;
  const g = farmSyncExtractGameState(json);
  let amount = 1;
  if (critRolls.rockGolemCrit) amount += 2;
  if (isBoostActive("prospector")) amount += .2;
  if (isBoostActive("tunnel_mole")) amount += .25;
  if (isBoostActive("stone_beetle")) amount += .1;
  if (isSkillActive("skill_rocknroll")) {
    const rank = getAscensionRank("skill_rocknroll");
    const values = ASCENSION_RANK_DATA.skill_rocknroll.values;
    amount += values[Math.min(Math.max(rank, 1), values.length) - 1];
  }
  if (isSkillActive("skill_rocky_favor")) {
    const rank = getAscensionRank("skill_rocky_favor");
    const values = ASCENSION_RANK_DATA.skill_rocky_favor.values["resourceEffects.Stone"];
    amount += values[Math.min(Math.max(rank, 1), values.length) - 1];
  }
  if (isSkillActive("skill_ferrous_favor")) {
    const rank = getAscensionRank("skill_ferrous_favor");
    const values = ASCENSION_RANK_DATA.skill_ferrous_favor.values["resourceEffects.Stone"];
    amount += values[Math.min(Math.max(rank, 1), values.length) - 1];
  }
  if (critRolls.nativeHit) amount += 1;
  if (isBoostActive("emerald_turtle") && farmPanelCheckTurtleAOEBonus(g, "Emerald Turtle", node, 14400, atTime, "Stone")) amount += .5;
  if (isBoostActive("tin_turtle") && farmPanelCheckTurtleAOEBonus(g, "Tin Turtle", node, 14400, atTime, "Stone")) amount += .1;
  if (isBoostActive("faction_shield_res")) amount += .25;
  if (isBoostActive("legendary_shrine_res")) amount += 1;
  amount += farmPanelGetBudYieldForResource("Stone");
  if (isBoostActive("volcano_gnome")) amount += .1;
  const multiplier = node && typeof node.multiplier === "number" ? node.multiplier : 1;
  amount *= multiplier;
  const tier = node && typeof node.tier === "number" ? node.tier : rockName === "Reinforced Stone Rock" ? 3 : rockName === "Fused Stone Rock" ? 2 : 1;
  if (tier === 2) amount += .5;
  if (tier === 3) amount += 2.5;
  return amount;
}

function farmPanelBuildSequentialIronRolls(json, rockName, count) {
  const ctx = farmPanelGetMiningPrngContext(json, IRON_KNOWN_IDS, rockName);
  if (!ctx) return null;
  if (count <= 0) return [];
  const {farmId: farmId, itemId: itemId, counter: baseCounter} = ctx;
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const counter = baseCounter + i;
    const nativeHit = sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 20,
      criticalHitName: "Native"
    });
    rolls.push({
      nativeHit: nativeHit
    });
  }
  return rolls;
}

function farmPanelPredictIronCritRolls(json, rockName) {
  const rolls = farmPanelBuildSequentialIronRolls(json, rockName, 1);
  return rolls && rolls.length ? rolls[0] : null;
}

function farmPanelComputeExactIronYieldForNode(json, node, rockName, critRolls, atTime) {
  if (!critRolls) return null;
  const g = farmSyncExtractGameState(json);
  let amount = 1;
  if (isBoostActive("rocky_the_mole")) amount += .25;
  if (isBoostActive("radiant_ray")) amount += .1;
  if (isBoostActive("iron_idol")) amount += 1;
  if (isBoostActive("iron_beetle")) amount += .1;
  if (isSkillActive("skill_iron_bumpkin")) {
    const rank = getAscensionRank("skill_iron_bumpkin");
    const values = ASCENSION_RANK_DATA.skill_iron_bumpkin.values;
    amount += values[Math.min(Math.max(rank, 1), values.length) - 1];
  }
  if (isSkillActive("skill_rocky_favor")) {
    const rank = getAscensionRank("skill_rocky_favor");
    const values = ASCENSION_RANK_DATA.skill_rocky_favor.values["resourceEffects.Iron"];
    amount += values[Math.min(Math.max(rank, 1), values.length) - 1];
  }
  if (isSkillActive("skill_ferrous_favor")) {
    const rank = getAscensionRank("skill_ferrous_favor");
    const values = ASCENSION_RANK_DATA.skill_ferrous_favor.values["resourceEffects.Iron"];
    amount += values[Math.min(Math.max(rank, 1), values.length) - 1];
  }
  if (critRolls.nativeHit) amount += 1;
  if (isBoostActive("emerald_turtle") && farmPanelCheckTurtleAOEBonus(g, "Emerald Turtle", node, 28800, atTime, "Iron")) amount += .5;
  if (isBoostActive("faction_shield_res")) amount += .25;
  amount += farmPanelGetBudYieldForResource("Iron");
  if (isBoostActive("volcano_gnome")) amount += .1;
  const multiplier = node && typeof node.multiplier === "number" ? node.multiplier : 1;
  amount *= multiplier;
  const tier = node && typeof node.tier === "number" ? node.tier : rockName === "Tempered Iron Rock" ? 3 : rockName === "Refined Iron Rock" ? 2 : 1;
  if (tier === 2) amount += .5;
  if (tier === 3) amount += 2.5;
  return amount;
}

function farmPanelPredictGoldInstantMineForType(json, rockName) {
  if (!isBoostActive("pickaxe_shark")) return null;
  const ctx = farmPanelGetMiningPrngContext(json, GOLD_KNOWN_IDS, rockName);
  if (!ctx) return null;
  const {farmId: farmId, itemId: itemId, counter: counter} = ctx;
  return sflPrngChance({
    farmId: farmId,
    itemId: itemId,
    counter: counter,
    chance: 10,
    criticalHitName: "Pickaxe Shark"
  });
}

function farmPanelBuildSequentialGoldRolls(json, rockName, count) {
  const ctx = farmPanelGetMiningPrngContext(json, GOLD_KNOWN_IDS, rockName);
  if (!ctx) return null;
  if (count <= 0) return [];
  const {farmId: farmId, itemId: itemId, counter: baseCounter} = ctx;
  
  
  
  const pickaxeSharkOwned = isBoostActive("pickaxe_shark");
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const counter = baseCounter + i;
    const nativeHit = sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 20,
      criticalHitName: "Native"
    });
    const instantMineHit = pickaxeSharkOwned && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 10,
      criticalHitName: "Pickaxe Shark"
    });
    rolls.push({
      nativeHit: nativeHit,
      instantMineHit: instantMineHit
    });
  }
  return rolls;
}

function farmPanelPredictGoldCritRolls(json, rockName) {
  const rolls = farmPanelBuildSequentialGoldRolls(json, rockName, 1);
  return rolls && rolls.length ? rolls[0] : null;
}

function farmPanelBuildSequentialGoldRollChains(json, rockName, count) {
  const ctx = farmPanelGetMiningPrngContext(json, GOLD_KNOWN_IDS, rockName);
  if (!ctx) return null;
  if (count <= 0) return [];
  const {farmId: farmId, itemId: itemId, counter: baseCounter} = ctx;
  const pickaxeSharkOwned = isBoostActive("pickaxe_shark");
  const rollAt = counter => {
    const nativeHit = sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 20,
      criticalHitName: "Native"
    });
    const instantMineHit = pickaxeSharkOwned && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 10,
      criticalHitName: "Pickaxe Shark"
    });
    return {
      counter: counter,
      nativeHit: nativeHit,
      instantMineHit: instantMineHit
    };
  };
  
  
  const MAX_CHAIN_LENGTH = 500;
  let counter = baseCounter;
  const chains = [];
  for (let i = 0; i < count; i++) {
    const chain = [];
    let roll = rollAt(counter);
    chain.push(roll);
    counter++;
    while (roll.instantMineHit && chain.length < MAX_CHAIN_LENGTH) {
      roll = rollAt(counter);
      chain.push(roll);
      counter++;
    }
    chains.push(chain);
  }
  return chains;
}

function farmPanelComputeExactGoldYieldForNode(json, node, rockName, critRolls, atTime) {
  if (!critRolls) return null;
  const g = farmSyncExtractGameState(json);
  let amount = 1;
  if (isBoostActive("gold_rush")) amount += .5;
  if (isSkillActive("skill_golden_touch")) {
    const rank = getAscensionRank("skill_golden_touch");
    const values = ASCENSION_RANK_DATA.skill_golden_touch.values;
    amount += values[Math.min(Math.max(rank, 1), values.length) - 1];
  }
  if (critRolls.nativeHit) amount += 1;
  if (isBoostActive("nugget")) amount += .25;
  if (isBoostActive("gilded_swordfish")) amount += .1;
  if (isBoostActive("gold_beetle")) amount += .1;
  if (isBoostActive("emerald_turtle") && farmPanelCheckTurtleAOEBonus(g, "Emerald Turtle", node, 86400, atTime, "Gold")) amount += .5;
  if (isBoostActive("faction_shield_res")) amount += .25;
  amount += farmPanelGetBudYieldForResource("Gold");
  if (isBoostActive("volcano_gnome")) amount += .1;
  const multiplier = node && typeof node.multiplier === "number" ? node.multiplier : 1;
  amount *= multiplier;
  const tier = node && typeof node.tier === "number" ? node.tier : rockName === "Prime Gold Rock" ? 3 : rockName === "Pure Gold Rock" ? 2 : 1;
  if (tier === 2) amount += .5;
  if (tier === 3) amount += 2.5;
  return amount;
}

function farmPanelGetCrimstonePrngContext(json) {
  const lastInfo = farmPanelGetLastInfo();
  const farmId = Number(lastInfo.id);
  if (!Number.isFinite(farmId) || farmId <= 0) return null;
  const g = farmSyncExtractGameState(json);
  const farmActivity = farmPanelField(g, "farmActivity");
  if (!farmActivity || typeof farmActivity !== "object") return null;
  const itemId = CRIMSTONE_KNOWN_IDS["Crimstone Rock"];
  const counter = typeof farmActivity["Crimstone Mined"] === "number" ? farmActivity["Crimstone Mined"] : 0;
  return {
    farmId: farmId,
    itemId: itemId,
    counter: counter
  };
}

function farmPanelBuildSequentialCrimstoneRollChains(json, count) {
  const ctx = farmPanelGetCrimstonePrngContext(json);
  if (!ctx) return null;
  if (count <= 0) return [];
  const {farmId: farmId, itemId: itemId, counter: baseCounter} = ctx;
  const clamOwned = isBoostActive("crimstone_clam");
  const rollAt = counter => {
    const instantHit = clamOwned && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 10,
      criticalHitName: "Crimstone Clam"
    });
    return {
      counter: counter,
      instantHit: instantHit
    };
  };
  const MAX_CHAIN_LENGTH = 500;
  let counter = baseCounter;
  const chains = [];
  for (let i = 0; i < count; i++) {
    const chain = [];
    let roll = rollAt(counter);
    chain.push(roll);
    counter++;
    while (roll.instantHit && chain.length < MAX_CHAIN_LENGTH) {
      roll = rollAt(counter);
      chain.push(roll);
      counter++;
    }
    chains.push(chain);
  }
  return chains;
}

export function farmPanelCropTierLabel(cropName) {
  const sec = CROP_HARVEST_SEC[cropName];
  if (sec == null) return null;
  if (sec <= CROP_HARVEST_SEC.Pumpkin) return "Basic";
  if (sec >= CROP_HARVEST_SEC.Eggplant) return "Advanced";
  return "Medium";
}

function farmPanelSumCatalogBoosts(matchFn, excludeIds) {
  let add = 0, mult = 1;
  const boosts = [];
  const budGroups = {};
  BOOSTS.forEach(b => {
    if (!b || excludeIds.has(b.id) || !matchFn(b)) return;
    const active = b.skillTier ? isSkillActive(b.id) : isBoostActive(b.id);
    if (!active) return;
    if (typeof b.yieldMult === "number") {
      mult *= b.yieldMult;
      boosts.push(b);
    }
    if (typeof b.yieldAdd !== "number") return;
    if (b.isBud && b.budId) {
      if (!budGroups[b.budId]) budGroups[b.budId] = {
        total: 0,
        entries: []
      };
      budGroups[b.budId].total += b.yieldAdd;
      budGroups[b.budId].entries.push(b);
    } else {
      add += b.yieldAdd;
      boosts.push(b);
    }
  });
  const budGroupList = Object.values(budGroups);
  if (budGroupList.length) {
    const winner = budGroupList.reduce((best, g) => g.total > best.total ? g : best, budGroupList[0]);
    add += winner.total;
    boosts.push(...winner.entries);
  }
  return {
    add: add,
    mult: mult,
    boosts: boosts
  };
}

export function farmPanelComputeExactCrimstoneYield(g, rock, minesLeftOverride, allowStreakBonus) {
  let amount = 1;
  const boosts = [];
  if (isBoostActive("crimson_carp")) {
    amount += .05;
    boosts.push({
      name: "Crimson Carp",
      valueText: "+0.05 yield"
    });
  }
  if (isBoostActive("crim_peckster")) {
    amount += .1;
    boosts.push({
      name: "Crim Peckster",
      valueText: "+0.1 yield"
    });
  }
  if (isBoostActive("crimstone_armor")) {
    amount += .1;
    boosts.push({
      name: "Crimstone Armor",
      valueText: "+0.1 yield"
    });
  }
  const minesLeft = minesLeftOverride != null ? minesLeftOverride : rock && typeof rock.minesLeft === "number" ? rock.minesLeft : 5;
  if (minesLeft === 1 && allowStreakBonus !== false) {
    if (isBoostActive("crimstone_hammer")) {
      amount += 2;
      boosts.push({
        name: "Crimstone Hammer",
        valueText: "+2 yield (5th mine)"
      });
    }
    if (isSkillActive("skill_fire_kissed")) {
      const rank = getAscensionRank("skill_fire_kissed");
      const values = ASCENSION_RANK_DATA.skill_fire_kissed && ASCENSION_RANK_DATA.skill_fire_kissed.values || [ 1, 1.35, 1.75 ];
      const v = values[Math.min(Math.max(rank, 1), values.length) - 1];
      amount += v;
      boosts.push({
        name: "Fire Kissed",
        valueText: `+${fmt(v)} yield (5th mine)`
      });
    }
    amount += 2;
    boosts.push({
      name: "5th Mine Streak",
      valueText: "+2 yield (guaranteed)"
    });
  }
  return {
    amount: amount,
    boosts: boosts
  };
}

function farmPanelComputeExactOilYield(hasBonus) {
  let amount = OIL_SINGLE_HARVEST_BASE;
  const boosts = [];
  if (hasBonus) {
    amount += OIL_BONUS_DROP_AMOUNT;
    boosts.push({
      name: "Bonus Drill (3rd Mine)",
      valueText: `+${fmt(OIL_BONUS_DROP_AMOUNT)} yield (guaranteed)`
    });
    if (isBoostActive("stag_shrine")) {
      amount += 15;
      boosts.push({
        name: "Stag Shrine",
        valueText: "+15 yield (3rd mine)"
      });
    }
  }
  if (isBoostActive("battle_fish")) {
    amount += .05;
    boosts.push({
      name: "Battle Fish",
      valueText: "+0.05 yield"
    });
  }
  if (isBoostActive("knight_chicken")) {
    amount += .1;
    boosts.push({
      name: "Knight Chicken",
      valueText: "+0.1 yield"
    });
  }
  if (isBoostActive("oil_can")) {
    amount += 2;
    boosts.push({
      name: "Oil Can",
      valueText: "+2 yield"
    });
  }
  if (isBoostActive("oil_overalls")) {
    amount += 10;
    boosts.push({
      name: "Oil Overalls",
      valueText: "+10 yield"
    });
  }
  if (isBoostActive("oil_gallon")) {
    amount += 5;
    boosts.push({
      name: "Oil Gallon",
      valueText: "+5 yield"
    });
  }
  if (isSkillActive("skill_oil_extraction")) {
    const rank = getAscensionRank("skill_oil_extraction");
    const values = ASCENSION_RANK_DATA.skill_oil_extraction && ASCENSION_RANK_DATA.skill_oil_extraction.values || [ 1, 1.5, 2 ];
    const v = values[Math.min(Math.max(rank, 1), values.length) - 1];
    amount += v;
    boosts.push({
      name: "Oil Extraction",
      valueText: `+${fmt(v)} yield`
    });
  }
  return {
    amount: amount,
    boosts: boosts
  };
}

export function farmPanelComputeExactFlowerYield(flowerJob) {
  let amount = 1;
  const boosts = [];
  const crit = flowerJob && flowerJob.criticalHit || {};
  if (isBoostActive("humming_bird") && crit["Humming Bird"]) {
    amount += 1;
    boosts.push({
      name: "Humming Bird",
      valueText: "+1 yield (crit)"
    });
  }
  if (isBoostActive("butterfly") && crit["Butterfly"]) {
    amount += 1;
    boosts.push({
      name: "Butterfly",
      valueText: "+1 yield (crit)"
    });
  }
  if (isBoostActive("desert_rose") && crit["Desert Rose"]) {
    amount += 1;
    boosts.push({
      name: "Desert Rose",
      valueText: "+1 yield (crit)"
    });
  }
  if (isBoostActive("chicory") && crit["Chicory"]) {
    amount += 1;
    boosts.push({
      name: "Chicory",
      valueText: "+1 yield (crit)"
    });
  }
  if (isBoostActive("salt_crystal_flower") && crit["Salt Crystal Flower"]) {
    amount += 1;
    boosts.push({
      name: "Salt Crystal Flower",
      valueText: "+1 yield (crit)"
    });
  }
  if (isBoostActive("moth_shrine") && crit["Moth Shrine"]) {
    amount += 1;
    boosts.push({
      name: "Moth Shrine",
      valueText: "+1 yield (crit)"
    });
  }
  if (isSkillActive("skill_petalled_perk") && crit["Petalled Perk"]) {
    amount += 1;
    boosts.push({
      name: "Petalled Perk",
      valueText: "+1 yield (crit)"
    });
  }
  if (isBoostActive("legendary_shrine_flower")) {
    amount += 1;
    boosts.push({
      name: "Legendary Shrine Flower",
      valueText: "+1 yield"
    });
  }
  return {
    amount: amount,
    boosts: boosts
  };
}

export function farmPanelAOEExtent(rankSkillId) {
  if (rankSkillId && isSkillActive(rankSkillId)) {
    const rank = getAscensionRank(rankSkillId);
    return CROP_AOE_RANKS[Math.min(Math.max(rank, 1), 3) - 1];
  }
  return {
    xLeft: 1,
    xRight: 1,
    depth: 3
  };
}

export function farmPanelGnomeAOEBonus(g, plot, cooldownSec, atTime) {
  if (!plot || typeof plot.x !== "number" || typeof plot.y !== "number") return false;
  const gnomePos = farmPanelGetCollectiblePosition(g, "Gnome");
  const cobaltPos = farmPanelGetCollectiblePosition(g, "Cobalt");
  const clementinePos = farmPanelGetCollectiblePosition(g, "Clementine");
  if (!gnomePos || !cobaltPos || !clementinePos) return false;
  const isCobaltLeftOfGnome = cobaltPos.y === gnomePos.y && cobaltPos.x + 1 === gnomePos.x;
  const isClementineRightOfGnome = clementinePos.y === gnomePos.y && clementinePos.x - 1 === gnomePos.x;
  if (!isCobaltLeftOfGnome || !isClementineRightOfGnome) return false;
  const isPlotDirectlyAboveGnome = plot.x === gnomePos.x && plot.y === gnomePos.y - 1;
  if (!isPlotDirectlyAboveGnome) return false;
  const aoeState = farmPanelField(g, "aoe") || {};
  const lastUsed = aoeState["Gnome"] && aoeState["Gnome"][0] && typeof aoeState["Gnome"][0][1] === "number" ? aoeState["Gnome"][0][1] : 0;
  const referenceTime = typeof atTime === "number" ? atTime : Date.now();
  const idleMs = referenceTime - lastUsed;
  return idleMs >= cooldownSec * 1e3;
}

function farmPanelCropAOEBonus(g, collectibleName, plot, dims, rankSkillId, cooldownSec, atTime) {
  if (!plot || typeof plot.x !== "number" || typeof plot.y !== "number") return false;
  const pos = farmPanelGetCollectiblePosition(g, collectibleName);
  if (!pos) return false;
  const {width: width, height: height} = dims;
  const px = plot.x, py = plot.y;
  let within = false;
  if (collectibleName === "Basic Scarecrow" || collectibleName === "Scary Mike" || collectibleName === "Laurie the Chuckle Crow") {
    const e = farmPanelAOEExtent(rankSkillId);
    within = px >= pos.x - e.xLeft && px <= pos.x + e.xRight && py <= pos.y - height && py >= pos.y - height - (e.depth - 1);
  } else if (collectibleName === "Sir Goldensnout") {
    const drx = px - pos.x, dry = py - pos.y;
    within = drx >= -1 && drx <= width && dry <= 1 && dry >= -height;
  } else if (collectibleName === "Queen Cornelia") {
    within = px >= pos.x - 1 && px <= pos.x + width && py <= pos.y + 1 && py >= pos.y - height;
  }
  if (!within) return false;
  const dx = px - pos.x, dy = py - pos.y;
  const aoeState = farmPanelField(g, "aoe") || {};
  const lastUsed = aoeState[collectibleName] && aoeState[collectibleName][dx] && typeof aoeState[collectibleName][dx][dy] === "number" ? aoeState[collectibleName][dx][dy] : 0;
  const referenceTime = typeof atTime === "number" ? atTime : Date.now();
  const idleMs = referenceTime - lastUsed;
  return idleMs >= cooldownSec * 1e3;
}

export function farmPanelGetCropGrowDurationMsFromSync(job, cropName) {
  const baseSec = farmPanelGrowTimeSec(cropName);
  const baseMs = (typeof baseSec === "number" ? baseSec : 0) * 1e3;
  if (!job) return baseMs;
  if (typeof job.baseDurationMs === "number") {
    const boosted = farmPanelGetBoostedYieldStats(cropName);
    const boostedMs = typeof boosted.timeVal === "number" ? boosted.timeVal * 1e3 : baseMs;
    const ratio = baseMs > 0 ? boostedMs / baseMs : 1;
    return job.baseDurationMs * ratio;
  }
  return baseMs - (typeof job.boostedTime === "number" ? job.boostedTime : 0);
}

export function farmPanelComputeExactCropYield(json, g, cropName, plot, counter, isGreenhouse, atTime) {
  const lastInfo = farmPanelGetLastInfo();
  const farmId = Number(lastInfo.id);
  const tierLabel = farmPanelCropTierLabel(cropName);
  const itemId = CROP_KNOWN_IDS[cropName];
  let amount = 1;
  const boosts = [];
  if (Number.isFinite(farmId) && farmId > 0 && itemId) {
    if (isBoostActive("green_amulet") && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 10,
      criticalHitName: "Green Amulet"
    })) {
      amount *= 10;
      boosts.push({
        name: "Green Amulet",
        valueText: "×10 yield (crit)"
      });
    }
  }
  if (cropName === "Cauliflower" && isBoostActive("golden_cauliflower")) {
    amount *= 2;
    boosts.push({
      name: "Golden Cauliflower",
      valueText: "×2 yield"
    });
  }
  if (cropName === "Carrot" && isBoostActive("easter_bunny")) {
    amount *= 1.2;
    boosts.push({
      name: "Easter Bunny",
      valueText: "×1.2 yield"
    });
  }
  if (cropName === "Pumpkin" && isBoostActive("victoria_sisters")) {
    amount *= 1.2;
    boosts.push({
      name: "Victoria Sisters",
      valueText: "×1.2 yield"
    });
  }
  if (cropName === "Beetroot" && isBoostActive("beetroot_amulet")) {
    amount *= 1.2;
    boosts.push({
      name: "Beetroot Amulet",
      valueText: "×1.2 yield"
    });
  }
  if (cropName === "Sunflower" && isBoostActive("sunflower_amulet")) {
    amount *= 1.1;
    boosts.push({
      name: "Sunflower Amulet",
      valueText: "×1.1 yield"
    });
  }
  if (isBoostActive("scarecrow") || isBoostActive("kuebiko")) {
    amount *= 1.2;
    boosts.push({
      name: isBoostActive("scarecrow") ? "Scarecrow" : "Kuebiko",
      valueText: "×1.2 yield"
    });
  }
  if (isBoostActive("coder")) {
    amount *= 1.2;
    boosts.push({
      name: "Coder",
      valueText: "×1.2 yield"
    });
  }
  const generic = farmPanelSumCatalogBoosts(b => (b.scope === "crop" && b.target === cropName || b.scope === "tier" && b.target === tierLabel || b.scope === "global" && b.category === "crops" && (b.target === null || b.target === undefined)) && !(isGreenhouse && CROPS_GLOBAL_EXCLUDED_FROM_GREENHOUSE.has(b.id)) && (b.id !== "hoot" || !isGreenhouse || cropName === "Rice"), CROP_PRNG_EXCLUDE);
  if (generic.mult !== 1) amount *= generic.mult;
  generic.boosts.forEach(b => {
    const parts = [];
    if (typeof b.yieldAdd === "number" && b.yieldAdd) parts.push(`+${fmt(b.yieldAdd)} yield`);
    if (typeof b.yieldMult === "number" && b.yieldMult !== 1) parts.push(`×${b.yieldMult} yield`);
    if (parts.length) boosts.push({
      name: b.name,
      valueText: parts.join(", ")
    });
  });
  if (Number.isFinite(farmId) && farmId > 0 && itemId) {
    if (cropName === "Potato" && isBoostActive("peeled_potato") && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 20,
      criticalHitName: "Peeled Potato"
    })) {
      amount += 1;
      boosts.push({
        name: "Peeled Potato",
        valueText: "+1 yield (crit)"
      });
    }
    if (cropName === "Potato" && isBoostActive("potent_potato") && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 10 / 3,
      criticalHitName: "Potent Potato"
    })) {
      amount += 10;
      boosts.push({
        name: "Potent Potato",
        valueText: "+10 yield (crit)"
      });
    }
    if (cropName === "Sunflower" && isBoostActive("stellar_sunflower") && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 10 / 3,
      criticalHitName: "Stellar Sunflower"
    })) {
      amount += 10;
      boosts.push({
        name: "Stellar Sunflower",
        valueText: "+10 yield (crit)"
      });
    }
    if (cropName === "Radish" && isBoostActive("radical_radish") && sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 10 / 3,
      criticalHitName: "Radical Radish"
    })) {
      amount += 10;
      boosts.push({
        name: "Radical Radish",
        valueText: "+10 yield (crit)"
      });
    }
  }
  const cropAoeCooldownSec = farmPanelGetCropGrowDurationMsFromSync(plot && plot.crop, cropName) / 1e3;
  if (isSkillActive("skill_chonky_scarecrow") && tierLabel === "Basic" && farmPanelCropAOEBonus(g, "Basic Scarecrow", plot, {
    width: 1,
    height: 1
  }, "skill_chonky_scarecrow", cropAoeCooldownSec, atTime)) {
    const rank = getAscensionRank("skill_chonky_scarecrow");
    const bonuses = ASCENSION_RANK_DATA.skill_chonky_scarecrow && ASCENSION_RANK_DATA.skill_chonky_scarecrow.values || [ 0, .05, .1 ];
    const v = bonuses[Math.min(Math.max(rank, 1), 3) - 1];
    amount += v;
    boosts.push({
      name: "Basic Scarecrow",
      valueText: `+${fmt(v)} yield (AOE)`
    });
  }
  if (tierLabel === "Medium" && isBoostActive("scary_mike") && farmPanelCropAOEBonus(g, "Scary Mike", plot, {
    width: 1,
    height: 1
  }, "skill_horror_mike", cropAoeCooldownSec, atTime)) {
    const v = isSkillActive("skill_horror_mike") ? .2 + (ASCENSION_RANK_DATA.skill_horror_mike && ASCENSION_RANK_DATA.skill_horror_mike.values || [ .1, .15, .2 ])[Math.min(Math.max(getAscensionRank("skill_horror_mike"), 1), 3) - 1] : .2;
    amount += v;
    boosts.push({
      name: "Scary Mike",
      valueText: `+${fmt(v)} yield (AOE)`
    });
  }
  if (isBoostActive("sir_goldensnout") && farmPanelCropAOEBonus(g, "Sir Goldensnout", plot, {
    width: 2,
    height: 2
  }, null, cropAoeCooldownSec, atTime)) {
    amount += .5;
    boosts.push({
      name: "Sir Goldensnout",
      valueText: "+0.5 yield (AOE)"
    });
  }
  if (tierLabel === "Advanced" && isBoostActive("laurie_chuckle_crow") && farmPanelCropAOEBonus(g, "Laurie the Chuckle Crow", plot, {
    width: 1,
    height: 1
  }, "skill_lauries_gains", cropAoeCooldownSec, atTime)) {
    const v = isSkillActive("skill_lauries_gains") ? .2 + (ASCENSION_RANK_DATA.skill_lauries_gains && ASCENSION_RANK_DATA.skill_lauries_gains.values || [ .1, .15, .2 ])[Math.min(Math.max(getAscensionRank("skill_lauries_gains"), 1), 3) - 1] : .2;
    amount += v;
    boosts.push({
      name: "Laurie the Chuckle Crow",
      valueText: `+${fmt(v)} yield (AOE)`
    });
  }
  if (cropName === "Corn" && isBoostActive("queen_cornelia") && farmPanelCropAOEBonus(g, "Queen Cornelia", plot, {
    width: 1,
    height: 2
  }, null, cropAoeCooldownSec, atTime)) {
    amount += 1;
    boosts.push({
      name: "Queen Cornelia",
      valueText: "+1 yield (AOE)"
    });
  }
  if ((tierLabel === "Medium" || tierLabel === "Advanced") && farmPanelGnomeAOEBonus(g, plot, cropAoeCooldownSec, atTime)) {
    amount += 10;
    boosts.push({
      name: "Gnome",
      valueText: "+10 yield (AOE combo)"
    });
  }
  amount += generic.add;
  const plotFertiliserName = plot && plot.fertiliser && plot.fertiliser.name;
  if (plotFertiliserName === "Sprout Mix" || plotFertiliserName === "Sproutroot Surprise") {
    amount += .2;
    boosts.push({
      name: plotFertiliserName,
      valueText: "+0.2 yield (fertiliser)"
    });
    if (isBoostActive("knowledge_crab")) {
      amount += .2;
      boosts.push({
        name: "Knowledge Crab",
        valueText: "+0.2 yield (doubles fertiliser)"
      });
    }
  }
  if (plot && plot.beeSwarm && typeof plot.beeSwarm.count === "number" && plot.beeSwarm.count > 0) {
    let perSwarm = .2;
    if (isSkillActive("skill_pollen_power_up")) perSwarm += .1;
    const total = perSwarm * plot.beeSwarm.count;
    amount += total;
    boosts.push({
      name: "Bee Swarm",
      valueText: `+${fmt(total)} yield (${plot.beeSwarm.count} swarm${plot.beeSwarm.count === 1 ? "" : "s"} on this plot${isSkillActive("skill_pollen_power_up") ? " · incl. Pollen Power Up" : ""})`
    });
  }
  if (tierLabel) {
    if (isSkillActive("skill_acre_farm")) {
      const rank = getAscensionRank("skill_acre_farm");
      const data = ASCENSION_RANK_DATA.skill_acre_farm.values;
      const idx = Math.min(Math.max(rank, 1), 3) - 1;
      const v = tierLabel === "Advanced" ? data["tierEffects.Advanced"][idx] : data["tierEffects." + tierLabel][idx];
      amount += v;
      boosts.push({
        name: "Acre Farm",
        valueText: `${v > 0 ? "+" : ""}${fmt(v)} yield`
      });
    }
    if (isSkillActive("skill_hectare_farm")) {
      const rank = getAscensionRank("skill_hectare_farm");
      const data = ASCENSION_RANK_DATA.skill_hectare_farm.values;
      const idx = Math.min(Math.max(rank, 1), 3) - 1;
      const v = tierLabel === "Advanced" ? data["tierEffects.Advanced"][idx] : data["tierEffects." + tierLabel][idx];
      amount += v;
      boosts.push({
        name: "Hectare Farm",
        valueText: `${v > 0 ? "+" : ""}${fmt(v)} yield`
      });
    }
  }
  if (isOvernightGroundCrop(cropName) && isBoostActive("hoot")) {
    amount += .5;
    boosts.push({
      name: "Hoot",
      valueText: "+0.5 yield"
    });
  }
  if (!isGreenhouse && currentSeason === "Spring" && isCropInSeason(cropName, "Spring") && isBoostActive("blossom_ward")) {
    amount += 1;
    boosts.push({
      name: "Blossom Ward",
      valueText: "+1 yield"
    });
  }
  if (!isGreenhouse && currentSeason === "Winter" && isCropInSeason(cropName, "Winter") && isBoostActive("frozen_heart")) {
    amount += 1;
    boosts.push({
      name: "Frozen Heart",
      valueText: "+1 yield"
    });
  }
  const budAdd = farmPanelGetBudYieldForResource(cropName) || 0;
  if (budAdd) {
    amount += budAdd;
    boosts.push({
      name: "Resource BUD",
      valueText: `+${fmt(budAdd)} yield`
    });
  }
  if (isBoostActive("insect_plague")) {
    amount *= .5;
    boosts.push({
      name: "Insect Plague",
      valueText: "×0.5 yield"
    });
  }
  if (isBoostActive("bountiful_harvest")) {
    amount += 1;
    boosts.push({
      name: "Bountiful Harvest",
      valueText: "+1 yield"
    });
    if (getActiveSeasonGuardianName()) {
      amount += 1;
      boosts.push({
        name: currentSeason + " Guardian",
        valueText: "+1 yield (doubles Bountiful Harvest)"
      });
    }
  }
  let seedReward = null;
  if (!isGreenhouse && Number.isFinite(farmId) && farmId > 0 && itemId) {
    const gotSeedDrop = sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: 5,
      criticalHitName: cropName
    });
    if (gotSeedDrop) {
      const seedName = cropName + " Seed";
      const isTwoSeeds = sflPrngChance({
        farmId: farmId,
        itemId: itemId,
        counter: counter,
        chance: 50,
        criticalHitName: seedName
      });
      seedReward = {
        seedName: seedName,
        amount: isTwoSeeds ? 2 : 3
      };
    }
  }
  return {
    amount: Math.round(amount * 1e4) / 1e4,
    boosts: boosts,
    seedReward: seedReward
  };
}

export function farmPanelComputeExactFruitYield(json, g, fruitName, counter, isGreenhouse, patchFertiliserName) {
  const lastInfo = farmPanelGetLastInfo();
  const farmId = Number(lastInfo.id);
  const itemId = FRUIT_KNOWN_IDS[fruitName];
  let amount = 1;
  const boosts = [];
  if (Number.isFinite(farmId) && farmId > 0 && itemId && !isGreenhouse && isSkillActive("skill_generous_orchard")) {
    const rank = getAscensionRank("skill_generous_orchard");
    const chances = [ 20, 30, 50 ];
    const chance = chances[Math.min(Math.max(rank, 1), 3) - 1];
    if (sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: counter,
      chance: chance,
      criticalHitName: "Generous Orchard"
    })) {
      amount += 1;
      boosts.push({
        name: "Generous Orchard",
        valueText: "+1 yield (crit)"
      });
    }
  }
  const fruitExcludeIds = isGreenhouse ? new Set([ ...FRUIT_PRNG_EXCLUDE, ...PATCH_FRUIT_ONLY_GLOBAL_BOOSTS_EXCLUDED_FROM_GREENHOUSE ]) : FRUIT_PRNG_EXCLUDE;
  const generic = farmPanelSumCatalogBoosts(b => b.scope === "fruit" && b.target === fruitName || b.category === "fruits" && b.scope === "global" || b.category === "fruits" && b.scope === "fruitList" && Array.isArray(b.fruits) && b.fruits.includes(fruitName), fruitExcludeIds);
  amount += generic.add;
  amount *= generic.mult;
  generic.boosts.forEach(b => {
    const parts = [];
    if (typeof b.yieldAdd === "number" && b.yieldAdd) parts.push(`+${fmt(b.yieldAdd)} yield`);
    if (typeof b.yieldMult === "number" && b.yieldMult !== 1) parts.push(`×${b.yieldMult} yield`);
    if (parts.length) boosts.push({
      name: b.name,
      valueText: parts.join(", ")
    });
  });
  if (!isGreenhouse && (patchFertiliserName === "Fruitful Blend" || patchFertiliserName === "Turbofruit Mix")) {
    let fertBonus = .1;
    let fruitfulBountyMult = 1;
    if (isSkillActive("skill_fruitful_bounty")) {
      const rank = getAscensionRank("skill_fruitful_bounty");
      const values = ASCENSION_RANK_DATA.skill_fruitful_bounty.values;
      fruitfulBountyMult = values[Math.min(Math.max(rank, 1), values.length) - 1];
      fertBonus *= fruitfulBountyMult;
    }
    amount += fertBonus;
    boosts.push({
      name: patchFertiliserName,
      valueText: `+${fmt(fertBonus)} yield (fertiliser${isSkillActive("skill_fruitful_bounty") ? ` · ×${fmt(fruitfulBountyMult)} by Fruitful Bounty` : ""})`
    });
  }
  const budAdd = farmPanelGetBudYieldForResource(fruitName) || 0;
  if (budAdd) {
    amount += budAdd;
    boosts.push({
      name: "Resource BUD",
      valueText: `+${fmt(budAdd)} yield`
    });
  }
  if (isBoostActive("bountiful_harvest")) {
    amount += 1;
    boosts.push({
      name: "Bountiful Harvest",
      valueText: "+1 yield"
    });
    if (getActiveSeasonGuardianName()) {
      amount += 1;
      boosts.push({
        name: currentSeason + " Guardian",
        valueText: "+1 yield (doubles Bountiful Harvest)"
      });
    }
  }
  return {
    amount: Math.round(amount * 1e4) / 1e4,
    boosts: boosts
  };
}

export function farmPanelComputeExactGreenhouseYield(json, g, plantName, counter, potFertiliserName) {
  const isFruit = plantName === "Grape";
  const base = isFruit ? farmPanelComputeExactFruitYield(json, g, plantName, counter, true) : farmPanelComputeExactCropYield(json, g, plantName, null, counter, true);
  let amount = base.amount;
  const boosts = base.boosts.slice();
  const generic = farmPanelSumCatalogBoosts(b => b.scope === "greenhouse" && b.target === plantName || b.category === "greenhouse" && b.scope === "global", new Set([ "skill_greenhouse_gamble", "apply_greenhouse_goodie" ]));
  amount += generic.add;
  amount *= generic.mult;
  generic.boosts.forEach(b => {
    const parts = [];
    if (typeof b.yieldAdd === "number" && b.yieldAdd) parts.push(`+${fmt(b.yieldAdd)} yield`);
    if (typeof b.yieldMult === "number" && b.yieldMult !== 1) parts.push(`×${b.yieldMult} yield`);
    if (parts.length) boosts.push({
      name: b.name,
      valueText: parts.join(", ")
    });
  });
  if (isSkillActive("skill_greenhouse_gamble")) {
    const lastInfo = farmPanelGetLastInfo();
    const farmId = Number(lastInfo.id);
    const itemId = CROP_KNOWN_IDS[plantName] || FRUIT_KNOWN_IDS[plantName];
    if (Number.isFinite(farmId) && farmId > 0 && itemId) {
      const rank = getAscensionRank("skill_greenhouse_gamble");
      const chances = [ 30, 40, 50 ];
      if (sflPrngChance({
        farmId: farmId,
        itemId: itemId,
        counter: counter,
        chance: chances[Math.min(Math.max(rank, 1), 3) - 1],
        criticalHitName: "Greenhouse Gamble"
      })) {
        amount += 1;
        boosts.push({
          name: "Greenhouse Gamble",
          valueText: "+1 yield (crit)"
        });
      }
    }
  }
  if (potFertiliserName === "Greenhouse Goodie") {
    amount += .2;
    boosts.push({
      name: "Greenhouse Goodie",
      valueText: "+0.2 yield (fertiliser)"
    });
  }
  return {
    amount: Math.round(amount * 1e4) / 1e4,
    boosts: boosts
  };
}

function farmPanelPredictTreeTurnaroundForType(json, treeType) {
  if (!isSkillActive("skill_tree_turnaround")) return null;
  const rank = getAscensionRank("skill_tree_turnaround");
  const values = ASCENSION_RANK_DATA.skill_tree_turnaround.values;
  const chance = values[Math.min(Math.max(rank, 1), values.length) - 1];
  return farmPanelPredictTreeTypeRoll(json, treeType, "Tree Turnaround", chance);
}

function farmPanelPredictMoneyTreeForType(json, treeType) {
  if (!isSkillActive("skill_money_tree")) return null;
  const rank = getAscensionRank("skill_money_tree");
  const values = ASCENSION_RANK_DATA.skill_money_tree.values;
  const chance = values[Math.min(Math.max(rank, 1), values.length) - 1];
  return farmPanelPredictTreeTypeRoll(json, treeType, "Money Tree", chance);
}

function farmPanelPredictMoneyTreeBatchForType(json, treeType, count, multiplier) {
  if (!isSkillActive("skill_money_tree")) return null;
  const mult = typeof multiplier === "number" && multiplier > 0 ? multiplier : 1;
  if (!(count > 0)) return {
    procCount: 0,
    coins: 0
  };
  const lastInfo = farmPanelGetLastInfo();
  const farmId = Number(lastInfo.id);
  if (!Number.isFinite(farmId) || farmId <= 0) return null;
  const g = farmSyncExtractGameState(json);
  const farmActivity = farmPanelField(g, "farmActivity");
  if (!farmActivity || typeof farmActivity !== "object") return null;
  const itemId = TREE_KNOWN_IDS[treeType];
  if (!itemId) return null;
  const rank = getAscensionRank("skill_money_tree");
  const values = ASCENSION_RANK_DATA.skill_money_tree.values;
  const chance = values[Math.min(Math.max(rank, 1), values.length) - 1];
  const activityKey = `${treeType === "Tree" ? "Basic Tree" : treeType} Chopped`;
  const baseCounter = typeof farmActivity[activityKey] === "number" ? farmActivity[activityKey] : 0;
  let procCount = 0;
  for (let i = 0; i < count; i++) {
    if (sflPrngChance({
      farmId: farmId,
      itemId: itemId,
      counter: baseCounter + i,
      chance: chance,
      criticalHitName: "Money Tree"
    })) procCount++;
  }
  return {
    procCount: procCount,
    coins: procCount * 200 * mult
  };
}

export function farmPanelDetectMoneyTreeBonus(json) {
  const g = farmSyncExtractGameState(json);
  const trees = farmPanelField(g, "trees");
  if (!trees || typeof trees !== "object") return {
    totalCoins: 0,
    count: 0,
    predictedTypes: [],
    predictedCoins: 0,
    batchPredictions: []
  };
  let totalCoins = 0, count = 0;
  const nodeCountByType = {};
  const multiplierByType = {};
  Object.values(trees).forEach(node => {
    const nodeMultiplier = node && typeof node.multiplier === "number" ? node.multiplier : 1;
    const reward = node && node.wood && node.wood.reward;
    const coins = reward && typeof reward.coins === "number" ? reward.coins : 0;
    if (coins > 0) {
      totalCoins += coins * nodeMultiplier;
      count++;
    }
    const type = farmPanelTreeTypeForNode(node);
    nodeCountByType[type] = (nodeCountByType[type] || 0) + 1;
    if (!(type in multiplierByType)) multiplierByType[type] = nodeMultiplier;
  });
  const predictedTypes = [];
  const batchPredictions = [];
  Object.keys(nodeCountByType).forEach(type => {
    if (farmPanelPredictMoneyTreeForType(json, type) === true) predictedTypes.push(type);
    const batch = farmPanelPredictMoneyTreeBatchForType(json, type, nodeCountByType[type], multiplierByType[type]);
    if (batch && batch.procCount > 0) {
      batchPredictions.push({
        type: type,
        nodeCount: nodeCountByType[type],
        procCount: batch.procCount,
        coins: batch.coins,
        multiplier: multiplierByType[type]
      });
    }
  });
  const predictedCoins = predictedTypes.reduce((sum, type) => sum + 200 * (multiplierByType[type] || 1), 0);
  return {
    totalCoins: totalCoins,
    count: count,
    predictedTypes: predictedTypes,
    predictedCoins: predictedCoins,
    batchPredictions: batchPredictions
  };
}

export function farmPanelRenderMoneyTreeBonusCard(data) {
  const hasBatch = data && data.batchPredictions && data.batchPredictions.length > 0;
  if (!data || !(data.totalCoins > 0 || data.predictedCoins > 0 || hasBatch)) return "";
  const parts = [];
  if (data.totalCoins > 0) {
    const nodeNote = ` on ${data.count} tree node${data.count === 1 ? "" : "s"}`;
    parts.push(`+${fmt(data.totalCoins)} coins confirmed${nodeNote}`);
  }
  if (hasBatch) {
    data.batchPredictions.forEach(b => {
      const multNote = b.multiplier > 1 ? ` (×${fmt(b.multiplier)} node)` : "";
      parts.push(`~${b.procCount}/${b.nodeCount} ${b.type} node${b.nodeCount === 1 ? "" : "s"}${multNote} predicted to proc as you chop through them (+${fmt(b.coins)} coins)`);
    });
  } else if (data.predictedCoins > 0) {
    const typeList = data.predictedTypes.join(", ");
    parts.push(`+${fmt(data.predictedCoins)} coins predicted on your next ${typeList} chop${data.predictedTypes.length === 1 ? "" : "es (one per type)"}`);
  }
  return `\n  <div class="money-tree-alert-card" data-search="money-tree-bonus">\n    <div class="money-tree-alert-shine"></div>\n    <div class="money-tree-alert-icon">${COIN_ICON}</div>\n    <div class="money-tree-alert-text">\n      <div class="money-tree-alert-title">💰 Money Tree Bonus Pending!</div>\n      <div class="money-tree-alert-name">${parts.join(" — ")}</div>\n    </div>\n  </div>`;
}

function farmPanelIsNodeReadyNow(resourceName, node, subKey, now) {
  const job = node && node[subKey];
  const ts = job && (job.minedAt || job.choppedAt || job.harvestedAt || job.stoneMinedAt || job.recoveredAt) || node && (node.minedAt || node.choppedAt || node.harvestedAt);
  if (!ts) {
    const amountVal = job && typeof job.amount === "number" ? job.amount : node && typeof node.amount === "number" ? node.amount : null;
    return amountVal !== 0;
  }
  const growSec = farmPanelGrowTimeSec(resourceName);
  const elapsedSec = (now - ts) / 1e3;
  const remainingSec = growSec != null ? Math.max(0, growSec - elapsedSec) : null;
  return remainingSec != null ? remainingSec <= 0 : false;
}

let farmPanelAnimalYieldGroupsByType = {};

let farmPanelAnimalBuffTrackingByType = {};

function farmPanelComputeInProgressRaw(json) {
  const g = farmSyncExtractGameState(json);
  const now = Date.now();
  const rows = [];
  farmPanelAnimalYieldGroupsByType = {};
  farmPanelAnimalBuffTrackingByType = {};
  const farmActivity = farmPanelField(g, "farmActivity") || {};
  const cropWeatherDestruction = computeDestroyedCropPlotIds(g);
  const cropWeatherDestructionLabel = cropWeatherDestruction.activeEvent ? ((CALENDAR_SEASONAL_BOOSTS.find(e => e.calendarKey === cropWeatherDestruction.activeEvent) || {}).name || null) : null;
  const addPlanted = (bag, subKey, kind) => {
    if (!bag || typeof bag !== "object") return;
    const sequentialCounterBaseByName = {};
    const sequentialIndexByName = {};
    const plotIndexByName = {};
    if (kind === "crop" || kind === "fruit" || kind === "greenhouse") {
      Object.values(bag).forEach(plot => {
        const job = plot && plot[subKey];
        const name = job && job.name;
        const plantedAt = job && job.plantedAt;
        if (!name || !plantedAt) return;
        const refTime = job.harvestedAt && job.harvestedAt > plantedAt ? job.harvestedAt : plantedAt;
        const growSec = farmPanelGrowTimeSec(name);
        const elapsedSec = (now - refTime) / 1e3;
        const remainingSec = growSec != null ? Math.max(0, growSec - elapsedSec) : null;
        const isReadyNow = remainingSec != null ? remainingSec <= 0 : false;
        const storedAmount = typeof job.amount === "number" ? job.amount : null;
        if (storedAmount == null && !(name in sequentialCounterBaseByName)) {
          sequentialCounterBaseByName[name] = farmActivity[`${name} Harvested`] || 0;
          sequentialIndexByName[name] = 0;
        }
      });
    }
    Object.entries(bag).forEach(([plotId, plot]) => {
      const job = plot && plot[subKey];
      const name = job && job.name;
      const plantedAt = job && job.plantedAt;
      if (!name || !plantedAt) return;
      const isWeatherDestroyedPlot = kind === "crop" && !!cropWeatherDestruction.activeEvent && cropWeatherDestruction.destroyedIds.has(plotId);
      const refTime = job.harvestedAt && job.harvestedAt > plantedAt ? job.harvestedAt : plantedAt;
      const growSec = farmPanelGrowTimeSec(name);
      const elapsedSec = (now - refTime) / 1e3;
      let remainingSec = growSec != null ? Math.max(0, growSec - elapsedSec) : null;
      if (kind === "crop" && remainingSec != null && remainingSec > 0) {
        const sunshowerMult = getCropPlotSunshowerSpeedMultiplier();
        if (sunshowerMult > 1) remainingSec = remainingSec / sunshowerMult;
      }
      const isReadyNow = isWeatherDestroyedPlot ? false : remainingSec != null ? remainingSec <= 0 : false;
      const storedAmount = typeof job.amount === "number" ? job.amount : null;
      const plotIdx = (plotIndexByName[name] || 0) + 1;
      plotIndexByName[name] = plotIdx;
      let exactAmount = null;
      let exactBoosts = null;
      let seedReward = null;
      if (isWeatherDestroyedPlot) {
        exactAmount = 0;
        exactBoosts = [ {
          name: cropWeatherDestructionLabel || "Weather Event",
          valueText: "Plot destroyed — cannot be harvested"
        } ];
      } else if (kind === "flower") {
        try {
          const r = farmPanelComputeExactFlowerYield(job);
          exactAmount = r.amount;
          exactBoosts = r.boosts;
        } catch (e) {
          exactAmount = null;
          exactBoosts = null;
        }
      } else if (kind === "crop" || kind === "fruit" || kind === "greenhouse") {
        try {
          const idx = sequentialIndexByName[name] || 0;
          const counter = (sequentialCounterBaseByName[name] || 0) + idx;
          sequentialIndexByName[name] = idx + 1;
          let r = null;
          if (kind === "crop") {
            const predictedReadyAt = remainingSec != null ? now + remainingSec * 1e3 : now;
            r = farmPanelComputeExactCropYield(json, g, name, plot, counter, false, predictedReadyAt);
          } else if (kind === "fruit") {
            r = farmPanelComputeExactFruitYield(json, g, name, counter, false, plot && plot.fertiliser && plot.fertiliser.name);
          } else if (kind === "greenhouse") {
            r = farmPanelComputeExactGreenhouseYield(json, g, name, counter, plot && plot.fertiliser && plot.fertiliser.name);
          }
          if (r) {
            exactAmount = r.amount;
            exactBoosts = r.boosts;
            if (kind === "crop" && r.seedReward) seedReward = r.seedReward;
          }
        } catch (e) {
          exactAmount = null;
          exactBoosts = null;
        }
      }
      const actualAmount = exactAmount != null ? exactAmount : storedAmount;
      const actualBoosts = exactAmount != null ? exactBoosts : null;
      
      
      
      
      const harvestsLeft = kind === "fruit" && job && typeof job.harvestsLeft === "number" ? job.harvestsLeft : undefined;
      rows.push({
        name: name,
        qty: actualAmount,
        ready: isWeatherDestroyedPlot ? false : remainingSec != null ? remainingSec <= 0 : null,
        remainingSec: remainingSec,
        isActualYield: actualAmount != null,
        isDeterministicYield: kind === "flower",
        exactBoosts: actualAmount != null ? actualBoosts || [] : null,
        harvestsLeft: harvestsLeft,
        plotIndex: plotIdx,
        seedReward: seedReward,
        weatherDestroyed: isWeatherDestroyedPlot,
        weatherDestroyedEvent: isWeatherDestroyedPlot ? cropWeatherDestructionLabel : null
      });
    });
  };
  addPlanted(farmPanelField(g, "crops"), "crop", "crop");
  addPlanted(farmPanelField(g, "fruitPatches"), "fruit", "fruit");
  const greenhouse = farmPanelField(g, "greenhouse");
  if (greenhouse && greenhouse.pots) addPlanted(greenhouse.pots, "plant", "greenhouse");
  const flowers = farmPanelField(g, "flowers");
  if (flowers && flowers.flowerBeds) addPlanted(flowers.flowerBeds, "flower", "flower");
  [ [ "stones", "stone", "Stone" ], [ "iron", "stone", "Iron" ], [ "gold", "stone", "Gold" ], [ "crimstones", "stone", "Crimstone" ], [ "trees", "wood", "Wood" ] ].forEach(([bagKey, subKey, resourceName]) => {
    const bag = farmPanelField(g, bagKey);
    if (!bag || typeof bag !== "object") return;
    const tiers = RESOURCE_NODE_TIERS[resourceName] || null;
    const boostedForResource = tiers ? farmPanelGetBoostedYieldStats(resourceName) : null;
    const woodSequentialRollsByType = {};
    const stoneSequentialRollsByType = {};
    const ironSequentialRollsByType = {};
    const goldSequentialRollsByType = {};
    const sequentialIndexByType = {};
    if ([ "Wood", "Stone", "Iron", "Gold" ].includes(resourceName)) {
      const allCountByType = {};
      Object.values(bag).forEach(node => {
        const type = resourceName === "Wood" ? farmPanelTreeTypeForNode(node) : resourceName === "Stone" ? farmPanelRockNameForNode(node, STONE_KNOWN_IDS, "Stone Rock") : resourceName === "Iron" ? farmPanelRockNameForNode(node, IRON_KNOWN_IDS, "Iron Rock") : farmPanelRockNameForNode(node, GOLD_KNOWN_IDS, "Gold Rock");
        allCountByType[type] = (allCountByType[type] || 0) + 1;
      });
      if (resourceName === "Wood") {
        Object.keys(TREE_KNOWN_IDS).forEach(t => {
          woodSequentialRollsByType[t] = farmPanelBuildSequentialWoodRollChains(json, t, allCountByType[t] || 0);
          sequentialIndexByType[t] = 0;
        });
      }
      if (resourceName === "Stone") {
        Object.keys(STONE_KNOWN_IDS).forEach(t => {
          stoneSequentialRollsByType[t] = farmPanelBuildSequentialStoneRolls(json, t, allCountByType[t] || 0);
          sequentialIndexByType[t] = 0;
        });
      }
      if (resourceName === "Iron") {
        Object.keys(IRON_KNOWN_IDS).forEach(t => {
          ironSequentialRollsByType[t] = farmPanelBuildSequentialIronRolls(json, t, allCountByType[t] || 0);
          sequentialIndexByType[t] = 0;
        });
      }
      if (resourceName === "Gold") {
        Object.keys(GOLD_KNOWN_IDS).forEach(t => {
          goldSequentialRollsByType[t] = farmPanelBuildSequentialGoldRollChains(json, t, allCountByType[t] || 0);
          sequentialIndexByType[t] = 0;
        });
      }
    }
    let crimstoneRollChains = null;
    let crimstoneSequentialIndex = 0;
    if (resourceName === "Crimstone") {
      crimstoneRollChains = farmPanelBuildSequentialCrimstoneRollChains(json, Object.values(bag).length);
    }
    Object.values(bag).forEach(node => {
      const job = node && node[subKey];
      const ts = job && (job.minedAt || job.choppedAt || job.harvestedAt || job.stoneMinedAt || job.recoveredAt) || node && (node.minedAt || node.choppedAt || node.harvestedAt);
      const tierMatch = tiers ? farmPanelDetectNodeTier(resourceName, node) : null;
      const tierLabel = tierMatch && tierMatch.key !== "base" ? tierMatch.label : null;
      const treeType = resourceName === "Wood" ? farmPanelTreeTypeForNode(node) : null;
      const stoneRockName = resourceName === "Stone" ? farmPanelRockNameForNode(node, STONE_KNOWN_IDS, "Stone Rock") : null;
      const ironRockName = resourceName === "Iron" ? farmPanelRockNameForNode(node, IRON_KNOWN_IDS, "Iron Rock") : null;
      const goldRockName = resourceName === "Gold" ? farmPanelRockNameForNode(node, GOLD_KNOWN_IDS, "Gold Rock") : null;
      const isReadyNow = farmPanelIsNodeReadyNow(resourceName, node, subKey, now);
      const storedAmount = job && typeof job.amount === "number" ? job.amount : null;
      const growSecForNode = farmPanelGrowTimeSec(resourceName);
      const remainingSecForNode = ts && growSecForNode != null ? Math.max(0, growSecForNode - (now - ts) / 1e3) : null;
      const predictedMineAt = remainingSecForNode != null ? now + remainingSecForNode * 1e3 : now;
      let exactAmount = null;
      let exactBoosts = null;
      let woodCritRollsForNode = null;
      let woodChainForNode = null;
      let goldCritRollsForNode = null;
      let goldChainForNode = null;
      let crimstoneChainForNode = null;
      let crimstoneNodeIndexForRow = null;
      let crimstoneRockMinesLeftForRow = null;
      if (storedAmount == null && resourceName === "Crimstone") {
        const idx = crimstoneSequentialIndex++;
        crimstoneNodeIndexForRow = idx + 1;
        const chain = crimstoneRollChains && crimstoneRollChains[idx] ? crimstoneRollChains[idx] : null;
        crimstoneChainForNode = chain;
        const rockMinesLeftStart = node && typeof node.minesLeft === "number" ? node.minesLeft : 5;
        crimstoneRockMinesLeftForRow = rockMinesLeftStart;
        if (chain && chain.length > 1) {
          let minesLeftCursor = rockMinesLeftStart;
          let total = 0;
          const chainBoostTotals = new Map;
          chain.forEach((roll, i) => {
            const r = farmPanelComputeExactCrimstoneYield(g, node, minesLeftCursor, i === 0);
            total += r.amount;
            (r.boosts || []).forEach(b => {
              const amt = parseYieldBoostAmount(b.valueText);
              chainBoostTotals.set(b.name, (chainBoostTotals.get(b.name) || 0) + amt);
            });
            if (i > 0) chainBoostTotals.set("Crimstone Clam", (chainBoostTotals.get("Crimstone Clam") || 0) + 1);
            minesLeftCursor = minesLeftCursor === 1 ? 5 : minesLeftCursor - 1;
          });
          exactAmount = total;
          exactBoosts = Array.from(chainBoostTotals.entries()).map(([name, amt]) => ({
            name: name,
            valueText: `+${fmt(amt)} yield`
          }));
        } else {
          const r = farmPanelComputeExactCrimstoneYield(g, node, rockMinesLeftStart);
          exactAmount = r.amount;
          exactBoosts = r.boosts;
        }
      } else if (storedAmount == null && resourceName === "Wood" && treeType) {
        const idx = sequentialIndexByType[treeType] || 0;
        const rolls = woodSequentialRollsByType[treeType];
        
        
        
        
        const chain = rolls && rolls[idx] ? rolls[idx] : null;
        if (chain) sequentialIndexByType[treeType] = idx + 1;
        const critRolls = chain && chain.length ? chain[0] : null;
        woodCritRollsForNode = critRolls;
        woodChainForNode = chain;
        if (chain && chain.length) {
          exactAmount = chain.reduce((sum, roll) => sum + farmPanelComputeExactWoodYieldForNode(node, treeType, roll), 0);
        } else {
          exactAmount = farmPanelComputeExactWoodYieldForNode(node, treeType, critRolls);
        }
      } else if (storedAmount == null && resourceName === "Stone" && stoneRockName) {
        const idx = sequentialIndexByType[stoneRockName] || 0;
        const rolls = stoneSequentialRollsByType[stoneRockName];
        const critRolls = rolls && rolls[idx] ? rolls[idx] : null;
        if (critRolls) sequentialIndexByType[stoneRockName] = idx + 1;
        exactAmount = farmPanelComputeExactStoneYieldForNode(json, node, stoneRockName, critRolls, predictedMineAt);
      } else if (storedAmount == null && resourceName === "Iron" && ironRockName) {
        const idx = sequentialIndexByType[ironRockName] || 0;
        const rolls = ironSequentialRollsByType[ironRockName];
        const critRolls = rolls && rolls[idx] ? rolls[idx] : null;
        if (critRolls) sequentialIndexByType[ironRockName] = idx + 1;
        exactAmount = farmPanelComputeExactIronYieldForNode(json, node, ironRockName, critRolls, predictedMineAt);
      } else if (storedAmount == null && resourceName === "Gold" && goldRockName) {
        const idx = sequentialIndexByType[goldRockName] || 0;
        const rolls = goldSequentialRollsByType[goldRockName];
        
        
        const chain = rolls && rolls[idx] ? rolls[idx] : null;
        if (chain) sequentialIndexByType[goldRockName] = idx + 1;
        const critRolls = chain && chain.length ? chain[0] : null;
        goldCritRollsForNode = critRolls;
        goldChainForNode = chain;
        if (chain && chain.length) {
          exactAmount = chain.reduce((sum, roll) => sum + farmPanelComputeExactGoldYieldForNode(json, node, goldRockName, roll, predictedMineAt), 0);
        } else {
          exactAmount = farmPanelComputeExactGoldYieldForNode(json, node, goldRockName, critRolls, predictedMineAt);
        }
      }
      const actualAmount = storedAmount != null ? storedAmount : exactAmount;
      const tierGroupLabel = tierMatch ? tierMatch.displayLabel || tierMatch.label : resourceName === "Crimstone" ? "Crimstone Rock" : null;
      const tierAverageYield = tierMatch ? (boostedForResource.perTierYield && boostedForResource.perTierYield[tierMatch.key] != null ? boostedForResource.perTierYield[tierMatch.key] : boostedForResource.yieldVal) * tierMatch.mult + tierMatch.yieldAdd : null;
      const qty = actualAmount != null ? actualAmount : tierAverageYield;
      const turnaroundPredicted = treeType ? Boolean(woodChainForNode && woodChainForNode.length > 1) : null;
      
      
      
      const turnaroundBonusEstimate = turnaroundPredicted ? woodChainForNode.slice(1).reduce((sum, roll) => sum + farmPanelComputeExactWoodYieldForNode(node, treeType, roll), 0) : null;
      const turnaroundChainLength = woodChainForNode ? woodChainForNode.length : null;
      const goldInstantMinePredicted = goldRockName ? Boolean(goldChainForNode && goldChainForNode.length > 1) : null;
      
      
      const goldInstantMineBonusEstimate = goldInstantMinePredicted ? goldChainForNode.slice(1).reduce((sum, roll) => sum + farmPanelComputeExactGoldYieldForNode(json, node, goldRockName, roll, predictedMineAt), 0) : null;
      const goldInstantMineChainLength = goldChainForNode ? goldChainForNode.length : null;
      const crimstoneInstantMinePredicted = resourceName === "Crimstone" ? Boolean(crimstoneChainForNode && crimstoneChainForNode.length > 1) : null;
      let crimstoneInstantMineBonusEstimate = null;
      if (crimstoneInstantMinePredicted) {
        const rockMinesLeftStart = node && typeof node.minesLeft === "number" ? node.minesLeft : 5;
        let minesLeftCursor = rockMinesLeftStart;
        let bonus = 0;
        crimstoneChainForNode.forEach((roll, i) => {
          if (i > 0) bonus += farmPanelComputeExactCrimstoneYield(g, node, minesLeftCursor, false).amount;
          minesLeftCursor = minesLeftCursor === 1 ? 5 : minesLeftCursor - 1;
        });
        crimstoneInstantMineBonusEstimate = bonus;
      }
      const crimstoneInstantMineChainLength = crimstoneChainForNode ? crimstoneChainForNode.length : null;
      const crimstoneClamActiveForRow = resourceName === "Crimstone" ? isBoostActive("crimstone_clam") : false;
      if (!ts) {
        const amountVal = job && typeof job.amount === "number" ? job.amount : node && typeof node.amount === "number" ? node.amount : null;
        const looksDepleted = amountVal === 0;
        const growSecFallback = farmPanelGrowTimeSec(resourceName);
        rows.push({
          name: resourceName,
          qty: qty,
          ready: !looksDepleted,
          remainingSec: looksDepleted ? growSecFallback ?? 0 : 0,
          tierLabel: tierLabel,
          tierGroupLabel: tierGroupLabel,
          isActualYield: actualAmount != null,
          isDeterministicYield: resourceName === "Crimstone" ? !crimstoneClamActiveForRow : false,
          treeType: treeType,
          turnaroundPredicted: turnaroundPredicted,
          turnaroundBonusEstimate: turnaroundBonusEstimate,
          turnaroundChainLength: turnaroundChainLength,
          goldRockName: goldRockName,
          goldInstantMinePredicted: goldInstantMinePredicted,
          goldInstantMineBonusEstimate: goldInstantMineBonusEstimate,
          goldInstantMineChainLength: goldInstantMineChainLength,
          crimstoneInstantMinePredicted: crimstoneInstantMinePredicted,
          crimstoneInstantMineBonusEstimate: crimstoneInstantMineBonusEstimate,
          crimstoneInstantMineChainLength: crimstoneInstantMineChainLength,
          crimstoneNodeIndex: crimstoneNodeIndexForRow,
          crimstoneMinesLeft: crimstoneRockMinesLeftForRow,
          exactBoosts: exactBoosts
        });
        return;
      }
      const growSec = farmPanelGrowTimeSec(resourceName);
      const elapsedSec = (now - ts) / 1e3;
      const remainingSec = growSec != null ? Math.max(0, growSec - elapsedSec) : null;
      rows.push({
        name: resourceName,
        qty: qty,
        ready: remainingSec != null ? remainingSec <= 0 : null,
        remainingSec: remainingSec,
        tierLabel: tierLabel,
        tierGroupLabel: tierGroupLabel,
        isActualYield: actualAmount != null,
        isDeterministicYield: resourceName === "Crimstone" ? !crimstoneClamActiveForRow : false,
        treeType: treeType,
        turnaroundPredicted: turnaroundPredicted,
        turnaroundBonusEstimate: turnaroundBonusEstimate,
        turnaroundChainLength: turnaroundChainLength,
        goldRockName: goldRockName,
        goldInstantMinePredicted: goldInstantMinePredicted,
        goldInstantMineBonusEstimate: goldInstantMineBonusEstimate,
        goldInstantMineChainLength: goldInstantMineChainLength,
        crimstoneInstantMinePredicted: crimstoneInstantMinePredicted,
        crimstoneInstantMineBonusEstimate: crimstoneInstantMineBonusEstimate,
        crimstoneInstantMineChainLength: crimstoneInstantMineChainLength,
        crimstoneNodeIndex: crimstoneNodeIndexForRow,
        crimstoneMinesLeft: crimstoneRockMinesLeftForRow,
        exactBoosts: exactBoosts
      });
    });
  });
  const oilReserves = farmPanelField(g, "oilReserves");
  if (oilReserves && typeof oilReserves === "object") {
    Object.values(oilReserves).forEach(node => {
      const job = node && node.oil;
      const ts = job && job.drilledAt;
      const drilledCount = typeof node?.drilled === "number" ? node.drilled : null;
      const hasBonus = drilledCount != null ? (drilledCount + 1) % 3 === 0 : null;
      let oilQtyPerNode, exactOilBoosts, oilMinesUntilBonus;
      if (hasBonus == null) {
        oilQtyPerNode = computeBoostedResourceStats("Oil", RESOURCE_DATA.Oil.yieldPer, RESOURCE_DATA.Oil.timeSec).yieldVal;
        exactOilBoosts = null;
        oilMinesUntilBonus = null;
      } else {
        const exact = farmPanelComputeExactOilYield(hasBonus);
        oilQtyPerNode = exact.amount;
        exactOilBoosts = exact.boosts;
        oilMinesUntilBonus = ((2 - (drilledCount % 3) + 3) % 3) + 1;
      }
      if (!ts) {
        rows.push({
          name: "Oil",
          qty: oilQtyPerNode,
          ready: true,
          remainingSec: 0,
          isActualYield: hasBonus != null,
          isDeterministicYield: hasBonus != null,
          exactBoosts: exactOilBoosts,
          oilMinesUntilBonus: oilMinesUntilBonus
        });
        return;
      }
      const growSec = farmPanelGrowTimeSec("Oil");
      const elapsedSec = (now - ts) / 1e3;
      const remainingSec = growSec != null ? Math.max(0, growSec - elapsedSec) : null;
      rows.push({
        name: "Oil",
        qty: oilQtyPerNode,
        ready: remainingSec != null ? remainingSec <= 0 : null,
        remainingSec: remainingSec,
        isActualYield: hasBonus != null,
        isDeterministicYield: hasBonus != null,
        exactBoosts: exactOilBoosts,
        oilMinesUntilBonus: oilMinesUntilBonus
      });
    });
  }
  const lavaPits = farmPanelField(g, "lavaPits");
  if (lavaPits && typeof lavaPits === "object" && typeof computeBoostedLavaPitStats === "function") {
    const boostedLava = computeBoostedLavaPitStats(259200);
    Object.values(lavaPits).forEach(pit => {
      if (!pit || pit.x === undefined || pit.y === undefined) return;
      const readyAt = typeof pit.readyAt === "number" ? pit.readyAt : null;
      const createdAt = typeof pit.createdAt === "number" ? pit.createdAt : null;
      if (readyAt == null) return;
      if (createdAt != null && readyAt <= createdAt) return;
      const collectedAt = typeof pit.collectedAt === "number" ? pit.collectedAt : null;
      if (collectedAt != null && collectedAt >= readyAt) return;
      const remainingSec = Math.max(0, (readyAt - now) / 1e3);
      rows.push({
        name: "Obsidian",
        qty: boostedLava.yieldVal,
        ready: remainingSec <= 0,
        remainingSec: remainingSec
      });
    });
  }
  {
    const saltFarmObj = farmPanelField(g, "saltFarm");
    const saltLevelRaw = saltFarmObj && saltFarmObj.level;
    const saltLevel = typeof saltLevelRaw === "number" ? saltLevelRaw : typeof saltLevelRaw === "string" && saltLevelRaw.trim() && !isNaN(Number(saltLevelRaw)) ? Number(saltLevelRaw) : null;
    const saltYieldBonus = typeof getActiveSaltYieldBonus === "function" ? getActiveSaltYieldBonus() : 0;
    const saltYield = typeof SALT_BASE_YIELD === "number" ? SALT_BASE_YIELD + saltYieldBonus : null;
    const saltNodes = saltFarmObj && typeof saltFarmObj.nodes === "object" ? saltFarmObj.nodes : null;
    if (saltNodes && Object.keys(saltNodes).length) {
      const rechargeMult = typeof getActiveSaltRechargeMult === "function" ? getActiveSaltRechargeMult() : 1;
      const intervalMs = SALT_BASE_TIME_SEC * 1e3 * rechargeMult;
      const sculptLvl = typeof saltSculptureLevel === "number" ? saltSculptureLevel : 0;
      const maxCharges = SALT_BASE_CHARGE_CAP + (sculptLvl >= 3 ? 1 : 0) + (sculptLvl >= 6 ? 1 : 0);
      const physicalNodeCount = Object.keys(saltNodes).length;
      const saltNodeKeysSorted = Object.keys(saltNodes).sort();
      saltNodeKeysSorted.forEach((nodeKey, nodeIdx) => {
        const node = saltNodes[nodeKey];
        const salt = node && node.salt;
        if (!salt) return;
        let storedCharges = Math.max(0, Math.min(typeof salt.storedCharges === "number" ? salt.storedCharges : 0, maxCharges));
        let nextChargeAt = Number.isFinite(salt.nextChargeAt) ? salt.nextChargeAt : now + intervalMs;
        while (now >= nextChargeAt && storedCharges < maxCharges) {
          storedCharges += 1;
          nextChargeAt += intervalMs;
        }
        if (nextChargeAt < now) {
          const missedIntervals = Math.ceil((now - nextChargeAt) / intervalMs);
          nextChargeAt += missedIntervals * intervalMs;
        }
        const saltNodeMeta = {
          saltNodeIndex: nodeIdx + 1,
          saltNodeStoredCharges: storedCharges,
          saltNodeMaxCharges: maxCharges,
          saltYieldPerCharge: saltYield
        };
        for (let i = 0; i < storedCharges; i++) {
          rows.push({
            name: "Salt",
            qty: saltYield,
            ready: true,
            remainingSec: 0,
            physicalNodes: physicalNodeCount,
            ...saltNodeMeta
          });
        }
        if (storedCharges < maxCharges) {
          const remainingSec = Math.max(0, (nextChargeAt - now) / 1e3);
          rows.push({
            name: "Salt",
            qty: 0,
            ready: false,
            remainingSec: remainingSec,
            physicalNodes: physicalNodeCount,
            ...saltNodeMeta
          });
        }
      });
    } else if (saltLevel != null && typeof FARM_LEVEL_NODES !== "undefined" && FARM_LEVEL_NODES.length) {
      const clampedLevel = Math.max(1, Math.min(FARM_LEVEL_NODES.length, saltLevel));
      const slots = FARM_LEVEL_NODES[clampedLevel - 1] || 0;
      for (let i = 0; i < slots; i++) {
        rows.push({
          name: "Salt",
          qty: saltYield,
          ready: true,
          remainingSec: 0,
          estimated: true
        });
      }
    }
  }
  const hiveBag = farmPanelField(g, "beehives");
  if (hiveBag && typeof hiveBag === "object" && typeof computeHiveStats === "function") {
    const hiveStats = computeHiveStats();
    const HIVE_FULL_RAW = 864e5;
    
    
    const hiveEntries = Object.entries(hiveBag).filter(([, hive]) => hive && hive.honey && typeof hive.honey.produced === "number");
    hiveEntries.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
    
    
    
    const honeyNow = Math.min(now, farmPanelHoneySnapshotMs);
    hiveEntries.forEach(([hiveId, hive], hiveIndex) => {
      const storedProduced = hive.honey.produced;
      const updatedAt = typeof hive.honey.updatedAt === "number" ? hive.honey.updatedAt : honeyNow;
      const flowers = Array.isArray(hive.flowers) ? hive.flowers : [];
      const flower = flowers.find(f => f && typeof f.rate === "number" && f.rate > 0);
      let produced = storedProduced;
      let flowerStillActive = false;
      if (flower) {
        const attachedAt = typeof flower.attachedAt === "number" ? flower.attachedAt : updatedAt;
        const attachedUntil = typeof flower.attachedUntil === "number" ? flower.attachedUntil : honeyNow;
        const windowStart = Math.max(updatedAt, attachedAt);
        const windowEnd = Math.min(honeyNow, attachedUntil);
        if (windowEnd > windowStart) produced = storedProduced + flower.rate * (windowEnd - windowStart);
        flowerStillActive = attachedUntil > honeyNow;
      }
      const ready = produced >= HIVE_FULL_RAW;
      let remainingSec = 0;
      if (!ready) {
        remainingSec = flowerStillActive ? Math.max(0, (HIVE_FULL_RAW - produced) / flower.rate / 1e3) : null;
      }
      
      
      
      
      
      const fillFraction = Math.max(0, Math.min(1, produced / HIVE_FULL_RAW));
      const currentHoneyQty = fillFraction * hiveStats.honeyPerFill;
      rows.push({
        name: "Honey",
        
        
        qty: currentHoneyQty,
        maxHoneyPerFill: hiveStats.honeyPerFill,
        fillFraction: fillFraction,
        hiveIndex: hiveIndex,
        hiveId: hiveId,
        
        
        
        willSwarm: hive.swarm === true,
        isActualYield: true,
        ready: ready,
        remainingSec: remainingSec
      });
    });
  }
  if (typeof computeAnimalTypeFigures === "function" && typeof computeAnimalYieldsForLevel === "function") {
    [ "chicken", "sheep", "cow" ].forEach(type => {
      const bag = farmSyncGetAnimalRecords(g, type);
      if (!bag || typeof bag !== "object") return;
      const cycleSec = computeAnimalTypeFigures(type).cycleTimeSec || ANIMAL_BASE_CYCLE_SEC;
      
      
      const typeBoosts = getActiveAnimalBoosts(type);
      let baseFeedMultTotal = 1;
      let freeFeed = false;
      typeBoosts.forEach(b => {
        if (b.feedMult) baseFeedMultTotal *= b.feedMult;
        if (b.feedMultAll) baseFeedMultTotal *= b.feedMultAll;
        if (b.freeFeed) freeFeed = true;
      });
      const requiredQtyPerFeed = REQUIRED_FOOD_QTY_MAP[type];
      Object.entries(bag).forEach(([animalId, animal]) => {
        if (!animal || typeof animal !== "object") return;
        const toTs = v => typeof v === "number" ? v : typeof v === "string" && v.trim() && !isNaN(Number(v)) ? Number(v) : null;
        const awakeAt = toTs(animal.awakeAt);
        const asleepAt = toTs(animal.asleepAt ?? animal.sleepAt ?? animal.wentToSleepAt);
        const stateStr = typeof animal.state === "string" ? animal.state.toLowerCase() : "";
        const sick = animal.sick === true || stateStr === "sick" || typeof animal.sickenedAt === "number";
        const xpRaw = animal.experience ?? animal.exp ?? animal.xp;
        const xp = typeof xpRaw === "number" ? xpRaw : typeof xpRaw === "string" && xpRaw.trim() && !isNaN(Number(xpRaw)) ? Number(xpRaw) : null;
        const level = getAnimalLevelFromXp(type, xp) || 1;
        
        
        
        
        const realFeedBuffName = animal.feedBuff && typeof animal.feedBuff === "object" && animal.feedBuff.name && (typeof animal.feedBuff.harvestsRemaining !== "number" || animal.feedBuff.harvestsRemaining > 0) ? animal.feedBuff.name : null;
        const claimLevel = level < 15 ? level + 1 : 15;
        const fig = computeAnimalYieldsForLevel(type, claimLevel, realFeedBuffName);
        
        
        
        
        const feedFig = computeAnimalFeedFigures(type, level);
        const feedInfo = getActiveFeedInfo(feedFig.favouriteFoodKey);
        let animalFeedMultTotal = baseFeedMultTotal;
        if (realFeedBuffName === "Honey Treat") animalFeedMultTotal *= 0.75;
        const animalFeedQty = freeFeed ? 0 : Math.max(0, feedFig.noOfFeeds * requiredQtyPerFeed * animalFeedMultTotal);
        const animalFeedCostFlower = animalFeedQty * feedInfo.cost / (coinPerFlower || 1);
        const animalConsumableCostFlower = realFeedBuffName === "Salt Lick" ? getSpiceCostPerUseFlower("saltLick") / getSpiceLickDurationHarvests() : realFeedBuffName === "Honey Treat" ? getSpiceCostPerUseFlower("honeyTreat") / getSpiceLickDurationHarvests() : 0;
        let ready, remainingSec;
        if (sick) {
          ready = false;
          remainingSec = null;
        } else if (awakeAt != null) {
          remainingSec = Math.max(0, (awakeAt - now) / 1e3);
          ready = remainingSec <= 0;
        } else if (asleepAt != null) {
          const elapsedSec = (now - asleepAt) / 1e3;
          remainingSec = Math.max(0, cycleSec - elapsedSec);
          ready = remainingSec <= 0;
        } else {
          ready = false;
          remainingSec = cycleSec;
        }
        if (realFeedBuffName === "Salt Lick" || realFeedBuffName === "Honey Treat") {
          const harvestsRemaining = typeof animal.feedBuff.harvestsRemaining === "number" ? animal.feedBuff.harvestsRemaining : getSpiceLickDurationHarvests();
          const buffRemainingSec = remainingSec != null ? Math.max(0, harvestsRemaining - 1) * cycleSec + remainingSec : null;
          if (!farmPanelAnimalBuffTrackingByType[type]) farmPanelAnimalBuffTrackingByType[type] = { saltLick: [], honeyTreat: [] };
          const bucket = realFeedBuffName === "Salt Lick" ? "saltLick" : "honeyTreat";
          farmPanelAnimalBuffTrackingByType[type][bucket].push({
            animalId: animalId,
            harvestsRemaining: harvestsRemaining,
            remainingSec: buffRemainingSec,
            feedQtySaved: realFeedBuffName === "Honey Treat" ? animalFeedQty / 3 : 0
          });
        }
        fig.products.forEach((pname, idx) => {
          rows.push({
            name: pname,
            qty: fig.yields[idx],
            ready: ready,
            remainingSec: remainingSec,
            sick: sick,
            animalId: animalId,
            feedBuffName: realFeedBuffName,
            
            
            feedCostFlowerShare: animalFeedCostFlower / fig.products.length,
            consumableCostFlowerShare: animalConsumableCostFlower / fig.products.length
          });
        });
        if (!farmPanelAnimalYieldGroupsByType[type]) farmPanelAnimalYieldGroupsByType[type] = [];
        const feedLabelUsed = FEED_LABELS[feedFig.feedKeyUsed] || feedFig.feedKeyUsed;
        const feedsToNext = computeAnimalFeedsToNextLevel(type, level, xp);
        const feedToNextLabel = FEED_LABELS[feedsToNext.feedKeyUsed] || feedsToNext.feedKeyUsed;
        const feedQtyToNext = freeFeed ? 0 : Math.max(0, feedsToNext.noOfFeeds * requiredQtyPerFeed * baseFeedMultTotal);
        farmPanelAnimalYieldGroupsByType[type].push({
          animalId: animalId,
          level: level,
          xp: typeof xp === "number" ? xp : 0,
          products: fig.products,
          yields: fig.yields,
          feedQty: animalFeedQty,
          feedName: feedLabelUsed,
          nextThreshold: feedsToNext.nextThreshold,
          nextLevelLabel: feedsToNext.nextLevelLabel,
          isMaxCycle: feedsToNext.isMaxCycle,
          feedsToNextCount: feedsToNext.noOfFeeds,
          feedQtyToNext: feedQtyToNext,
          feedToNextName: feedToNextLabel
        });
      });
    });
  }
  const agingShed = farmPanelField(g, "agingShed");
  const fermentationJobs = agingShed && agingShed.racks && Array.isArray(agingShed.racks.fermentation) ? agingShed.racks.fermentation : [];
  if (fermentationJobs.length && typeof computeBaitFigures === "function") {
    const toTs = v => typeof v === "number" ? v : typeof v === "string" && v.trim() && !isNaN(Number(v)) ? Number(v) : null;
    fermentationJobs.forEach(job => {
      if (!job || typeof job !== "object" || typeof job.recipe !== "string") return;
      const baitName = Object.keys(BAIT_RECIPE_NAME_MATCH).find(name => BAIT_RECIPE_NAME_MATCH[name].test(job.recipe));
      if (!baitName) return;
      const readyAt = toTs(job.readyAt);
      const startedAt = toTs(job.startedAt);
      let ready, remainingSec;
      if (readyAt != null) {
        remainingSec = Math.max(0, (readyAt - now) / 1e3);
        ready = remainingSec <= 0;
      } else if (startedAt != null) {
        ready = false;
        remainingSec = null;
      } else {
        ready = false;
        remainingSec = null;
      }
      const fig = computeBaitFigures(baitName);
      rows.push({
        name: baitName,
        qty: fig.expectedOutput,
        ready: ready,
        remainingSec: remainingSec
      });
    });
  }
  rows.sort((a, b) => (a.remainingSec ?? 0) - (b.remainingSec ?? 0));
  return rows;
}

function farmPanelBuildAnimalProductStats(rows) {
  const count = rows.length;
  const readyCount = rows.filter(r => r.ready === true).length;
  const sickCount = rows.filter(r => r.sick === true).length;
  const soonestSec = rows.reduce((min, r) => {
    if (r.remainingSec == null) return min;
    return min == null ? r.remainingSec : Math.min(min, r.remainingSec);
  }, null);
  const noEtaCount = rows.filter(r => r.ready === false && r.remainingSec == null).length;
  const totalYield = rows.reduce((sum, r) => sum + (typeof r.qty === "number" ? r.qty : 0), 0);
  const econ = farmPanelComputeEconomics(rows[0].name, count, totalYield);
  
  
  const hasRealFeedCost = rows.some(r => typeof r.feedCostFlowerShare === "number");
  const realFeedCostFlower = hasRealFeedCost ? rows.reduce((s, r) => s + (r.feedCostFlowerShare || 0) + (r.consumableCostFlowerShare || 0), 0) : econ.totalCost;
  const realCostPerUnit = totalYield > 0 ? realFeedCostFlower / totalYield : 0;
  const realProfit = econ.netRevenue - realFeedCostFlower;
  return {
    ...econ,
    totalCost: realFeedCostFlower,
    costPerUnit: realCostPerUnit,
    profit: realProfit,
    count: count,
    readyCount: readyCount,
    sickCount: sickCount,
    soonestSec: soonestSec,
    noEtaCount: noEtaCount,
    totalYield: totalYield
  };
}

function farmPanelComputeAnimalYieldGroups(type, meta) {
  const list = farmPanelAnimalYieldGroupsByType[type] || [];
  if (!list.length) return [];
  const byKey = new Map;
  list.forEach(a => {
    const key = String(a.level);
    if (!byKey.has(key)) {
      byKey.set(key, {
        level: a.level,
        xpMin: a.xp,
        xpMax: a.xp,
        count: 0,
        feedQty: 0,
        feedName: a.feedName,
        nextThreshold: a.nextThreshold,
        nextLevelLabel: a.nextLevelLabel,
        isMaxCycle: a.isMaxCycle,
        feedsToNextCount: 0,
        feedQtyToNext: 0,
        feedToNextName: a.feedToNextName,
        yields: (meta.products || []).map(() => 0)
      });
    }
    const g = byKey.get(key);
    g.count += 1;
    g.feedQty += a.feedQty || 0;
    g.feedQtyToNext += a.feedQtyToNext || 0;
    g.feedsToNextCount += a.feedsToNextCount || 0;
    if (a.xp < g.xpMin) g.xpMin = a.xp;
    if (a.xp > g.xpMax) g.xpMax = a.xp;
    a.products.forEach((pname, idx) => {
      const productIdx = meta.products.indexOf(pname);
      if (productIdx >= 0) g.yields[productIdx] += a.yields[idx] || 0;
    });
  });
  const groups = Array.from(byKey.values());
  groups.sort((a, b) => a.level - b.level);
  return groups;
}

function farmPanelFormatSpiceDuration(sec) {
  if (sec == null) return "—";
  sec = Math.max(0, Math.round(sec));
  const d = Math.floor(sec / 86400);
  sec -= d * 86400;
  const h = Math.floor(sec / 3600);
  sec -= h * 3600;
  const m = Math.floor(sec / 60);
  if (d > 0) return `${d}D ${h}hr`;
  if (h > 0) return `${h}hr ${m}m`;
  return `${m}m`;
}

function farmPanelRenderSpiceBuffCard(key, tracking, yieldData, meta) {
  const isSaltLick = key === "saltLick";
  const label = isSaltLick ? "Salt Lick" : "Honey Treat";
  const icon = getBoostIcon(label);
  const headsAffected = tracking.length;
  const knownDurations = tracking.map(t => t.remainingSec).filter(v => v != null);
  const durationLeftSec = knownDurations.length ? Math.min(...knownDurations) : null;
  const durationHarvests = getSpiceLickDurationHarvests();
  const perUseCost = getSpiceCostPerUseFlower(key);
  const totalCost = perUseCost * headsAffected;
  const costPerCycle = totalCost / durationHarvests;
  let yieldLineHtml = "";
  let valueFlower = 0;
  if (isSaltLick) {
    valueFlower = Object.entries(yieldData || {}).reduce((sum, [pname, amt]) => {
      const m = marketItems.find(x => (x.name || "").toLowerCase() === pname.toLowerCase());
      return sum + amt * (m ? m.flowerPrice || 0 : 0);
    }, 0);
    const chips = Object.entries(yieldData || {}).filter(([, amt]) => amt > 1e-9).map(([pname, amt]) => `<span class="spice-yield-chip">${getIcon(pname)}+${fmtAnimal(amt)}</span>`).join("");
    yieldLineHtml = `<div class="spice-buff-stat"><span class="label">Yield contributed (cycle)</span><span class="value">${chips || "—"}</span></div>`;
  } else {
    const feedsSaved = tracking.reduce((s, t) => s + (t.feedQtySaved || 0), 0);
    yieldLineHtml = `<div class="spice-buff-stat"><span class="label">Feeds saved</span><span class="value">${fmtAnimal(feedsSaved)}</span></div>`;
    valueFlower = typeof yieldData === "number" ? yieldData : 0;
  }
  const html = `
      <div class="spice-buff-card ${isSaltLick ? "is-salt-lick" : "is-honey-treat"}">
        <div class="spice-buff-head">${icon}<b>${label}</b> <span class="spice-buff-heads">${headsAffected} head${headsAffected === 1 ? "" : "s"}</span></div>
        <div class="spice-buff-stat"><span class="label">Duration left</span><span class="value">${farmPanelFormatSpiceDuration(durationLeftSec)}</span></div>
        ${yieldLineHtml}
        <div class="spice-buff-stat"><span class="label">Total ${label} cost</span><span class="value">${fmtAnimal(totalCost)} ${FLOWER_ICON}</span></div>
        <div class="spice-buff-stat"><span class="label">Cost per cycle</span><span class="value">${fmtAnimal(costPerCycle)} ${FLOWER_ICON}</span></div>
        <div class="spice-buff-stat"><span class="label">Value in ${FLOWER_ICON} ${isSaltLick ? "added yield" : "saved"}</span><span class="value">${fmtAnimal(valueFlower)} ${FLOWER_ICON}</span></div>
      </div>`;
  return {
    category: isSaltLick ? "yield" : "cost",
    html: html
  };
}

function farmPanelComputeAnimalCards(rawRows) {
  const byType = new Map;
  rawRows.forEach(r => {
    const info = ANIMAL_PRODUCT_LOOKUP[r.name];
    if (!info) return;
    if (!byType.has(info.type)) byType.set(info.type, []);
    byType.get(info.type).push(r);
  });
  const cards = [];
  byType.forEach((rows, type) => {
    const meta = ANIMAL_DATA[type];
    if (!meta) return;
    const byProduct = new Map;
    rows.forEach(r => {
      if (!byProduct.has(r.name)) byProduct.set(r.name, []);
      byProduct.get(r.name).push(r);
    });
    const products = meta.products.filter(p => byProduct.has(p)).map(p => farmPanelBuildAnimalProductStats(byProduct.get(p)));
    if (!products.length) return;
    const gross = products.reduce((s, p) => s + p.grossRevenue, 0);
    const sellFee = products.reduce((s, p) => s + p.feeAmount, 0);
    const cost = products.reduce((s, p) => s + p.totalCost, 0);
    const totalYieldAll = products.reduce((s, p) => s + p.totalYield, 0);
    const avgPricePerUnit = totalYieldAll > 0 ? gross / totalYieldAll : 0;
    const avgCostPerUnit = totalYieldAll > 0 ? cost / totalYieldAll : 0;
    const activeAnimalBoosts = getActiveAnimalBoosts(type);
    const yieldBoosts = activeAnimalBoosts.filter(b => b.yieldAdd || b.yieldMultAll || b.yieldAddAll);
    const timeBoosts = activeAnimalBoosts.filter(b => b.timeMult || b.timeMultAll);
    const costBoosts = activeAnimalBoosts.filter(b => (b.feedMult && b.feedMult < 1) || b.feedMultAll && b.feedMultAll < 1);
    const saltLickYieldByProduct = {};
    let honeyTreatSavingsFlower = 0;
    rows.forEach(r => {
      if (r.feedBuffName === "Salt Lick" && typeof r.qty === "number") {
        
        saltLickYieldByProduct[r.name] = (saltLickYieldByProduct[r.name] || 0) + r.qty * (1 - 1 / 1.05);
      }
      if (r.feedBuffName === "Honey Treat" && typeof r.feedCostFlowerShare === "number") {
        
        
        honeyTreatSavingsFlower += r.feedCostFlowerShare / 3;
      }
    });
    const buffTracking = farmPanelAnimalBuffTrackingByType[type] || { saltLick: [], honeyTreat: [] };
    const spiceBuffCards = [];
    if (buffTracking.saltLick.length) {
      spiceBuffCards.push(farmPanelRenderSpiceBuffCard("saltLick", buffTracking.saltLick, saltLickYieldByProduct, meta));
    }
    if (buffTracking.honeyTreat.length) {
      spiceBuffCards.push(farmPanelRenderSpiceBuffCard("honeyTreat", buffTracking.honeyTreat, honeyTreatSavingsFlower, meta));
    }
    let timeMultTotal = 1;
    activeAnimalBoosts.forEach(b => {
      if (b.timeMult) timeMultTotal *= b.timeMult;
      if (b.timeMultAll) timeMultTotal *= b.timeMultAll;
    });
    const cycleTimeSec = Math.max(1, ANIMAL_BASE_CYCLE_SEC * timeMultTotal);
    const cyclesPerDay = 86400 / cycleTimeSec;
    const shrineInfo = getActiveShrineDailyCostStable(activeAnimalBoosts);
    const shrineCost = shrineInfo.total > 0 ? shrineInfo.total / cyclesPerDay : 0;
    const net = gross - sellFee - cost - shrineCost;
    const first = products[0];
    const animalYieldGroups = farmPanelComputeAnimalYieldGroups(type, meta);
    cards.push({
      isAnimalMerged: true,
      typeKey: type,
      typeLabel: meta.label,
      searchKey: type.toLowerCase(),
      products: products,
      productNames: meta.products,
      count: first.count,
      readyCount: first.readyCount,
      sickCount: first.sickCount,
      soonestSec: first.soonestSec,
      noEtaCount: first.noEtaCount,
      gross: gross,
      sellFee: sellFee,
      cost: cost,
      shrineCost: shrineCost,
      shrineNames: shrineInfo.shrines.map(x => x.name),
      net: net,
      totalYieldAll: totalYieldAll,
      avgPricePerUnit: avgPricePerUnit,
      avgCostPerUnit: avgCostPerUnit,
      yieldBoosts: yieldBoosts,
      timeBoosts: timeBoosts,
      costBoosts: costBoosts,
      spiceBuffCards: spiceBuffCards,
      cycleTimeSec: cycleTimeSec,
      animalYieldGroups: animalYieldGroups,
      profit: net
    });
  });
  return cards;
}

export function farmPanelComputeInProgress(json) {
  const raw = farmPanelComputeInProgressRaw(json);
  const animalRows = raw.filter(row => ALL_ANIMAL_PRODUCTS.includes(row.name));
  const otherRows = raw.filter(row => !ALL_ANIMAL_PRODUCTS.includes(row.name));
  const animalCards = farmPanelComputeAnimalCards(animalRows);
  const groups = new Map;
  otherRows.forEach(row => {
    if (!groups.has(row.name)) groups.set(row.name, {
      name: row.name,
      nodes: []
    });
    groups.get(row.name).nodes.push(row);
  });
  const cards = Array.from(groups.values()).map(g => {
    const count = g.nodes.length;
    const readyCount = g.nodes.filter(n => n.ready === true).length;
    const sickCount = g.nodes.filter(n => n.sick === true).length;
    const weatherDestroyedCount = g.nodes.filter(n => n.weatherDestroyed === true).length;
    const weatherDestroyedEvent = g.nodes.find(n => n.weatherDestroyed === true && n.weatherDestroyedEvent)?.weatherDestroyedEvent || null;
    const soonestSec = g.nodes.reduce((min, n) => {
      if (n.remainingSec == null) return min;
      return min == null ? n.remainingSec : Math.min(min, n.remainingSec);
    }, null);
    const noEtaCount = g.nodes.filter(n => n.ready === false && n.remainingSec == null).length;
    const actualYieldCount = g.nodes.filter(n => n.isActualYield).length;
    const boostTrackedCount = g.nodes.filter(n => n.exactBoosts != null).length;
    const isDeterministicYield = g.nodes.some(n => n.isDeterministicYield);
    const turnaroundTypesPredicted = [ ...new Set(g.nodes.filter(n => n.turnaroundPredicted === true).map(n => n.treeType)) ];
    
    
    const turnaroundCountsByType = {};
    g.nodes.forEach(n => {
      if (n.turnaroundPredicted === true && n.treeType) {
        turnaroundCountsByType[n.treeType] = (turnaroundCountsByType[n.treeType] || 0) + 1;
      }
    });
    
    
    
    
    
    const turnaroundBonusYieldEstimate = g.nodes.reduce((sum, n) => sum + (typeof n.turnaroundBonusEstimate === "number" ? n.turnaroundBonusEstimate : 0), 0);
    const goldInstantMineTypesPredicted = [ ...new Set(g.nodes.filter(n => n.goldInstantMinePredicted === true).map(n => n.goldRockName)) ];
    
    
    
    const goldInstantMineBonusYieldEstimate = g.nodes.reduce((sum, n) => sum + (typeof n.goldInstantMineBonusEstimate === "number" ? n.goldInstantMineBonusEstimate : 0), 0);
    const crimstoneInstantMinePredicted = g.nodes.some(n => n.crimstoneInstantMinePredicted === true);
    const crimstoneInstantMineBonusYieldEstimate = g.nodes.reduce((sum, n) => sum + (typeof n.crimstoneInstantMineBonusEstimate === "number" ? n.crimstoneInstantMineBonusEstimate : 0), 0);
    const tierCounts = {};
    g.nodes.forEach(n => {
      if (n.tierLabel) tierCounts[n.tierLabel] = (tierCounts[n.tierLabel] || 0) + 1;
    });
    let oilNodeGroups = null;
    if (g.name === "Oil") {
      const oilNodesList = g.nodes.filter(n => typeof n.oilMinesUntilBonus === "number").map((n, idx) => ({
        index: idx + 1,
        minesUntilBonus: n.oilMinesUntilBonus,
        qty: typeof n.qty === "number" ? n.qty : 0
      }));
      if (oilNodesList.length) oilNodeGroups = oilNodesList;
    }
    let saltNodeGroups = null;
    if (g.name === "Salt") {
      const seen = new Map;
      g.nodes.forEach(n => {
        if (typeof n.saltNodeIndex !== "number") return;
        if (seen.has(n.saltNodeIndex)) return;
        seen.set(n.saltNodeIndex, {
          index: n.saltNodeIndex,
          storedCharges: n.saltNodeStoredCharges || 0,
          maxCharges: n.saltNodeMaxCharges || 0,
          qty: (n.saltNodeStoredCharges || 0) * (n.saltYieldPerCharge || 0),
          yieldPerCharge: n.saltYieldPerCharge || 0
        });
      });
      if (seen.size) saltNodeGroups = Array.from(seen.values()).sort((a, b) => a.index - b.index);
    }
    let crimstoneNodeGroups = null;
    if (g.name === "Crimstone") {
      const seen = new Map;
      g.nodes.forEach(n => {
        if (typeof n.crimstoneNodeIndex !== "number") return;
        if (seen.has(n.crimstoneNodeIndex)) return;
        const minesLeft = typeof n.crimstoneMinesLeft === "number" ? n.crimstoneMinesLeft : 5;
        seen.set(n.crimstoneNodeIndex, {
          index: n.crimstoneNodeIndex,
          streakPosition: Math.min(5, Math.max(1, 6 - minesLeft)),
          qty: typeof n.qty === "number" ? n.qty : 0
        });
      });
      if (seen.size) crimstoneNodeGroups = Array.from(seen.values()).sort((a, b) => a.index - b.index);
    }
    let plantYieldLabel = null;
    let plantYieldGroups = null;
    if (BASE_CROPS[g.name] || BASE_GREENHOUSE[g.name] || FLOWER_VARIETIES[g.name]) {
      plantYieldLabel = BASE_CROPS[g.name] ? "Crops Yield" : BASE_GREENHOUSE[g.name] ? "Greenhouse Yield" : "Flower Bed Yield";
      plantYieldGroups = g.nodes.map((n, idx) => ({
        index: typeof n.plotIndex === "number" ? n.plotIndex : idx + 1,
        qty: typeof n.qty === "number" ? n.qty : null,
        seedReward: n.seedReward || null
      }));
    }
    const boostedStats = farmPanelGetBoostedYieldStats(g.name);
    if (g.name === "Salt") boostedStats.activeBoosts = farmPanelGetSaltActiveBoosts();
    if (g.name === "Honey") boostedStats.activeBoosts = farmPanelGetHoneyActiveBoosts();
    const boostedPerUnit = boostedStats.yieldVal;
    const basePerUnit = farmPanelGetBaseYield(g.name);
    const usedBoostFallback = g.nodes.some(n => typeof n.qty !== "number");
    const tierYields = {};
    g.nodes.forEach(n => {
      if (!n.tierGroupLabel) return;
      const y = typeof n.qty === "number" ? n.qty : boostedPerUnit;
      tierYields[n.tierGroupLabel] = (tierYields[n.tierGroupLabel] || 0) + y;
    });
    const rawTotalYield = g.nodes.reduce((sum, n) => sum + (typeof n.qty === "number" ? n.qty : boostedPerUnit), 0);
    
    
    
    
    const totalYield = rawTotalYield;
    const baseTotalYield = basePerUnit * count;
    const isBoosted = usedBoostFallback && boostedStats.activeBoosts && boostedStats.activeBoosts.length > 0 && totalYield !== baseTotalYield;
    const exactBoostsSeen = new Map;
    g.nodes.forEach(n => {
      (n.exactBoosts || []).forEach(b => {
        const key = b.name + "|" + b.valueText;
        if (!exactBoostsSeen.has(key)) exactBoostsSeen.set(key, b);
      });
    });
    const exactBoosts = Array.from(exactBoostsSeen.values());
    const exactBoostTotalsSeen = new Map;
    g.nodes.forEach(n => {
      (n.exactBoosts || []).forEach(b => {
        const amt = parseYieldBoostAmount(b.valueText);
        if (!amt) return;
        if (!exactBoostTotalsSeen.has(b.name)) exactBoostTotalsSeen.set(b.name, 0);
        exactBoostTotalsSeen.set(b.name, exactBoostTotalsSeen.get(b.name) + amt);
      });
    });
    const exactBoostTotals = Array.from(exactBoostTotalsSeen.entries()).map(([name, total]) => ({
      name: name,
      total: total
    }));
    const econ = farmPanelComputeEconomics(g.name, count, totalYield);
    const displayNodeCount = typeof g.nodes[0]?.physicalNodes === "number" ? g.nodes[0].physicalNodes : count;
    const cycleTimeSec = boostedStats.timeVal || farmPanelGrowTimeSec(g.name);
    const cyclesPerDay = cycleTimeSec ? 86400 / cycleTimeSec : null;
    const shrineInfo = getActiveShrineDailyCostStable(boostedStats.activeBoosts);
    const shrineCostPerCycle = shrineInfo.total > 0 ? cyclesPerDay ? shrineInfo.total / cyclesPerDay : shrineInfo.total : 0;
    
    
    
    
    
    let fruitWood = null;
    let harvestsLeftCounts = null;
    
    
    
    
    let fruitWoodPerTree = null;
    const fruitDef = BASE_FRUITS[g.name];
    if (fruitDef && g.nodes.some(n => typeof n.harvestsLeft === "number")) {
      harvestsLeftCounts = {};
      g.nodes.forEach(n => {
        if (typeof n.harvestsLeft !== "number") return;
        harvestsLeftCounts[n.harvestsLeft] = (harvestsLeftCounts[n.harvestsLeft] || 0) + 1;
      });
      const treesAtFinalHarvest = harvestsLeftCounts[1] || 0;
      const boostedFruit = computeBoostedFruitStats(g.name, fruitDef.yieldPerHarvest, fruitDef.timeSec, fruitDef.minHarvest);
      fruitWoodPerTree = Math.max(0, (fruitDef.woodReturnQty || 0) - (boostedFruit.woodReturnPenalty || 0) + (boostedFruit.woodReturnAdd || 0));
      if (treesAtFinalHarvest > 0) {
        const woodTotalYield = fruitWoodPerTree * treesAtFinalHarvest;
        if (woodTotalYield > 0) {
          const woodEcon = farmPanelComputeEconomics("Wood", treesAtFinalHarvest, woodTotalYield);
          fruitWood = {
            treesAtFinalHarvest: treesAtFinalHarvest,
            perTreeQty: fruitWoodPerTree,
            noWoodCost: boostedFruit.noWoodCost,
            econ: woodEcon
          };
        }
      }
    }
    const profitWithShrine = econ.profit - shrineCostPerCycle + (fruitWood ? fruitWood.econ.profit : 0);
    
    
    let moneyTreeBonus = null;
    if (g.name === "Wood") {
      const mtData = farmPanelDetectMoneyTreeBonus(json);
      const mtCoins = (mtData.totalCoins || 0) + (mtData.predictedCoins || 0);
      if (mtCoins > 0) {
        moneyTreeBonus = {
          coins: mtCoins
        };
      }
    }
    
    let isHoneyCard = false;
    let honeyHiveDetails = null;
    let honeySwarmCount = 0;
    let honeyMaxPerFill = null;
    if (g.name === "Honey") {
      isHoneyCard = true;
      const sortedHives = g.nodes.slice().sort((a, b) => (a.hiveIndex ?? 0) - (b.hiveIndex ?? 0));
      honeyMaxPerFill = sortedHives.length && typeof sortedHives[0].maxHoneyPerFill === "number" ? sortedHives[0].maxHoneyPerFill : null;
      honeySwarmCount = sortedHives.filter(n => n.willSwarm === true).length;
      honeyHiveDetails = sortedHives.map((n, i) => ({
        label: `Beehive ${i + 1}`,
        currentQty: typeof n.qty === "number" ? n.qty : 0,
        maxQty: typeof n.maxHoneyPerFill === "number" ? n.maxHoneyPerFill : honeyMaxPerFill,
        fillPct: n.maxHoneyPerFill > 0 ? Math.max(0, Math.min(100, (n.qty / n.maxHoneyPerFill) * 100)) : 0,
        willSwarm: n.willSwarm === true,
        ready: n.ready === true
      }));
    }
    return {
      ...econ,
      profit: profitWithShrine,
      fruitWood: fruitWood,
      harvestsLeftCounts: harvestsLeftCounts,
      fruitWoodPerTree: fruitWoodPerTree,
      readyCount: readyCount,
      sickCount: sickCount,
      weatherDestroyedCount: weatherDestroyedCount,
      weatherDestroyedEvent: weatherDestroyedEvent,
      soonestSec: soonestSec,
      noEtaCount: noEtaCount,
      actualYieldCount: actualYieldCount,
      boostTrackedCount: boostTrackedCount,
      isDeterministicYield: isDeterministicYield,
      turnaroundTypesPredicted: turnaroundTypesPredicted,
      turnaroundCountsByType: turnaroundCountsByType,
      turnaroundBonusYieldEstimate: turnaroundBonusYieldEstimate,
      moneyTreeBonus: moneyTreeBonus,
      isHoneyCard: isHoneyCard,
      honeyHiveDetails: honeyHiveDetails,
      honeySwarmCount: honeySwarmCount,
      honeyMaxPerFill: honeyMaxPerFill,
      goldInstantMineTypesPredicted: goldInstantMineTypesPredicted,
      goldInstantMineBonusYieldEstimate: goldInstantMineBonusYieldEstimate,
      crimstoneInstantMinePredicted: crimstoneInstantMinePredicted,
      crimstoneInstantMineBonusYieldEstimate: crimstoneInstantMineBonusYieldEstimate,
      baseTotalYield: baseTotalYield,
      isBoosted: isBoosted,
      cycleTimeSec: cycleTimeSec,
      activeBoosts: boostedStats.activeBoosts,
      exactBoosts: exactBoosts,
      exactBoostTotals: exactBoostTotals,
      tierCounts: tierCounts,
      tierYields: tierYields,
      oilNodeGroups: oilNodeGroups,
      saltNodeGroups: saltNodeGroups,
      crimstoneNodeGroups: crimstoneNodeGroups,
      plantYieldLabel: plantYieldLabel,
      plantYieldGroups: plantYieldGroups,
      displayNodeCount: displayNodeCount,
      cyclesPerDay: cyclesPerDay,
      shrineCostPerCycle: shrineCostPerCycle,
      shrineNames: shrineInfo.shrines.map(x => x.name)
    };
  });
  const allCards = cards.concat(animalCards);
  allCards.sort((a, b) => b.profit - a.profit);
  return allCards;
}

function farmPanelStockCategoryNames() {
  return new Set([ ...Object.keys(BASE_CROPS), ...Object.keys(BASE_FRUITS), ...Object.keys(BASE_GREENHOUSE), ...Object.keys(RESOURCE_DATA), ...Object.keys(BAIT_RECIPES), "Obsidian", "Sunstone", "Salt", "Honey" ]);
}

export function farmPanelComputeStocks(json) {
  const g = farmSyncExtractGameState(json);
  const inv = farmPanelField(g, "inventory");
  if (!inv || typeof inv !== "object") return [];
  const stockNames = farmPanelStockCategoryNames();
  const rows = [];
  Object.entries(inv).forEach(([name, amount]) => {
    if (!stockNames.has(name)) return;
    const qty = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (!qty || qty <= 0) return;
    rows.push(farmPanelComputeEconomics(name, 1, qty));
  });
  rows.sort((a, b) => b.profit - a.profit);
  return rows;
}

function farmPanelRenderAnimalYieldBoostList(boosts, productNames, products, fallbackCount, spiceBuffCards, timeBoosts, costBoosts, cycleTimeSec) {
  const countForProduct = pname => {
    const match = products && products.find(p => p.name === pname);
    return match && typeof match.count === "number" ? match.count : fallbackCount || 0;
  };
  const yieldEntries = [];
  (boosts || []).forEach(b => {
    const boostIcon = getBoostIcon(b.name);
    if (b.yieldMultAll) {
      const mult = b.yieldMultAll;
      (products || []).forEach((p, idx) => {
        const extra = p.totalYield * (mult - 1) / mult;
        const picon = getIcon(p.name);
        yieldEntries.push({
          productIndex: idx,
          html: `<div class="boost-applied-row is-yield">${boostIcon}<b>${escapeHtml(b.name)}</b> <span class="boost-mult-note">(×${mult})</span> <span class="boost-total-value">+${fmtAnimal(extra)}</span>${picon}</div>`
        });
      });
      return;
    }
    if (b.yieldAddAll) {
      (products || []).forEach((p, idx) => {
        const pname = productNames && productNames[idx] ? productNames[idx] : p.name;
        const picon = getIcon(pname);
        const totalAdd = b.yieldAddAll * countForProduct(pname);
        yieldEntries.push({
          productIndex: idx,
          html: `<div class="boost-applied-row is-yield">${boostIcon}<b>${escapeHtml(b.name)}</b> <span class="boost-total-value">+${fmtAnimal(totalAdd)}</span>${picon}</div>`
        });
      });
      return;
    }
    if (b.yieldAdd) {
      const pIndex = b.productIndex != null ? b.productIndex : 999;
      const pname = productNames && productNames[pIndex] ? productNames[pIndex] : "";
      const picon = pname ? getIcon(pname) : "";
      const totalAdd = b.yieldAdd * countForProduct(pname);
      yieldEntries.push({
        productIndex: pIndex,
        html: `<div class="boost-applied-row is-yield">${boostIcon}<b>${escapeHtml(b.name)}</b> <span class="boost-total-value">+${fmtAnimal(totalAdd)}</span>${picon}</div>`
      });
    }
  });
  yieldEntries.sort((a, b) => a.productIndex - b.productIndex);
  const yieldHtmlParts = yieldEntries.map(e => e.html);
  const timeHtmlParts = (timeBoosts || []).map(b => {
    const boostIcon = getBoostIcon(b.name);
    const mult = (b.timeMult || 1) * (b.timeMultAll || 1);
    const pct = (1 - mult) * 100;
    const secondsSaved = cycleTimeSec != null ? cycleTimeSec * (1 / mult - 1) : null;
    const savedNote = secondsSaved != null ? ` <span class="boost-total-value">-${farmPanelFormatSpiceDuration(secondsSaved)}</span>` : "";
    return `<div class="boost-applied-row is-time">${boostIcon}<b>${escapeHtml(b.name)}</b> <span class="boost-mult-note">(-${fmtAnimal(pct)}% cycle time)</span>${savedNote}</div>`;
  });
  const costHtmlParts = (costBoosts || []).map(b => {
    const boostIcon = getBoostIcon(b.name);
    const mult = (b.feedMult && b.feedMult < 1 ? b.feedMult : 1) * (b.feedMultAll && b.feedMultAll < 1 ? b.feedMultAll : 1);
    const pct = (1 - mult) * 100;
    return `<div class="boost-applied-row is-cost">${boostIcon}<b>${escapeHtml(b.name)}</b> <span class="boost-mult-note">(-${fmtAnimal(pct)}% feed)</span></div>`;
  });
  (spiceBuffCards || []).forEach(card => {
    if (card.category === "cost") costHtmlParts.push(card.html); else yieldHtmlParts.push(card.html);
  });
  const sections = [ [ "YIELD", yieldHtmlParts ], [ "TIME REDUCTION", timeHtmlParts ], [ "COST REDUCTION", costHtmlParts ] ].filter(([, parts]) => parts.length);
  if (!sections.length) return "";
  const sectionsHtml = sections.map(([label, parts]) => `<div class="lib-section-title" style="margin-top:10px;">${label}</div>${parts.join("")}`).join("");
  return `<div class="section-badge is-boost-label">⚡ Applied Boost</div>${sectionsHtml}`;
}

function farmPanelComputeNodeYieldBoostSummary(row) {
  
  
  
  
  
  
  
  
  
  
  
  const rawCount = row.count || 0;
  const exactCount = row.boostTrackedCount || 0;
  const fallbackCount = Math.max(0, rawCount - exactCount);
  
  
  const estimateCount = exactCount > 0 ? fallbackCount : row.displayNodeCount || rawCount;
  const itemTier = (BASE_CROPS[row.name] || {}).tier;
  const totals = new Map;
  const add = (name, amount) => {
    if (!amount) return;
    totals.set(name, (totals.get(name) || 0) + amount);
  };
  if (estimateCount > 0) {
    const fallbackFraction = rawCount > 0 ? estimateCount / rawCount : 1;
    (row.activeBoosts || []).forEach(b => {
      const yieldAdd = getEffectiveYieldAdd(b, itemTier, row.name);
      if (yieldAdd) add(b.name, yieldAdd * estimateCount);
      if (b.yieldMult) add(b.name, (row.totalYield || 0) * fallbackFraction * (b.yieldMult - 1) / b.yieldMult);
      if (b.yieldMultAll) add(b.name, (row.totalYield || 0) * fallbackFraction * (b.yieldMultAll - 1) / b.yieldMultAll);
      if (b.harvestAdd) add(b.name, b.harvestAdd * estimateCount);
      if (b.flowerExtraFlat) add(b.name, b.flowerExtraFlat * estimateCount);
    });
  }
  (row.exactBoostTotals || []).forEach(eb => add(eb.name, eb.total));
  if (row.name === "Gold" && row.goldInstantMineBonusYieldEstimate > 0) add("Pickaxe Shark", row.goldInstantMineBonusYieldEstimate);
  return Array.from(totals.entries()).filter(([, total]) => total > 1e-9).map(([name, total]) => ({
    name: name,
    total: total
  }));
}

function farmPanelRenderNodeYieldBoostList(row, summary, produceIcon) {
  const yieldHtmlParts = (summary || []).map(b => `<div class="boost-applied-row is-yield">${getBoostIcon(b.name)}<b>${escapeHtml(b.name)}</b> <span class="boost-total-value">+${fmt(b.total)}</span>${produceIcon}</div>`);
  const seenTime = new Set;
  const timeHtmlParts = (row.activeBoosts || []).filter(b => b.timeMult && b.timeMult !== 1 && !seenTime.has(b.name) && seenTime.add(b.name)).map(b => {
    const boostIcon = getBoostIcon(b.name);
    const pct = (1 - b.timeMult) * 100;
    const secondsSaved = row.cycleTimeSec != null ? row.cycleTimeSec * (1 / b.timeMult - 1) : null;
    const savedNote = secondsSaved != null ? ` <span class="boost-total-value">-${farmPanelFormatSpiceDuration(secondsSaved)}</span>` : "";
    return `<div class="boost-applied-row is-time">${boostIcon}<b>${escapeHtml(b.name)}</b> <span class="boost-mult-note">(-${fmt(pct)}% cycle time)</span>${savedNote}</div>`;
  });
  const seenCost = new Set;
  const costHtmlParts = (row.activeBoosts || []).filter(b => (b.freeCost || b.toolCostMult && b.toolCostMult < 1) && !seenCost.has(b.name) && seenCost.add(b.name)).map(b => {
    const boostIcon = getBoostIcon(b.name);
    if (b.freeCost) return `<div class="boost-applied-row is-cost">${boostIcon}<b>${escapeHtml(b.name)}</b> <span class="boost-mult-note">(free cost)</span></div>`;
    const pct = (1 - b.toolCostMult) * 100;
    return `<div class="boost-applied-row is-cost">${boostIcon}<b>${escapeHtml(b.name)}</b> <span class="boost-mult-note">(-${fmt(pct)}% tool cost)</span></div>`;
  });
  const sections = [ [ "YIELD", yieldHtmlParts ], [ "TIME REDUCTION", timeHtmlParts ], [ "COST REDUCTION", costHtmlParts ] ].filter(([, parts]) => parts.length);
  if (!sections.length) return "";
  const sectionsHtml = sections.map(([label, parts]) => `<div class="lib-section-title" style="margin-top:10px;">${label}</div>${parts.join("")}`).join("");
  return `<div class="section-badge is-boost-label">⚡ Applied Boost</div>${sectionsHtml}`;
}

function farmPanelCardCategory(row) {
  if (row.isAnimalMerged) return "animals";
  if (row.isHoneyCard) return "beehive";
  const name = row.name;
  if (BASE_GREENHOUSE[name]) return "greenhouse";
  if (FLOWER_VARIETIES[name]) return "beehive";
  if (BASE_CROPS[name]) return "crops";
  if (BASE_FRUITS[name]) return "fruits";
  return "resources";
}

export function farmPanelRenderCategoryFilterBar() {
  const cats = [ {
    id: "all",
    label: "All",
    icon: ""
  }, {
    id: "crops",
    label: "Crops",
    icon: getIcon("Sunflower")
  }, {
    id: "resources",
    label: "Resources",
    icon: getIcon("Axe")
  }, {
    id: "greenhouse",
    label: "Greenhouse",
    icon: RCM_GREENHOUSE_ICON_HTML
  }, {
    id: "beehive",
    label: "Beehive",
    icon: getIcon("Beehive")
  }, {
    id: "fruits",
    label: "Fruits",
    icon: getIcon("Orange")
  }, {
    id: "animals",
    label: "Animals",
    icon: getIcon("Chicken")
  } ];
  const btns = cats.map(c => `<button type="button" class="fp-filter-btn${farmPanelInProgressCategoryFilter === c.id ? " active" : ""}${c.id === "all" ? " has-label" : ""}" data-fp-filter-btn="${c.id}" title="${c.label}">${c.icon}${c.id === "all" ? `<span>${c.label}</span>` : ""}</button>`).join("");
  return `<div class="fp-filter-bar">${btns}</div>`;
}

function farmPanelRenderAnimalMergedCard(card) {
  const baseStatus = card.readyCount > 0 ? card.readyCount === card.count ? "✅ All ready" : `✅ ${card.readyCount} ready · ⏳ ${card.count - card.readyCount} growing` : "⏳ Growing";
  const showCountdown = card.soonestSec != null && card.readyCount < card.count;
  const noEtaGrowing = !showCountdown && card.readyCount < card.count && card.noEtaCount > 0;
  const statusLine = showCountdown ? `${baseStatus} <span class="farm-countdown" data-base="${card.soonestSec}">(next in ${farmPanelFormatCountdown(card.soonestSec)})</span>` : noEtaGrowing ? `${baseStatus} <span style="color:var(--ink-soft);">(🤒 ${card.noEtaCount} sick — can't estimate)</span>` : baseStatus;
  const isProfit = card.net >= 0;
  const expandedCls = farmPanelExpandedNames.has(card.searchKey) ? " expanded" : "";
  const growingCount = card.count - card.readyCount;
  let badgeHtml = "";
  if (card.readyCount > 0 && growingCount > 0) {
    badgeHtml = `<span class="harvest-badge-group">\n      <span class="harvest-badge is-ready">✅ Ready ${card.readyCount}</span>\n      <span class="harvest-badge is-growing">⏳ Growing ${growingCount}</span>\n    </span>`;
  } else if (card.readyCount > 0) {
    badgeHtml = `<span class="harvest-badge is-ready">✅ Ready to Harvest</span>`;
  } else {
    badgeHtml = `<span class="harvest-badge is-growing">⏳ In Progress</span>`;
  }
  if (card.sickCount > 0) {
    badgeHtml += `<span class="harvest-badge" style="background:rgba(214,80,80,0.15);color:#c33;">🤒 ${card.sickCount} sick</span>`;
  }
  const animalIcon = getIcon(card.typeLabel);
  const productChipsHtml = card.products.map(p => `\n      <span class="animal-produce-chip">\n        <span class="produce-icon">${getIcon(p.name)}</span>\n        <span class="produce-name">${escapeHtml(p.name)}</span>\n        <span class="produce-yield">${fmtAnimal(p.totalYield)}</span>\n        <span class="produce-value">(${fmtAnimal(p.grossRevenue)} ${FLOWER_ICON})</span>\n      </span>`).join("");
  const netChipHtml = `\n      <span class="animal-net-chip">\n        <span class="label">Net</span>\n        <span class="value ${isProfit ? "is-profit" : "is-loss"}">${isProfit ? "+" : ""}${fmtAnimal(card.net)} ${FLOWER_ICON}</span>\n      </span>`;
  const productDetailRows = card.products.map(p => renderAnimalCardProductDetailRow(getIcon(p.name), p.name, p.totalYield, p.grossRevenue, p.feeAmount)).join("");
  const yieldBoostListHtml = farmPanelRenderAnimalYieldBoostList(card.yieldBoosts, card.productNames, card.products, card.count, card.spiceBuffCards, card.timeBoosts, card.costBoosts, card.cycleTimeSec);
  const animalYieldGroupsHtml = renderAnimalYieldGroupsList(card);
  return `\n  <div class="card animal-merged-card${isProfit ? " is-profit" : " is-loss"}${expandedCls}" data-search="${card.searchKey}" data-fp-category="animals">\n    <div class="card-toggle">\n      <div class="card-name-row">\n        <span class="card-icon">${animalIcon}</span>\n        <div>\n          <div class="card-name">${escapeHtml(card.typeLabel)}</div>\n          <div class="card-type-row">\n            <span class="card-type">${card.count} animal${card.count === 1 ? "" : "s"}</span>\n            ${badgeHtml}\n          </div>\n          <div class="animal-fold-row">${productChipsHtml}${netChipHtml}</div>\n        </div>\n      </div>\n      <div class="card-collapsed-profit">\n        <span class="chev">▾</span>\n      </div>\n    </div>\n    <div class="card-details">\n      <div class="stat"><span class="label">Status</span><span class="value">${statusLine}</span></div>\n      <div class="animal-detail-grid">\n        ${productDetailRows}\n        <div class="animal-detail-stat"><span class="label">Market Price/Unit</span><span class="value">${fmtAnimal(card.avgPricePerUnit)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Gross</span><span class="value">${fmtAnimal(card.gross)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Cost/Unit</span><span class="value">${fmtAnimal(card.avgCostPerUnit)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Sell Fee</span><span class="value">${card.sellFee > 0 ? `-${fmtAnimal(card.sellFee)}` : "0"} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Shrine Cost${card.shrineNames && card.shrineNames.length ? ` (${card.shrineNames.map(escapeHtml).join(", ")})` : ""}</span><span class="value" style="${card.shrineCost > 0 ? "color:#b45309;" : ""}">${card.shrineCost > 0 ? `-${fmtAnimal(card.shrineCost)}` : "0"} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Cost (Feeds &amp; Consumables)</span><span class="value">${card.cost > 0 ? `-${fmtAnimal(card.cost)}` : "0"} ${FLOWER_ICON}</span></div>\n      </div>\n      <div class="animal-net-row2">\n        <span class="label">Net</span>\n        <span class="value ${isProfit ? "is-profit" : "is-loss"}">${isProfit ? "+" : ""}${fmtAnimal(card.net)} ${FLOWER_ICON}</span>\n      </div>\n      ${animalYieldGroupsHtml}\n      ${yieldBoostListHtml}\n    </div>\n  </div>`;
}

function farmPanelRenderHoneyCard(row) {
  const baseStatus = row.readyCount > 0 ? row.readyCount === row.count ? "✅ All ready" : `✅ ${row.readyCount} ready · ⏳ ${row.count - row.readyCount} growing` : "⏳ Growing";
  const showCountdown = row.soonestSec != null && row.readyCount < row.count;
  const noEtaGrowing = !showCountdown && row.readyCount < row.count && row.noEtaCount > 0;
  const statusLine = showCountdown ? `${baseStatus} <span class="farm-countdown" data-base="${row.soonestSec}">(next in ${farmPanelFormatCountdown(row.soonestSec)})</span>` : noEtaGrowing ? `${baseStatus} <span style="color:var(--ink-soft);">(no active flower/growth right now — can't estimate)</span>` : baseStatus;
  const isProfit = row.profit >= 0;
  const expandedCls = farmPanelExpandedNames.has(row.name.toLowerCase()) ? " expanded" : "";
  const growingCount = row.count - row.readyCount;
  let badgeHtml = "";
  if (row.readyCount > 0 && growingCount > 0) {
    badgeHtml = `<span class="harvest-badge-group">\n      <span class="harvest-badge is-ready">✅ Ready ${row.readyCount}</span>\n      <span class="harvest-badge is-growing">⏳ Growing ${growingCount}</span>\n    </span>`;
  } else if (row.readyCount > 0) {
    badgeHtml = `<span class="harvest-badge is-ready">✅ Ready to Harvest</span>`;
  } else {
    badgeHtml = `<span class="harvest-badge is-growing">⏳ In Progress</span>`;
  }
  const tierEntries = row.tierCounts ? Object.entries(row.tierCounts) : [];
  const tierNote = tierEntries.length ? ` <span class="card-tier-note">(${tierEntries.map(([label, c]) => `${c} ${escapeHtml(label)}`).join(", ")})</span>` : "";
  const beehiveIcon = getIcon("Beehive");
  const produceIcon = getIcon("Honey");
  const baseCost = row.totalCost - (row.restockCost || 0);
  const shrineCost = row.shrineCostPerCycle || 0;
  const shrineNames = row.shrineNames || [];
  const restockCost = row.restockCost || 0;
  const boostSummary = farmPanelComputeNodeYieldBoostSummary(row);
  const productChipHtml = `\n      <span class="animal-produce-chip">\n        <span class="produce-icon">${produceIcon}</span>\n        <span class="produce-name">${escapeHtml(row.name)}</span>\n        <span class="produce-yield">${fmt(row.totalYield)}</span>\n        <span class="produce-value">(${fmt(row.grossRevenue)} ${FLOWER_ICON})</span>\n      </span>`;
  const netChipHtml = `\n      <span class="animal-net-chip">\n        <span class="label">Net</span>\n        <span class="value ${isProfit ? "is-profit" : "is-loss"}">${isProfit ? "+" : ""}${fmt(row.profit)} ${FLOWER_ICON}</span>\n      </span>`;
  
  
  const swarmChipHtml = row.honeySwarmCount > 0 ? `\n      <span class="animal-produce-chip">\n        <span class="produce-icon"><img src="${BEE_SWARM_ICON}" style="width:16px;height:16px;vertical-align:middle;image-rendering:pixelated;"></span>\n        <span class="produce-name">Bee Swarm</span>\n        <span class="produce-yield">+${row.honeySwarmCount}</span>\n      </span>` : "";
  const productDetailRow = renderCardProductDetailRow(produceIcon, row.name, row.totalYield, row.grossRevenue, row.feeAmount, row.isBoosted ? row.baseTotalYield : null);
  const restockRowHtml = `\n        <div class="animal-detail-stat"><span class="label">${GEM_ICON} Gem Restock Cost</span><span class="value" style="${restockCost > 0 ? "color:#c9821a;" : ""}">${restockCost > 0 ? `-${fmt(restockCost)}` : "0"} ${FLOWER_ICON}</span></div>`;
  const boostListHtml = farmPanelRenderNodeYieldBoostList(row, boostSummary, produceIcon);
  const beehiveListHtml = renderBeehiveListHtml(row.honeyHiveDetails);
  return `\n  <div class="card animal-merged-card${isProfit ? " is-profit" : " is-loss"}${expandedCls}" data-search="honey" data-fp-category="beehive">\n    <div class="card-toggle">\n      <div class="card-name-row">\n        <span class="card-icon">${beehiveIcon}</span>\n        <div>\n          <div class="card-name">Beehive</div>\n          <div class="card-type-row">\n            <span class="card-type">${row.displayNodeCount} node${row.displayNodeCount === 1 ? "" : "s"}${tierNote}</span>\n            ${badgeHtml}\n          </div>\n          <div class="animal-fold-row">${productChipHtml}${swarmChipHtml}${netChipHtml}</div>\n        </div>\n      </div>\n      <div class="card-collapsed-profit">\n        <span class="chev">▾</span>\n      </div>\n    </div>\n    <div class="card-details">\n      <div class="stat"><span class="label">Status</span><span class="value">${statusLine}</span></div>\n      <div class="animal-detail-grid">\n        ${productDetailRow}\n        <div class="animal-detail-stat"><span class="label">Market Price/Unit</span><span class="value">${fmt(row.price)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Gross</span><span class="value">${fmt(row.grossRevenue)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Cost/Unit</span><span class="value">${fmt(row.costPerUnit)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Sell Fee</span><span class="value">${row.feeAmount > 0 ? `-${fmt(row.feeAmount)}` : "0"} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Shrine Cost${shrineNames.length ? ` (${shrineNames.map(escapeHtml).join(", ")})` : ""}</span><span class="value" style="${shrineCost > 0 ? "color:#b45309;" : ""}">${shrineCost > 0 ? `-${fmt(shrineCost)}` : "0"} ${FLOWER_ICON}</span></div>${restockRowHtml}\n        <div class="animal-detail-stat"><span class="label">Cost</span><span class="value">${baseCost > 0 ? `-${fmt(baseCost)}` : "0"} ${FLOWER_ICON}</span></div>\n      </div>\n      <div class="animal-net-row2">\n        <span class="label">Net</span>\n        <span class="value ${isProfit ? "is-profit" : "is-loss"}">${isProfit ? "+" : ""}${fmt(row.profit)} ${FLOWER_ICON}</span>\n      </div>\n      ${beehiveListHtml}\n      ${boostListHtml}\n      ${farmPanelRestockNoteHtml(row.restockInfo)}\n    </div>\n  </div>`;
}

export function farmPanelRenderInProgressRow(row) {
  if (row.isAnimalMerged) return farmPanelRenderAnimalMergedCard(row);
  if (row.isHoneyCard) return farmPanelRenderHoneyCard(row);
  const baseStatus = row.readyCount > 0 ? row.readyCount === row.count ? "✅ All ready" : `✅ ${row.readyCount} ready · ⏳ ${row.count - row.readyCount} growing` : "⏳ Growing";
  const showCountdown = row.soonestSec != null && row.readyCount < row.count;
  const noEtaGrowing = !showCountdown && row.readyCount < row.count && row.noEtaCount > 0;
  const isAnimalProduct = ALL_ANIMAL_PRODUCTS.includes(row.name);
  const statusLine = showCountdown ? `${baseStatus} <span class="farm-countdown" data-base="${row.soonestSec}">(next in ${farmPanelFormatCountdown(row.soonestSec)})</span>` : noEtaGrowing ? isAnimalProduct ? `${baseStatus} <span style="color:var(--ink-soft);">(🤒 ${row.noEtaCount} sick — can't estimate)</span>` : `${baseStatus} <span style="color:var(--ink-soft);">(no active flower/growth right now — can't estimate)</span>` : baseStatus;
  const isProfit = row.profit >= 0;
  const expandedCls = farmPanelExpandedNames.has(row.name.toLowerCase()) ? " expanded" : "";
  const growingCount = row.count - row.readyCount;
  let badgeHtml = "";
  if (row.readyCount > 0 && growingCount > 0) {
    badgeHtml = `<span class="harvest-badge-group">\n      <span class="harvest-badge is-ready">✅ Ready ${row.readyCount}</span>\n      <span class="harvest-badge is-growing">⏳ Growing ${growingCount}</span>\n    </span>`;
  } else if (row.readyCount > 0) {
    badgeHtml = `<span class="harvest-badge is-ready">✅ Ready to Harvest</span>`;
  } else {
    badgeHtml = `<span class="harvest-badge is-growing">⏳ In Progress</span>`;
  }
  if (row.sickCount > 0) {
    badgeHtml += `<span class="harvest-badge" style="background:rgba(214,80,80,0.15);color:#c33;">🤒 ${row.sickCount} sick</span>`;
  }
  if (row.weatherDestroyedCount > 0) {
    const destroyedIcon = row.weatherDestroyedEvent ? IMAGE_ICONS[row.weatherDestroyedEvent] : null;
    badgeHtml += `<span class="harvest-badge" style="background:rgba(214,80,80,0.18);color:#a12626;">${destroyedIcon ? `<img src="${destroyedIcon}" style="width:12px;height:12px;vertical-align:-2px;image-rendering:pixelated;margin-right:2px;">` : "🌊"} ${row.weatherDestroyedCount} destroyed by ${escapeHtml(row.weatherDestroyedEvent || "weather event")}</span>`;
  }
  if (row.actualYieldCount > 0) {
    const isOrderedNodeType = [ "Wood", "Stone", "Iron", "Gold" ].includes(row.name) || row.name === "Crimstone" && !row.isDeterministicYield;
    const verb = row.name === "Wood" ? "chop" : "mine";
    const critNote = row.name === "Wood" ? "Tough Tree crit, Native bonus" : row.name === "Stone" ? "Rock Golem crit, Native bonus, Emerald/Tin Turtle AOE" : row.name === "Iron" ? "Native bonus, Emerald Turtle AOE" : row.name === "Gold" ? "Native bonus, Emerald Turtle AOE" : row.name === "Crimstone" ? "Crimstone Clam instant-recovery proc" : "PRNG procs";
    const gapNote = row.name === "Stone" || row.name === "Iron" || row.name === "Gold" ? ` Emerald/Tin Turtle AOE cooldown is read from this rock's own synced recovery timing, not a full boost-window replication. Includes bud yield boosts from your manually-entered Bud NFTs panel.` : " Includes bud yield boosts from your manually-entered Bud NFTs panel.";
    const titleText = row.isDeterministicYield ? row.name === "Crimstone" ? "Crimstone's yield is fully deterministic (depends only on this rock's mine streak position and your owned boosts, no PRNG or timing involved), so every node shown here — ready or still recovering — is the real guaranteed amount, not an average." : row.name === "Oil" ? "Oil's yield is fully deterministic (depends only on this reserve's drill count and your owned boosts, no PRNG or timing involved) — the +20 bonus lands on every 3rd drill and Stag Shrine's +15 only applies alongside it, so every node shown here — ready or still recovering — is the real guaranteed amount, not an average." : "This flower's crit bonuses were rolled and locked in the moment it was planted, so every node shown here — ready or still growing — is the real guaranteed amount, not an average." : row.name === "Crimstone" ? "Crimstone's per-mine yield is always deterministic (depends only on mine streak position and your owned boosts), but Crimstone Clam gives each mine a real PRNG chance to instantly recover the rock — which can chain into extra guaranteed mines. This total includes those predicted chained mines using the same farm-wide PRNG counter as the real game; which physical rock actually gets the chain still depends on the order you mine them in." : isOrderedNodeType ? `Every owned ${row.name.toLowerCase()} node — ready or still recovering — gets a real PRNG roll (${critNote}), since the recovery timer has no effect on the roll; only an actual ${verb} action advances the farmActivity counter used by the PRNG. This total reflects the predicted outcome across your current chop/mine order — which physical node ends up with which result still depends on the order you actually ${verb} them in.${gapNote}` : `Only applies to nodes ready to ${verb} RIGHT NOW. Each one gets its own real PRNG roll (${critNote}) at its actual sequential position — the farmActivity counter advances by 1 with every real ${verb}, so ready nodes mined back-to-back don't all get the same result. Still-recovering nodes use the average instead, since their real future mine order/timing is too uncertain to predict.${gapNote}`;
    const labelText = row.isDeterministicYield || isOrderedNodeType ? `Exact yield (${row.actualYieldCount}/${row.count})` : row.actualYieldCount === row.count ? "Exact yield (" + row.actualYieldCount + " ready)" : `${row.actualYieldCount}/${row.count} exact (ready only)`;
    badgeHtml += `<span class="harvest-badge" style="background:rgba(38,212,255,.15);color:#0a7fa8;" title="${titleText}">🎯 ${labelText}</span>`;
  }
  (row.activeBoosts || []).forEach(b => {
    if (b.limitedBoostName === "Sunshower" || b.limitedBoostName === "Bountiful Harvest") {
      const icon = IMAGE_ICONS[b.name];
      badgeHtml += `<span class="harvest-badge" style="background:rgba(255,196,0,0.18);color:#8a6300;">${icon ? `<img src="${icon}" style="width:12px;height:12px;vertical-align:-2px;image-rendering:pixelated;margin-right:2px;">` : "🌦️"} ${escapeHtml(b.name)} active</span>`;
    }
    if (b.isDebuff) {
      const icon = IMAGE_ICONS[b.name];
      const lossPct = Math.round((b.debuffLossMult || .5) * 100);
      badgeHtml += `<span class="harvest-badge" style="background:rgba(214,80,80,0.18);color:#a12626;">${icon ? `<img src="${icon}" style="width:12px;height:12px;vertical-align:-2px;image-rendering:pixelated;margin-right:2px;">` : "⚠️"} ${escapeHtml(b.name)} ~${lossPct}% plots destroyed</span>`;
    }
  });
  const tierEntries = row.tierCounts ? Object.entries(row.tierCounts) : [];
  const tierNote = tierEntries.length ? ` <span class="card-tier-note">(${tierEntries.map(([label, c]) => `${c} ${escapeHtml(label)}`).join(", ")})</span>` : "";
  const nodeIcon = getNodeIconHtml(row.name);
  const nodeLabel = getNodeLabel(row.name);
  const produceIcon = getIcon(row.name);
  const baseCost = row.totalCost - (row.restockCost || 0);
  const shrineCost = row.shrineCostPerCycle || 0;
  const shrineNames = row.shrineNames || [];
  const restockCost = row.restockCost || 0;
  const showRestockRow = row.name !== "Obsidian";
  const boostSummary = farmPanelComputeNodeYieldBoostSummary(row);
  const woodIcon = row.fruitWood ? getIcon("Wood") : "";
  const woodChipHtml = row.fruitWood ? `\n      <span class="animal-produce-chip">\n        <span class="produce-icon">${woodIcon}</span>\n        <span class="produce-name">Wood</span>\n        <span class="produce-yield">${fmt(row.fruitWood.econ.totalYield)}</span>\n        <span class="produce-value">(${fmt(row.fruitWood.econ.grossRevenue)} ${FLOWER_ICON})</span>\n      </span>` : "";
  const productChipHtml = `\n      <span class="animal-produce-chip">\n        <span class="produce-icon">${produceIcon}</span>\n        <span class="produce-name">${escapeHtml(row.name)}</span>\n        <span class="produce-yield">${fmt(row.totalYield)}</span>\n        <span class="produce-value">(${fmt(row.grossRevenue)} ${FLOWER_ICON})</span>\n      </span>`;
  const netChipHtml = `\n      <span class="animal-net-chip">\n        <span class="label">Net</span>\n        <span class="value ${isProfit ? "is-profit" : "is-loss"}">${isProfit ? "+" : ""}${fmt(row.profit)} ${FLOWER_ICON}</span>\n      </span>`;
  const moneyTreeBadgeHtml = row.moneyTreeBonus ? `\n      <span class="animal-produce-chip money-tree-badge-chip">\n        <span class="produce-name">Money Tree</span>\n        <span class="produce-yield">+${fmt(row.moneyTreeBonus.coins)}</span>\n        ${COIN_ICON}\n      </span>` : "";
  const productDetailRow = renderCardProductDetailRow(produceIcon, row.name, row.totalYield, row.grossRevenue, row.feeAmount, row.isBoosted ? row.baseTotalYield : null);
  const woodDetailRowHtml = row.fruitWood ? renderCardProductDetailRow(woodIcon, "Wood", row.fruitWood.econ.totalYield, row.fruitWood.econ.grossRevenue, row.fruitWood.econ.feeAmount) : "";
  const restockRowHtml = showRestockRow ? `\n        <div class="animal-detail-stat"><span class="label">${GEM_ICON} Gem Restock Cost</span><span class="value" style="${restockCost > 0 ? "color:#c9821a;" : ""}">${restockCost > 0 ? `-${fmt(restockCost)}` : "0"} ${FLOWER_ICON}</span></div>` : "";
  const boostListHtml = farmPanelRenderNodeYieldBoostList(row, boostSummary, produceIcon);
  const tierYieldListHtml = row.name === "Oil" ? renderOilNodeYieldList(row.oilNodeGroups, produceIcon) : row.name === "Salt" ? renderSaltNodeYieldList(row.saltNodeGroups, produceIcon) : row.name === "Crimstone" ? renderCrimstoneNodeYieldList(row.crimstoneNodeGroups) : row.plantYieldLabel ? renderPlantYieldNodeList(row.plantYieldLabel, row.name, row.plantYieldGroups, produceIcon, nodeIcon) : renderNodeTierYieldList(row.tierYields, produceIcon);
  const harvestsLeftHtml = renderFruitHarvestsLeftHtml(row.harvestsLeftCounts, row.name, row.fruitWoodPerTree);
  const turnaroundBoostHtml = renderTurnaroundBoostHtml(row);
  const goldInstantMineBoostHtml = renderGoldInstantMineBoostHtml(row);
  const crimstoneInstantMineBoostHtml = renderCrimstoneInstantMineBoostHtml(row);
  let saltNextChargeHeaderHtml = "";
  if (row.name === "Salt" && row.saltNodeGroups && row.saltNodeGroups.length) {
    const anySaltRecovering = row.saltNodeGroups.some(n => n.storedCharges < n.maxCharges);
    if (anySaltRecovering) {
      const saltCombinedQty = row.saltNodeGroups.reduce((sum, n) => sum + n.qty + (n.storedCharges < n.maxCharges ? n.yieldPerCharge : 0), 0);
      saltNextChargeHeaderHtml = `<div class="salt-node-possible-hint"><b>Harvest Well become</b> +${fmt(saltCombinedQty)} <span class="salt-hint-icon">${produceIcon}</span>Salt when the next charge is ready</div>`;
    }
  }
  return `\n  <div class="card animal-merged-card${isProfit ? " is-profit" : " is-loss"}${expandedCls}" data-search="${row.name.toLowerCase()}" data-fp-category="${farmPanelCardCategory(row)}">\n    <div class="card-toggle">\n      <div class="card-name-row">\n        <span class="card-icon">${nodeIcon}</span>\n        <div>\n          <div class="card-name">${escapeHtml(nodeLabel)}</div>\n          <div class="card-type-row">\n            <span class="card-type">${row.displayNodeCount} node${row.displayNodeCount === 1 ? "" : "s"}${tierNote}</span>\n            ${badgeHtml}\n          </div>\n          <div class="animal-fold-row">${productChipHtml}${woodChipHtml}${netChipHtml}${moneyTreeBadgeHtml}</div>\n          ${saltNextChargeHeaderHtml}${turnaroundBoostHtml}${goldInstantMineBoostHtml}${crimstoneInstantMineBoostHtml}\n        </div>\n      </div>\n      <div class="card-collapsed-profit">\n        <span class="chev">▾</span>\n      </div>\n    </div>\n    <div class="card-details">\n      <div class="stat"><span class="label">Status</span><span class="value">${statusLine}</span></div>\n      <div class="animal-detail-grid">\n        ${productDetailRow}${woodDetailRowHtml}\n        <div class="animal-detail-stat"><span class="label">Market Price/Unit</span><span class="value">${fmt(row.price)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Gross</span><span class="value">${fmt(row.grossRevenue)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Cost/Unit</span><span class="value">${fmt(row.costPerUnit)} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Sell Fee</span><span class="value">${row.feeAmount > 0 ? `-${fmt(row.feeAmount)}` : "0"} ${FLOWER_ICON}</span></div>\n        <div class="animal-detail-stat"><span class="label">Shrine Cost${shrineNames.length ? ` (${shrineNames.map(escapeHtml).join(", ")})` : ""}</span><span class="value" style="${shrineCost > 0 ? "color:#b45309;" : ""}">${shrineCost > 0 ? `-${fmt(shrineCost)}` : "0"} ${FLOWER_ICON}</span></div>${restockRowHtml}\n        <div class="animal-detail-stat"><span class="label">Cost</span><span class="value">${baseCost > 0 ? `-${fmt(baseCost)}` : "0"} ${FLOWER_ICON}</span></div>\n      </div>\n      <div class="animal-net-row2">\n        <span class="label">Net</span>\n        <span class="value ${isProfit ? "is-profit" : "is-loss"}">${isProfit ? "+" : ""}${fmt(row.profit)} ${FLOWER_ICON}</span>\n      </div>\n      ${harvestsLeftHtml}\n      ${tierYieldListHtml}\n      ${boostListHtml}\n      ${farmPanelRestockNoteHtml(row.restockInfo)}\n    </div>\n  </div>`;
}

export function farmPanelRenderStockRow(row) {
  const isProfit = row.profit >= 0;
  const expandedCls = farmPanelExpandedNames.has(row.name.toLowerCase()) ? " expanded" : "";
  return `\n  <div class="card${isProfit ? " is-profit" : " is-loss"}${expandedCls}" data-search="${row.name.toLowerCase()}">\n    <div class="card-toggle">\n      <div class="card-name-row">\n        <span class="card-icon">${getIcon(row.name)}</span>\n        <div>\n          <div class="card-name">${escapeHtml(row.name)}</div>\n          <div class="card-type">${fmt(row.totalYield)} in stock</div>\n        </div>\n      </div>\n      <div class="card-collapsed-profit">\n        <span class="pvalue-mini${isProfit ? " is-profit" : " is-loss"}">${isProfit ? "+" : ""}${fmt(row.profit)} ${FLOWER_ICON}</span>\n        <span class="chev">▾</span>\n      </div>\n    </div>\n    <div class="card-details">\n      <div class="card-grid">\n        <div class="stat"><span class="label">Price / unit (market)</span><span class="value">${fmt(row.price)} ${FLOWER_ICON}</span></div>\n        <div class="stat"><span class="label">Cost / unit (seed)</span><span class="value">${fmt(row.costPerUnit)} ${FLOWER_ICON}</span></div>\n      </div>\n      ${renderTotalsBreakdown({
    title: "Totals",
    totalYield: row.totalYield,
    yieldLabel: escapeHtml(row.name),
    gross: row.grossRevenue,
    baseCost: row.totalCost - (row.restockCost || 0),
    restockCost: row.restockCost || 0,
    shrineCost: 0,
    sellFee: row.feeAmount
  })}\n      ${farmPanelRestockNoteHtml(row.restockInfo)}\n    </div>\n  </div>`;
}

function farmPanelRestockNoteHtml(ri) {
  if (!ri || !(ri.flowerCost > 0)) return "";
  const noun = ri.stockKind === "tool" ? "tool" : "seed";
  let txt = `${GEM_ICON} ~${fmt(ri.restocksNeeded)} ${noun} restock${ri.restocksNeeded === 1 ? "" : "s"} needed for this qty · ${fmt(ri.gemsTotal)} ${GEM_ICON} Gems ≈ ${fmt(ri.flowerCost)} ${FLOWER_ICON} (already added to Total cost above)`;
  if (ri.moonOnly) {
    const minDays = Math.ceil(ri.restocksNeeded) * SYNODIC_MONTH_DAYS;
    const moonStock = fullMoonSeedStockQty(ri.name);
    txt += `<br>🌕 Moon-fruit: Betty sells ${fmt(moonStock)} seed${moonStock === 1 ? "" : "s"} per real Full Moon${moonStock > 1 ? " (Moon Hair equipped)" : ""} — even with unlimited Gems this qty needs ~${fmt(minDays)} days minimum.`;
  }
  return `<div class="setting-hint" style="margin-top:4px;font-weight:700;color:#e0a63f;">${txt}</div>`;
}

function farmPanelTickCountdowns() {
  const panel = $("farmSidePanel");
  if (!panel || !panel.classList.contains("open")) return;
  if (farmPanelActiveTab !== "inprogress" || !farmPanelGameState) return;
  if (farmPanelUserScrolling) return;
  const wrap = $("farmPanelTabContent");
  if (!wrap) return;
  const els = wrap.querySelectorAll(".farm-countdown[data-base]");
  if (!els.length) return;
  const elapsedSec = (Date.now() - farmPanelRenderAtMs) / 1e3;
  let anyFinished = false;
  els.forEach(el => {
    const base = parseFloat(el.getAttribute("data-base"));
    const remaining = base - elapsedSec;
    if (remaining <= 0) {
      anyFinished = true;
      return;
    }
    el.textContent = `(next in ${farmPanelFormatCountdown(remaining)})`;
  });
  if (anyFinished) renderFarmPanelTabContent();
}

setInterval(farmPanelTickCountdowns, 1e3);

export function farmPanelDebugFindShapes(obj, substrs, path, depth, out) {
  if (!obj || typeof obj !== "object" || depth > 3) return;
  Object.keys(obj).forEach(k => {
    const full = path ? `${path}.${k}` : k;
    if (substrs.some(s => k.toLowerCase().includes(s)) && !out[full]) {
      const v = obj[k];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const firstKey = Object.keys(v)[0];
        out[full] = firstKey !== undefined ? {
          _sampleKey: firstKey,
          _sampleValue: v[firstKey]
        } : v;
      } else {
        out[full] = v;
      }
    }
    if (obj[k] && typeof obj[k] === "object") farmPanelDebugFindShapes(obj[k], substrs, full, depth + 1, out);
  });
}

const farmPanelDebugCloseBtnEl = $("farmPanelDebugCloseBtn");

if (farmPanelDebugCloseBtnEl) farmPanelDebugCloseBtnEl.onclick = () => {
  $("farmPanelDebugPanel").classList.remove("open");
  $("farmPanelDebugToggle").classList.remove("open");
  const box = $("farmPanelDebugOutput");
  if (box) box.style.display = "none";
};

const farmPanelDebugPetsBtnEl = $("farmPanelDebugPetsBtn");

if (farmPanelDebugPetsBtnEl) farmPanelDebugPetsBtnEl.onclick = () => {
  const box = $("farmPanelDebugOutput");
  if (!farmPanelGameState) {
    box.style.display = "block";
    box.value = "Sync a Farm ID first, then tap this again.";
    return;
  }
  const g = farmSyncExtractGameState(farmPanelGameState);
  const asObj = v => v && typeof v === "object" && !Array.isArray(v) ? v : null;
  const topBag = asObj(farmPanelField(g, "pets"));
  const house = asObj(farmPanelField(g, "petHouse"));
  const heuristic = !topBag || !Object.keys(topBag).length ? farmSyncFindBagByNameHeuristic(g, /^pets$/i, 3) : null;
  const records = typeof farmSyncGetPetRecords === "function" ? farmSyncGetPetRecords(g, true) : {};
  const firstId = Object.keys(records)[0];
  const out = {
    "g.pets (top-level bag)": topBag ? {
      count: Object.keys(topBag).length,
      first: topBag[Object.keys(topBag)[0]] || null
    } : "(missing)",
    "g.petHouse (building, if pets are nested inside it)": house ? {
      topLevelKeys: Object.keys(house),
      sample: house
    } : "(missing)",
    "heuristic search result (only runs if g.pets was missing/empty)": heuristic ? {
      path: heuristic.path,
      count: Object.keys(heuristic.value).length,
      first: Object.values(heuristic.value)[0] || null
    } : "(not run / nothing found)",
    "What syncPetsFromFarmData() will actually use": firstId ? {
      recordCount: Object.keys(records).length,
      firstRecordId: firstId,
      firstRecordRaw: records[firstId],
      extractedTraits: typeof farmSyncExtractPetTraits === "function" ? farmSyncExtractPetTraits(records[firstId]) : null
    } : "(no pet records found anywhere — copy this whole box and send it over)"
  };
  box.style.display = "block";
  box.value = JSON.stringify(out, null, 2);
  box.focus();
  box.select();
};

const farmPanelDebugNftPricesBtnEl = $("farmPanelDebugNftPricesBtn");

if (farmPanelDebugNftPricesBtnEl) farmPanelDebugNftPricesBtnEl.onclick = async () => {
  const box = $("farmPanelDebugOutput");
  box.style.display = "block";
  box.value = "Fetching " + SFL_NFT_PRICE_API + " ...";
  let json = null;
  let fetchError = null;
  try {
    const res = await fetch(SFL_NFT_PRICE_API, {
      cache: "no-store"
    });
    if (!res.ok) throw new Error("Bad response " + res.status);
    json = await res.json();
  } catch (e) {
    fetchError = String(e && e.message || e);
  }
  if (!json) {
    box.value = "Fetch failed: " + fetchError;
    box.focus();
    box.select();
    return;
  }
  const topLevelKeys = Object.keys(json);
  const budsArr = Array.isArray(json.buds) ? json.buds : null;
  const petsArr = Array.isArray(json.pets) ? json.pets : null;
  const collectiblesArr = Array.isArray(json.collectibles) ? json.collectibles : [];
  const wearablesArr = Array.isArray(json.wearables) ? json.wearables : [];
  const petTypeWords = [ "ram", "dragon", "phoenix", "griffin", "warthog", "wolf", "bear", "pet" ];
  const looksLikeBudOrPet = name => {
    const n = String(name || "").toLowerCase();
    return n.indexOf("bud") !== -1 || petTypeWords.some(w => n.indexOf(w) !== -1);
  };
  const collectiblesSuspects = collectiblesArr.filter(it => it && looksLikeBudOrPet(it.name));
  const wearablesSuspects = wearablesArr.filter(it => it && looksLikeBudOrPet(it.name));
  const g = farmPanelGameState ? farmSyncExtractGameState(farmPanelGameState) : null;
  const asObj = v => v && typeof v === "object" && !Array.isArray(v) ? v : null;
  const budsBag = g ? asObj(farmPanelField(g, "buds")) : null;
  const firstBudId = budsBag ? Object.keys(budsBag)[0] : null;
  const firstBudTraits = firstBudId ? farmSyncExtractBudTraits(budsBag[firstBudId]) : null;
  const petsRoot = g ? asObj(farmPanelField(g, "pets")) : null;
  const petNfts = petsRoot ? asObj(petsRoot.nfts) : null;
  const firstPetId = petNfts ? Object.keys(petNfts)[0] : null;
  const firstPetTraitType = firstPetId && asObj(petNfts[firstPetId]) && asObj(petNfts[firstPetId].traits) ? petNfts[firstPetId].traits.type : null;
  const out = {
    "Top-level keys on the /api/v1/nfts response": topLevelKeys,
    "json.buds (array?)": budsArr ? {
      count: budsArr.length,
      first: budsArr[0] || null,
      firstFew: budsArr.slice(0, 5)
    } : "(json.buds is missing or not an array — raw value: " + JSON.stringify(json.buds) + ")",
    "json.pets (array?)": petsArr ? {
      count: petsArr.length,
      first: petsArr[0] || null,
      firstFew: petsArr.slice(0, 5)
    } : "(json.pets is missing or not an array — raw value: " + JSON.stringify(json.pets) + ")",
    "collectibles count": collectiblesArr.length,
    "collectibles entries whose name contains bud/pet-type words": collectiblesSuspects.length ? collectiblesSuspects : "(none found)",
    "wearables count": wearablesArr.length,
    "wearables entries whose name contains bud/pet-type words": wearablesSuspects.length ? wearablesSuspects : "(none found)",
    "Your farm's first Bud type (from synced farm data, if any)": firstBudTraits ? firstBudTraits.type : "(sync a Farm ID first, or you have no buds)",
    "Your farm's first NFT Pet type (from synced farm data, if any)": firstPetTraitType || "(sync a Farm ID first, or you have no NFT pets)"
  };
  box.value = JSON.stringify(out, null, 2);
  box.focus();
  box.select();
};

const farmPanelDebugMarketplaceProbeBtnEl = $("farmPanelDebugMarketplaceProbeBtn");

if (farmPanelDebugMarketplaceProbeBtnEl) farmPanelDebugMarketplaceProbeBtnEl.onclick = async () => {
  const box = $("farmPanelDebugOutput");
  box.style.display = "block";
  box.value = "Probing candidate endpoints...";
  const candidates = [ SFL_PROXY_BASE + "/api/v1/marketplace?filters=buds,pets", SFL_PROXY_BASE + "/api/v1/marketplace/buds", SFL_PROXY_BASE + "/api/v1/marketplace/pets", SFL_PROXY_BASE + "/api/v1/collection/buds", SFL_PROXY_BASE + "/api/v1/collection/pets", SFL_PROXY_BASE + "/api/v1.1/marketplace", SFL_PROXY_BASE + "/api/v1.1/marketplace/buds", SFL_PROXY_BASE + "/api/v1.1/marketplace/pets", SFL_COMMUNITY_PROXY_BASE + "community/marketplace", SFL_COMMUNITY_PROXY_BASE + "community/marketplace/buds", SFL_COMMUNITY_PROXY_BASE + "community/marketplace/pets", SFL_COMMUNITY_PROXY_BASE + "community/nfts" ];
  const results = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: "no-store"
      });
      let bodyPreview = null;
      let keys = null;
      try {
        const j = await res.json();
        keys = j && typeof j === "object" ? Object.keys(j).slice(0, 10) : null;
        bodyPreview = JSON.stringify(j).slice(0, 300);
      } catch (e) {
        bodyPreview = "(non-JSON or empty body)";
      }
      results.push({
        url: url,
        status: res.status,
        ok: res.ok,
        topLevelKeys: keys,
        bodyPreview: bodyPreview
      });
    } catch (e) {
      results.push({
        url: url,
        status: "fetch failed",
        error: String(e && e.message || e)
      });
    }
  }
  box.value = JSON.stringify(results, null, 2);
  box.focus();
  box.select();
};

const farmPanelDebugMutantsBtnEl = $("farmPanelDebugMutantsBtn");

if (farmPanelDebugMutantsBtnEl) farmPanelDebugMutantsBtnEl.onclick = () => {
  const box = $("farmPanelDebugOutput");
  if (!farmPanelGameState) {
    box.style.display = "block";
    box.value = "Sync a Farm ID first, then tap this again.";
    return;
  }
  const g = farmSyncExtractGameState(farmPanelGameState);
  const asObj = v => v && typeof v === "object" && !Array.isArray(v) ? v : null;
  const chapterName = getCurrentChapterName();
  const chapterMutants = getCurrentChapterMutantSet();
  const inspectJob = job => {
    if (!job || typeof job !== "object") return "(no job object)";
    return {
      allKeys: Object.keys(job),
      hasRewardField: Object.prototype.hasOwnProperty.call(job, "reward"),
      reward: job.reward === undefined ? "(reward key not present at all)" : job.reward,
      rewardItems: job.reward && Array.isArray(job.reward.items) ? job.reward.items : "(no reward.items array)"
    };
  };
  const flowersField = farmPanelField(g, "flowers");
  const flowerBeds = asObj(flowersField && flowersField.flowerBeds) || {};
  const flowerEntries = Object.entries(flowerBeds);
  const flowerOut = flowerEntries.length ? flowerEntries.map(([id, bed]) => ({
    bedId: id,
    ...inspectJob(bed && bed.flower)
  })) : "(no flower beds found on this farm)";
  const animalOut = {};
  [ "chicken", "sheep", "cow" ].forEach(type => {
    const bag = farmSyncGetAnimalRecords(g, type);
    const entries = Object.entries(bag || {});
    animalOut[type] = entries.length ? entries.map(([id, animal]) => ({
      animalId: id,
      state: animal && animal.state,
      ...inspectJob(animal)
    })) : `(no ${type} records found on this farm)`;
  });
  const out = {
    "Auto-detected current chapter": chapterName,
    "This chapter's target mutant names (what we're scanning reward.items for)": chapterMutants || "(no mutant table for this chapter)",
    "Flower beds — raw reward field per bed": flowerOut,
    "Chicken — raw reward field per animal": animalOut.chicken,
    "Sheep — raw reward field per animal": animalOut.sheep,
    "Cow — raw reward field per animal": animalOut.cow,
    "What farmPanelDetectActiveMutants() currently returns for this farm": farmPanelDetectActiveMutants(farmPanelGameState)
  };
  box.style.display = "block";
  box.value = JSON.stringify(out, null, 2);
  box.focus();
  box.select();
};

const farmPanelDebugTreeDataBtnEl = $("farmPanelDebugTreeDataBtn");

if (farmPanelDebugTreeDataBtnEl) farmPanelDebugTreeDataBtnEl.onclick = () => {
  const box = $("farmPanelDebugOutput");
  if (!farmPanelGameState) {
    box.style.display = "block";
    box.value = "Sync a Farm ID first, then tap this again.";
    return;
  }
  const g = farmSyncExtractGameState(farmPanelGameState);
  const trees = farmPanelField(g, "trees") || {};
  const treeEntries = Object.entries(trees);
  const farmActivity = farmPanelField(g, "farmActivity");
  const lastInfo = farmPanelGetLastInfo();
  const relevantActivityKeys = farmActivity ? Object.keys(farmActivity).filter(k => /Chopped$/.test(k)) : null;
  const perTree = treeEntries.map(([id, node]) => {
    const job = node && node.wood;
    return {
      treeId: id,
      name: node && node.name ? node.name : "Tree (base)",
      hasWoodAmount: !!(job && typeof job.amount === "number"),
      woodAmount: job && typeof job.amount === "number" ? job.amount : null,
      hasWoodReward: !!(job && job.reward),
      woodReward: job && job.reward || null,
      allWoodKeys: job ? Object.keys(job) : []
    };
  });
  const inProgress = farmPanelComputeInProgress(farmPanelGameState);
  const woodCard = inProgress.find(r => r.name === "Wood");
  const typesInFarm = [ ...new Set(treeEntries.map(([, node]) => farmPanelTreeTypeForNode(node))) ];
  const perTypeRolls = {};
  typesInFarm.forEach(t => {
    const typeEntries = treeEntries.filter(([, node]) => farmPanelTreeTypeForNode(node) === t);
    const readyEntries = typeEntries.filter(([, node]) => farmPanelIsNodeReadyNow("Wood", node, "wood", Date.now()));
    const chains = farmPanelBuildSequentialWoodRollChains(farmPanelGameState, t, readyEntries.length);
    const activityKey = `${t === "Tree" ? "Basic Tree" : t} Chopped`;
    let sequentialSum = 0;
    const perReadyNodeBreakdown = readyEntries.map(([id, node], i) => {
      const chain = chains && chains[i] ? chains[i] : null;
      const critRolls = chain && chain.length ? chain[0] : null;
      
      
      const amount = chain && chain.length ? chain.reduce((sum, roll) => sum + farmPanelComputeExactWoodYieldForNode(node, t, roll), 0) : null;
      if (typeof amount === "number") sequentialSum += amount;
      return {
        treeId: id,
        counterUsed: farmActivity ? (farmActivity[activityKey] ?? 0) + i : null,
        critRolls: critRolls,
        chain: chain,
        chainLength: chain ? chain.length : null,
        amount: amount
      };
    });
    perTypeRolls[t] = {
      turnaroundPredicted: perReadyNodeBreakdown.some(n => n.chainLength > 1),
      turnaroundPredictedNodeIds: perReadyNodeBreakdown.filter(n => n.chainLength > 1).map(n => n.treeId),
      moneyTreePredicted: farmPanelPredictMoneyTreeForType(farmPanelGameState, t),
      moneyTreeBatchPredicted: farmPanelPredictMoneyTreeBatchForType(farmPanelGameState, t, typeEntries.length, typeEntries.length ? typeof typeEntries[0][1].multiplier === "number" ? typeEntries[0][1].multiplier : 1 : 1),
      baseActivityCounter: farmActivity ? farmActivity[activityKey] ?? 0 : null,
      readyNodeCount: readyEntries.length,
      totalNodesOfThisType: typeEntries.length,
      sequentialSumForReadyNodes: readyEntries.length ? Number(sequentialSum.toFixed(4)) : null,
      perReadyNodeBreakdown: perReadyNodeBreakdown
    };
  });
  const out = {
    "farmId used for PRNG (farmPanelGetLastInfo().id)": lastInfo.id,
    "farmActivity present on merged state?": !!farmActivity,
    "farmActivity '*Chopped' keys found": relevantActivityKeys,
    "Tree Turnaround owned (isSkillActive)": isSkillActive("skill_tree_turnaround"),
    "Tree Turnaround rank (getAscensionRank)": getAscensionRank("skill_tree_turnaround"),
    "Money Tree owned (isSkillActive)": isSkillActive("skill_money_tree"),
    "Money Tree rank (getAscensionRank)": getAscensionRank("skill_money_tree"),
    "Total tree nodes": treeEntries.length,
    "Nodes with a real stored wood.amount": perTree.filter(t => t.hasWoodAmount).length,
    "Nodes with a real stored wood.reward": perTree.filter(t => t.hasWoodReward).length,
    "Per-TYPE roll (one shared result per type, NOT per node — see farmPanelPredictTreeTypeRoll)": perTypeRolls,
    "Per-tree raw wood field dump": perTree,
    "farmPanelDetectMoneyTreeBonus() result": farmPanelDetectMoneyTreeBonus(farmPanelGameState),
    "Wood card from farmPanelComputeInProgress() — actualYieldCount / turnaroundTypesPredicted": woodCard ? {
      actualYieldCount: woodCard.actualYieldCount,
      turnaroundTypesPredicted: woodCard.turnaroundTypesPredicted,
      turnaroundBonusYieldEstimate: woodCard.turnaroundBonusYieldEstimate
    } : "(no Wood card — sync a farm with trees first)",
    "Manually-entered Bud yield boost for Wood (resourceBuds panel)": farmPanelGetBudYieldForResource("Wood"),
    resourceBudsConfigured: resourceBuds
  };
  box.style.display = "block";
  box.value = JSON.stringify(out, null, 2);
  box.focus();
  box.select();
};

const farmPanelDebugMiningBtnEl = $("farmPanelDebugMiningBtn");

if (farmPanelDebugMiningBtnEl) farmPanelDebugMiningBtnEl.onclick = () => {
  const box = $("farmPanelDebugOutput");
  if (!farmPanelGameState) {
    box.style.display = "block";
    box.value = "Sync a Farm ID first, then tap this again.";
    return;
  }
  const g = farmSyncExtractGameState(farmPanelGameState);
  const farmActivity = farmPanelField(g, "farmActivity");
  const lastInfo = farmPanelGetLastInfo();
  function boostFlags(ids) {
    const out = {};
    ids.forEach(id => {
      if (id.startsWith("skill_")) {
        out[id] = isSkillActive(id) ? {
          owned: true,
          rank: getAscensionRank(id)
        } : {
          owned: false
        };
      } else {
        out[id] = isBoostActive(id);
      }
    });
    return out;
  }
  function buildSection(resourceLabel, bagKey, knownIds, defaultName, buildRollsFn, computeFn, boostIds) {
    const bag = farmPanelField(g, bagKey);
    if (!bag || typeof bag !== "object") return {
      present: false
    };
    const entries = Object.entries(bag);
    const typesInFarm = [ ...new Set(entries.map(([, node]) => farmPanelRockNameForNode(node, knownIds, defaultName))) ];
    const flags = boostFlags(boostIds);
    const perType = {};
    typesInFarm.forEach(t => {
      const typeEntries = entries.filter(([, node]) => farmPanelRockNameForNode(node, knownIds, defaultName) === t);
      const readyEntries = typeEntries.filter(([, node]) => farmPanelIsNodeReadyNow(resourceLabel, node, "stone", Date.now()));
      const rolls = buildRollsFn(farmPanelGameState, t, readyEntries.length);
      const activityKey = `${t} Mined`;
      let sequentialSum = 0;
      const perNodeBreakdown = readyEntries.map(([id, node], i) => {
        const rollOrChain = rolls && rolls[i] ? rolls[i] : null;
        const isChain = Array.isArray(rollOrChain);
        const critRolls = isChain ? (rollOrChain.length ? rollOrChain[0] : null) : rollOrChain;
        const amount = isChain ? (rollOrChain.length ? rollOrChain.reduce((sum, roll) => sum + (computeFn(farmPanelGameState, node, t, roll) || 0), 0) : null) : (critRolls ? computeFn(farmPanelGameState, node, t, critRolls) : null);
        if (typeof amount === "number") sequentialSum += amount;
        return {
          nodeId: id,
          counterUsed: farmActivity ? (farmActivity[activityKey] ?? 0) + i : null,
          critRolls: critRolls,
          chain: isChain ? rollOrChain : null,
          chainLength: isChain ? rollOrChain.length : null,
          amount: amount
        };
      });
      perType[t] = {
        itemId: knownIds[t],
        baseActivityCounter: farmActivity ? farmActivity[activityKey] ?? 0 : null,
        readyNodeCount: readyEntries.length,
        totalNodesOfThisType: typeEntries.length,
        sequentialSumForReadyNodes: readyEntries.length ? Number(sequentialSum.toFixed(4)) : null,
        perReadyNodeBreakdown: perNodeBreakdown
      };
    });
    return {
      present: true,
      totalNodes: entries.length,
      boostFlags: flags,
      perType: perType
    };
  }
  const out = {
    "farmId used for PRNG (farmPanelGetLastInfo().id)": lastInfo.id,
    "farmActivity present on merged state?": !!farmActivity,
    Stone: buildSection("Stone", "stones", STONE_KNOWN_IDS, "Stone Rock", farmPanelBuildSequentialStoneRolls, farmPanelComputeExactStoneYieldForNode, [ "rock_golem", "prospector", "tunnel_mole", "stone_beetle", "skill_rocknroll", "skill_rocky_favor", "skill_ferrous_favor", "emerald_turtle", "tin_turtle", "faction_shield_res", "legendary_shrine_res", "volcano_gnome" ]),
    Iron: buildSection("Iron", "iron", IRON_KNOWN_IDS, "Iron Rock", farmPanelBuildSequentialIronRolls, farmPanelComputeExactIronYieldForNode, [ "rocky_the_mole", "radiant_ray", "iron_idol", "iron_beetle", "skill_iron_bumpkin", "skill_rocky_favor", "skill_ferrous_favor", "emerald_turtle", "faction_shield_res", "volcano_gnome" ]),
    Gold: buildSection("Gold", "gold", GOLD_KNOWN_IDS, "Gold Rock", farmPanelBuildSequentialGoldRollChains, farmPanelComputeExactGoldYieldForNode, [ "gold_rush", "skill_golden_touch", "nugget", "gilded_swordfish", "gold_beetle", "emerald_turtle", "faction_shield_res", "pickaxe_shark", "volcano_gnome" ]),
    "aoe object present on merged state?": !!farmPanelField(g, "aoe"),
    "collectibles present on merged state?": !!farmPanelField(g, "collectibles"),
    "Emerald Turtle position found": farmPanelGetCollectiblePosition(g, "Emerald Turtle"),
    "Tin Turtle position found": farmPanelGetCollectiblePosition(g, "Tin Turtle"),
    "Manually-entered Bud yield boosts (resourceBuds panel)": {
      Stone: farmPanelGetBudYieldForResource("Stone"),
      Iron: farmPanelGetBudYieldForResource("Iron"),
      Gold: farmPanelGetBudYieldForResource("Gold"),
      resourceBudsConfigured: resourceBuds
    }
  };
  box.style.display = "block";
  box.value = JSON.stringify(out, null, 2);
  box.focus();
  box.select();
};

function farmPanelSectionStorageKey(name) {
  return "hl_fpgs__" + name;
}

function farmPanelSectionLenSig(v) {
  if (Array.isArray(v)) return "a" + v.length;
  if (v && typeof v === "object") return "o" + Object.keys(v).length;
  return "p" + typeof v + String(v);
}

export function farmPanelSaveGameState(json) {
  farmPanelGameState = json || null;
  
  farmPanelHoneySnapshotMs = Date.now();
  const toStore = farmPanelGameState;
  if (__farmPanelSaveGameStateHandle !== null) {
    if (typeof cancelIdleCallback === "function") cancelIdleCallback(__farmPanelSaveGameStateHandle); else clearTimeout(__farmPanelSaveGameStateHandle);
  }
  const write = () => {
    __set___farmPanelSaveGameStateHandle(null);
    farmPanelWriteGameStateSharded(toStore);
  };
  if (typeof requestIdleCallback === "function") __set___farmPanelSaveGameStateHandle(requestIdleCallback(write, {
    timeout: 1500
  })); else __set___farmPanelSaveGameStateHandle(setTimeout(write, 0));
}

function farmPanelWriteGameStateSharded(toStore) {
  try {
    if (!toStore || typeof toStore !== "object") {
      localStorage.setItem("hl_farm_panel_gamestate", JSON.stringify(toStore));
      localStorage.removeItem("hl_fpgs_meta");
      return;
    }
    const g = farmSyncExtractGameState(toStore);
    let containerKey = null;
    if (g !== toStore) {
      [ "game", "farm", "gameState", "state" ].some(k => {
        if (toStore[k] === g) {
          containerKey = k;
          return true;
        }
        return false;
      });
    }
    const hasGame = !!(g && typeof g === "object");
    const rootRest = {};
    Object.keys(toStore).forEach(k => {
      if (k !== containerKey) rootRest[k] = toStore[k];
    });
    const writeSection = (name, value) => {
      const lenSig = farmPanelSectionLenSig(value);
      if (__gameStateSectionLenSigs[name] === lenSig) return;
      __gameStateSectionLenSigs[name] = lenSig;
      try {
        localStorage.setItem(farmPanelSectionStorageKey(name), JSON.stringify(value));
      } catch (e) {}
    };
    writeSection("__rootRest", rootRest);
    if (hasGame) {
      const gameRest = {};
      Object.keys(g).forEach(k => {
        if (!GAMESTATE_SECTION_KEYS.includes(k)) gameRest[k] = g[k];
      });
      writeSection("__gameRest", gameRest);
      GAMESTATE_SECTION_KEYS.forEach(k => {
        if (Object.prototype.hasOwnProperty.call(g, k)) {
          writeSection(k, g[k]);
        } else if (__gameStateSectionLenSigs[k] !== undefined) {
          delete __gameStateSectionLenSigs[k];
          localStorage.removeItem(farmPanelSectionStorageKey(k));
        }
      });
    }
    localStorage.setItem("hl_fpgs_meta", JSON.stringify({
      containerKey: containerKey,
      hasGame: hasGame
    }));
    localStorage.removeItem("hl_farm_panel_gamestate");
  } catch (e) {}
}

export function farmPanelLoadCachedGameState() {
  
  
  farmPanelHoneySnapshotMs = Date.now();
  try {
    const metaRaw = localStorage.getItem("hl_fpgs_meta");
    if (!metaRaw) {
      const raw = localStorage.getItem("hl_farm_panel_gamestate");
      if (raw) farmPanelGameState = JSON.parse(raw);
      return;
    }
    const meta = JSON.parse(metaRaw);
    const rootRest = JSON.parse(localStorage.getItem(farmPanelSectionStorageKey("__rootRest")) || "{}");
    __set___gameStateSectionLenSigs({
      __rootRest: farmPanelSectionLenSig(rootRest)
    });
    let g = null;
    if (meta.hasGame) {
      g = JSON.parse(localStorage.getItem(farmPanelSectionStorageKey("__gameRest")) || "{}");
      __gameStateSectionLenSigs.__gameRest = farmPanelSectionLenSig(g);
      GAMESTATE_SECTION_KEYS.forEach(k => {
        const raw = localStorage.getItem(farmPanelSectionStorageKey(k));
        if (raw !== null) {
          try {
            g[k] = JSON.parse(raw);
            __gameStateSectionLenSigs[k] = farmPanelSectionLenSig(g[k]);
          } catch (e) {}
        }
      });
    }
    if (meta.containerKey && g) {
      const full = Object.assign({}, rootRest);
      full[meta.containerKey] = g;
      farmPanelGameState = full;
    } else if (g) {
      farmPanelGameState = g;
    } else {
      farmPanelGameState = rootRest;
    }
  } catch (e) {
    farmPanelGameState = null;
  }
}

function farmPanelMergeAnimalFeedBuff(communityHouse, rawHouse) {
  
  
  
  
  
  
  
  
  if (!communityHouse || typeof communityHouse !== "object") return rawHouse;
  if (!rawHouse || typeof rawHouse !== "object") return communityHouse;
  const communityAnimals = communityHouse.animals && typeof communityHouse.animals === "object" ? communityHouse.animals : null;
  const rawAnimals = rawHouse.animals && typeof rawHouse.animals === "object" ? rawHouse.animals : null;
  if (!communityAnimals || !rawAnimals) return communityHouse;
  const patchedAnimals = {
    ...communityAnimals
  };
  let touched = false;
  Object.keys(patchedAnimals).forEach(id => {
    const communityAnimal = patchedAnimals[id];
    const rawAnimal = rawAnimals[id];
    if (!communityAnimal || typeof communityAnimal !== "object" || !rawAnimal || typeof rawAnimal !== "object") return;
    const communityHasBuff = communityAnimal.feedBuff && typeof communityAnimal.feedBuff === "object" && communityAnimal.feedBuff.name;
    const rawHasBuff = rawAnimal.feedBuff && typeof rawAnimal.feedBuff === "object" && rawAnimal.feedBuff.name;
    if (!communityHasBuff && rawHasBuff) {
      patchedAnimals[id] = {
        ...communityAnimal,
        feedBuff: rawAnimal.feedBuff
      };
      touched = true;
    }
  });
  if (!touched) return communityHouse;
  return {
    ...communityHouse,
    animals: patchedAnimals
  };
}

export function farmPanelMergeAuthoritativeResourceData(rawJson, communitySourceState, communityOk) {
  const rawG = farmSyncExtractGameState(rawJson);
  if (!communityOk) {
    return rawJson;
  }
  const communityG = farmSyncExtractGameState(communitySourceState);
  if (!rawG || typeof rawG !== "object" || rawG === communitySourceState) {
    return communitySourceState;
  }
  const merged = communityG && typeof communityG === "object" ? {
    ...communityG
  } : {};
  [ "trees", "stones", "iron", "gold", "crimstones", "farmActivity", "collectibles", "buildings", "home", "aoe", "crops", "fruitPatches", "greenhouse" ].forEach(key => {
    if (rawG[key] != null) merged[key] = rawG[key];
  });
  [ "henHouse", "barn" ].forEach(key => {
    const rawHouse = farmPanelField(rawG, key);
    if (rawHouse != null) merged[key] = farmPanelMergeAnimalFeedBuff(farmPanelField(merged, key), rawHouse);
  });
  return merged;
}

setTimeout(() => {
  const {id: savedFarmId} = farmPanelGetLastInfo();
  if (savedFarmId) {
    let __autoSyncStarted = false;
    const startAutoSyncOnce = () => {
      if (__autoSyncStarted) return;
      __autoSyncStarted = true;
      farmIdPromptStartSync(savedFarmId);
    };
    onDeferredInitialRenderDone(startAutoSyncOnce);
    setTimeout(startAutoSyncOnce, 1500);
  } else {
    const screen = document.getElementById("appLoadingScreen");
    const input = document.getElementById("farmIdPromptInput");
    const openBtn = document.getElementById("farmIdPromptOpenBtn");
    if (screen) screen.classList.add("show-prompt");
    if (input) setTimeout(() => input.focus(), 50);
    function handleOpen() {
      const farmId = (input && input.value || "").trim();
      if (!farmId) {
        if (input) input.focus();
        return;
      }
      if (screen) screen.classList.remove("show-prompt");
      farmIdPromptStartSync(farmId);
    }
    if (openBtn) openBtn.addEventListener("click", handleOpen);
    if (input) input.addEventListener("keydown", e => {
      if (e.key === "Enter") handleOpen();
    });
  }
}, 0);

setTimeout(() => {
  try {
    if (typeof farmPanelLoadCachedGameState === "function") {
      farmPanelLoadCachedGameState();
      if (typeof farmPanelGameState !== "undefined" && farmPanelGameState) {
        syncCookingCountsFromInventory(farmPanelGameState);
      }
    }
  } catch (e) {}
}, 0);

document.addEventListener("click", e => {
  const target = e.target.closest("#farmPanelProfileBtn, #profileOverlay button, #profileOverlay .profile-tradable-row-editable");
  if (!target) return;
  target.classList.remove("btn-pop-click");
  void target.offsetWidth;
  target.classList.add("btn-pop-click");
});

export function __set_farmPanelInProgressCategoryFilter(v) { return farmPanelInProgressCategoryFilter = v; }

export function __set_farmPanelTabContentDirty(v) { return farmPanelTabContentDirty = v; }

export function __set_farmPanelRenderAtMs(v) { return farmPanelRenderAtMs = v; }

export function __set_farmPanelActiveTab(v) { return farmPanelActiveTab = v; }

export function __set_farmPanelSyncInFlight(v) { return farmPanelSyncInFlight = v; }