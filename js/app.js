import { REGIONS } from "./regions.js";
import {
  formatDuration,
  formatServerWindow,
  formatTime,
  formatWindowInZone,
  getQueueStatus,
  getSupportedTimezones,
  parseDurationSegments,
} from "./schedule.js";
import { formatTimezoneLabel, loadPreferences, savePreferences } from "./storage.js";

const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const els = {
  topbar: document.getElementById("topbar"),
  openSettings: document.getElementById("open-settings"),
  pinnedSummary: document.getElementById("pinned-summary"),
  pinnedRegionCode: document.getElementById("pinned-region-code"),
  pinnedRegionLabel: document.getElementById("pinned-region-label"),
  pinnedTzLabel: document.getElementById("pinned-tz-label"),
  setupCard: document.getElementById("setup-card"),
  userTimezone: document.getElementById("user-timezone"),
  myRegion: document.getElementById("my-region"),
  detectedTimezone: document.getElementById("detected-timezone"),
  useDetected: document.getElementById("use-detected"),
  pinPreferences: document.getElementById("pin-preferences"),
  heroBadge: document.getElementById("hero-badge"),
  heroRegionCode: document.getElementById("hero-region-code"),
  heroRegion: document.getElementById("hero-region"),
  heroCountdownLabel: document.getElementById("hero-countdown-label"),
  heroCountdown: document.getElementById("hero-countdown"),
  heroUserWindow: document.getElementById("hero-user-window"),
  heroServerWindow: document.getElementById("hero-server-window"),
  heroCard: document.getElementById("hero-card"),
  currentUserTime: document.getElementById("current-user-time"),
  regionGrid: document.getElementById("region-grid"),
  regionsToggle: document.getElementById("regions-toggle"),
  drawer: document.getElementById("settings-drawer"),
  drawerBackdrop: document.getElementById("drawer-backdrop"),
  drawerTimezone: document.getElementById("drawer-timezone"),
  drawerRegion: document.getElementById("drawer-region"),
  drawerDetectedTz: document.getElementById("drawer-detected-tz"),
  drawerUseDetected: document.getElementById("drawer-use-detected"),
  closeSettings: document.getElementById("close-settings"),
  savePreferences: document.getElementById("save-preferences"),
};

let prefs = loadPreferences(detectedTimezone, guessRegionFromTimezone(detectedTimezone));

function guessRegionFromTimezone(tz) {
  const map = {
    "America/Chicago": "na",
    "America/Winnipeg": "na",
    "America/Regina": "na",
    "Europe/Berlin": "euw",
    "Europe/Paris": "euw",
    "Europe/Madrid": "euw",
    "Europe/Rome": "euw",
    "Europe/Warsaw": "eune",
    "Europe/Bucharest": "eune",
    "America/New_York": "lan",
    "America/Mexico_City": "lan",
    "America/Bogota": "lan",
    "America/Lima": "lan",
    "America/Santiago": "las",
    "America/Argentina/Buenos_Aires": "las",
    "America/Sao_Paulo": "br",
    "Australia/Sydney": "oce",
    "Australia/Melbourne": "oce",
    "Asia/Singapore": "sea",
    "Asia/Manila": "sea",
    "Asia/Riyadh": "me",
    "Asia/Dubai": "me",
    "Asia/Seoul": "kr",
    "Asia/Tokyo": "jp",
    "Asia/Taipei": "tw",
    "Asia/Ho_Chi_Minh": "vn",
    "Europe/Istanbul": "tr",
    "Europe/Moscow": "ru",
  };

  return map[tz] ?? "na";
}

function getRegion(id) {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

function populateSelect(select, zones, selectedValue, isRegion = false) {
  if (isRegion) {
    select.innerHTML = REGIONS.map(
      (r) => `<option value="${r.id}">${r.code} — ${r.name}</option>`
    ).join("");
    select.value = REGIONS.some((r) => r.id === selectedValue) ? selectedValue : REGIONS[0].id;
    return;
  }

  select.innerHTML = zones
    .map((tz) => `<option value="${tz}">${formatTimezoneLabel(tz)}</option>`)
    .join("");
  select.value = zones.includes(selectedValue) ? selectedValue : detectedTimezone;
}

function syncSelects() {
  const zones = getSupportedTimezones();
  populateSelect(els.userTimezone, zones, prefs.timezone);
  populateSelect(els.myRegion, null, prefs.region, true);
  populateSelect(els.drawerTimezone, zones, prefs.timezone);
  populateSelect(els.drawerRegion, null, prefs.region, true);
}

function readSetupForm() {
  return {
    timezone: els.userTimezone.value,
    region: els.myRegion.value,
  };
}

function readDrawerForm() {
  return {
    timezone: els.drawerTimezone.value,
    region: els.drawerRegion.value,
  };
}

function applyPreferences({ timezone, region, pinned }) {
  prefs = { timezone, region, pinned };
  savePreferences(prefs);
  syncSelects();
  updateLayout();
  render();
}

function updateLayout() {
  const pinned = prefs.pinned;

  els.setupCard.hidden = pinned;
  els.openSettings.hidden = !pinned;
  els.pinnedSummary.hidden = !pinned;
  els.heroCard.hidden = !pinned;
  els.regionsToggle.hidden = !pinned;

  if (pinned) {
    const region = getRegion(prefs.region);
    els.pinnedRegionCode.textContent = region.code;
    els.pinnedRegionLabel.textContent = region.name;
    els.pinnedTzLabel.textContent = formatTimezoneLabel(prefs.timezone);
  }
}

function renderCountdownSegments(ms) {
  const { days, hours, minutes, seconds } = parseDurationSegments(ms);
  const units = [
    days > 0 && { value: days, label: "days" },
    { value: hours, label: "hrs" },
    { value: minutes.toString().padStart(2, "0"), label: "min" },
    { value: seconds.toString().padStart(2, "0"), label: "sec" },
  ].filter(Boolean);

  return units
    .map(
      (unit) => `
        <div class="segment">
          <span class="segment__value">${unit.value}</span>
          <span class="segment__unit">${unit.label}</span>
        </div>`
    )
    .join("");
}

function openDrawer() {
  syncSelects();
  els.drawer.classList.add("drawer--open");
  els.drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  els.drawerTimezone.focus();
}

function closeDrawer() {
  els.drawer.classList.remove("drawer--open");
  els.drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
}

function renderRegionCard(region, now, userZone) {
  const status = getQueueStatus(now, region.tz);
  const isSelected = region.id === prefs.region;
  const userWindow = formatWindowInZone(region.tz, userZone);
  const serverWindow = formatServerWindow(region.abbr);
  const countdownLabel = status.open ? "Closes in" : "Opens in";
  const countdownValue = status.nextEvent
    ? formatDuration(status.nextEvent - now)
    : "—";

  return `
    <article class="region-card ${status.open ? "region-card--open" : ""} ${isSelected ? "region-card--selected" : ""}" data-region="${region.id}">
      <div class="region-card__top">
        <div class="region-card__identity">
          <span class="region-card__code">${region.code}</span>
          <h3 class="region-card__name">${region.name}</h3>
        </div>
        <span class="badge ${status.open ? "badge--open badge--pulse" : "badge--closed"}">${status.open ? "LIVE" : "Closed"}</span>
      </div>
      <p class="region-card__countdown"><span>${countdownLabel}</span> <strong>${countdownValue}</strong></p>
      <dl class="region-card__meta">
        <div>
          <dt>Your time</dt>
          <dd>${userWindow}</dd>
        </div>
        <div>
          <dt>Server</dt>
          <dd>${serverWindow}</dd>
        </div>
      </dl>
    </article>
  `;
}

function renderHero(region, now, userZone) {
  const status = getQueueStatus(now, region.tz);

  els.heroRegionCode.textContent = region.code;
  els.heroRegion.textContent = region.name;
  els.heroBadge.textContent = status.open ? "QUEUE LIVE" : "QUEUE CLOSED";
  els.heroBadge.className = `badge ${status.open ? "badge--open badge--pulse" : "badge--closed"}`;
  els.heroCard.classList.toggle("hero--open", status.open);

  if (status.nextEvent) {
    const verb = status.open ? "Closes in" : "Opens in";
    els.heroCountdownLabel.textContent = verb;
    els.heroCountdown.innerHTML = renderCountdownSegments(status.nextEvent - now);
    els.heroCountdown.setAttribute("aria-label", `${verb} ${formatDuration(status.nextEvent - now)}`);
  } else {
    els.heroCountdownLabel.textContent = "Unavailable";
    els.heroCountdown.innerHTML = "";
  }

  els.heroUserWindow.textContent = formatWindowInZone(region.tz, userZone);
  els.heroServerWindow.textContent = formatServerWindow(region.abbr);
  els.currentUserTime.textContent = formatTime(now, userZone, {
    weekday: true,
    timeZoneName: "short",
  });
}

function render(now = new Date()) {
  if (!prefs.pinned) return;

  const region = getRegion(prefs.region);
  renderHero(region, now, prefs.timezone);
  els.regionGrid.innerHTML = REGIONS.map((r) =>
    renderRegionCard(r, now, prefs.timezone)
  ).join("");
}

function bindEvents() {
  els.useDetected.addEventListener("click", () => {
    els.userTimezone.value = detectedTimezone;
  });

  els.drawerUseDetected.addEventListener("click", () => {
    els.drawerTimezone.value = detectedTimezone;
  });

  els.pinPreferences.addEventListener("click", () => {
    const { timezone, region } = readSetupForm();
    applyPreferences({ timezone, region, pinned: true });
  });

  els.savePreferences.addEventListener("click", () => {
    const { timezone, region } = readDrawerForm();
    applyPreferences({ timezone, region, pinned: true });
    closeDrawer();
  });

  els.openSettings.addEventListener("click", openDrawer);
  els.closeSettings.addEventListener("click", closeDrawer);
  els.drawerBackdrop.addEventListener("click", closeDrawer);

  els.regionGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-region]");
    if (!card) return;
    applyPreferences({
      timezone: prefs.timezone,
      region: card.dataset.region,
      pinned: true,
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.drawer.classList.contains("drawer--open")) {
      closeDrawer();
    }
  });
}

function init() {
  els.detectedTimezone.textContent = formatTimezoneLabel(detectedTimezone);
  els.drawerDetectedTz.textContent = formatTimezoneLabel(detectedTimezone);
  syncSelects();
  bindEvents();
  updateLayout();
  render();
  setInterval(() => render(), 1000);
}

init();
