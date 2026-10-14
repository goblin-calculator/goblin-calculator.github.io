import { COIN_ICON, IMAGE_ICONS, computeAnimalBountyTable } from "./calculator.js";

import { getIcon } from "./ui.js";

function fmtCoins(n) {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

function coinText(n) {
  return `<span class="ab-val"><span class="ab-num">${fmtCoins(n)}</span>${COIN_ICON}</span>`;
}

function profitText(n) {
  const rounded = Math.round(n * 100) / 100;
  const cls = rounded >= 0 ? "is-profit" : "is-loss";
  return `<span class="ab-val ab-profit ${cls}"><span class="ab-num">${rounded >= 0 ? "+" : "-"}${fmtCoins(Math.abs(rounded))}</span>${COIN_ICON}</span>`;
}

function renderRow(label, row, boosted) {
  const baseLine = boosted ? `<div class="ab-base">base ${coinText(row.baseCoins)}</div>` : "";
  return `<div class="ab-row">
    <div class="ab-cell ab-level">${getIcon(label)}<span>Lv ${row.level}</span></div>
    <div class="ab-cell">${coinText(row.totalCost)}</div>
    <div class="ab-cell">${coinText(row.coins)}${baseLine}</div>
    <div class="ab-cell">${profitText(row.profit)}</div>
  </div>`;
}

function renderCard(animal, boosted, synced) {
  let body;
  if (!synced) {
    body = `<div class="ab-empty">Sync a Farm ID to detect your bounties.</div>`;
  } else if (!animal.rows.length) {
    body = `<div class="ab-empty">No coin bounty for this animal.</div>`;
  } else {
    body = `<div class="ab-row ab-head">
      <div class="ab-cell">Level</div>
      <div class="ab-cell">Cost</div>
      <div class="ab-cell">Bounty</div>
      <div class="ab-cell">Profit / Loss</div>
    </div>${animal.rows.map(r => renderRow(animal.label, r, boosted)).join("")}`;
  }
  return `<div class="es-section ab-card" data-animal="${animal.type}">
    <div class="es-section-title ab-card-title">${getIcon(animal.label)}<span>${animal.label}</span><span class="ab-buy">Buy ${coinText(animal.buyCost)}</span></div>
    ${body}
  </div>`;
}

export function renderAnimalBountyBody() {
  const body = document.getElementById("animalBountyBody");
  if (!body) return;
  const data = computeAnimalBountyTable();
  const boosted = data.multiplier > 1;
  body.innerHTML = `<div class="ab-grid">${data.animals.map(a => renderCard(a, boosted, data.synced)).join("")}</div>`;
}

export function openAnimalBounty() {
  const icon = document.getElementById("animalBountyTitleIcon");
  if (icon && IMAGE_ICONS.Cow) icon.src = IMAGE_ICONS.Cow;
  renderAnimalBountyBody();
  document.getElementById("animalBountyOverlay").classList.add("show");
}

export function closeAnimalBounty() {
  document.getElementById("animalBountyOverlay").classList.remove("show");
}

document.getElementById("animalBountyOpenBtn").addEventListener("click", openAnimalBounty);

document.getElementById("animalBountyCloseBtn").addEventListener("click", closeAnimalBounty);

document.getElementById("animalBountyOverlay").addEventListener("click", e => {
  if (e.target.id === "animalBountyOverlay") closeAnimalBounty();
});
