const KEYS = {
  timezone: "ranked5s-timezone",
  region: "ranked5s-region",
  pinned: "ranked5s-pinned",
};

export function loadPreferences(detectedTimezone, defaultRegion) {
  const timezone = localStorage.getItem(KEYS.timezone) || detectedTimezone;
  const region = localStorage.getItem(KEYS.region) || defaultRegion;
  let pinned = localStorage.getItem(KEYS.pinned) === "true";

  if (!pinned && localStorage.getItem(KEYS.timezone) && localStorage.getItem(KEYS.region)) {
    pinned = true;
    localStorage.setItem(KEYS.pinned, "true");
  }

  return { timezone, region, pinned };
}

export function savePreferences({ timezone, region, pinned }) {
  localStorage.setItem(KEYS.timezone, timezone);
  localStorage.setItem(KEYS.region, region);
  localStorage.setItem(KEYS.pinned, pinned ? "true" : "false");
}

export function formatTimezoneLabel(tz) {
  return tz.replaceAll("_", " ");
}
