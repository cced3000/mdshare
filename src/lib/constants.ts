export const APP_NAME = "MDShare";

export const MAX_MARKDOWN_BYTES = 512 * 1024;
export const BURN_GRACE_MINUTES = 10;
export const EDITOR_POLL_INTERVAL_MS = 5000;
export const EDITOR_AUTOSAVE_DEBOUNCE_MS = 1200;

export const EXPIRY_OPTIONS = [
  { hours: 1 },
  { hours: 24 },
  { hours: 24 * 7 },
  { hours: 24 * 30 },
] as const;

export const DEFAULT_EXPIRY_HOURS = 24 * 7;
export const DRAFT_STORAGE_KEY = "mdshare:draft:v1";

export const BURN_MODE_OPTIONS = [
  { value: "OFF" },
  { value: "AFTER_FIRST_VIEW_GRACE" },
  { value: "AFTER_FIRST_VIEW_INSTANT" },
] as const;
