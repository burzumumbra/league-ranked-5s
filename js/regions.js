/** Ranked 5s schedule per Riot dev blog — weekends, 8 PM – 1 AM in each region's timezone. */
export const REGIONS = [
  { id: "na", code: "NA", name: "North America", tz: "America/Chicago", abbr: "CDT" },
  { id: "euw", code: "EUW", name: "EU West", tz: "Europe/Berlin", abbr: "CEST" },
  { id: "eune", code: "EUNE", name: "EUNE", tz: "Europe/Berlin", abbr: "CEST" },
  { id: "lan", code: "LAN", name: "Latin America North", tz: "America/New_York", abbr: "EDT" },
  { id: "las", code: "LAS", name: "Latin America South", tz: "America/Santiago", abbr: "CLT" },
  { id: "br", code: "BR", name: "Brazil", tz: "America/Sao_Paulo", abbr: "BRT" },
  { id: "oce", code: "OCE", name: "Oceania", tz: "Australia/Sydney", abbr: "AEST" },
  { id: "sea", code: "SEA", name: "Southeast Asia", tz: "Asia/Singapore", abbr: "SGT" },
  { id: "me", code: "ME", name: "Middle East", tz: "Asia/Riyadh", abbr: "AST" },
  { id: "ru", code: "RU", name: "Russia", tz: "Europe/Berlin", abbr: "CEST" },
  { id: "kr", code: "KR", name: "Korea", tz: "Asia/Seoul", abbr: "KST" },
  { id: "jp", code: "JP", name: "Japan", tz: "Asia/Tokyo", abbr: "JST" },
  { id: "tw", code: "TW", name: "Taiwan", tz: "Asia/Taipei", abbr: "CST" },
  { id: "vn", code: "VN", name: "Vietnam", tz: "Asia/Ho_Chi_Minh", abbr: "ICT" },
  { id: "tr", code: "TR", name: "Turkey", tz: "Europe/Istanbul", abbr: "TRT" },
];

export const START_HOUR = 20;
export const END_HOUR = 1;
