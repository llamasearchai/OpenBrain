export const PREF_VERSION = 1

const VERSION_KEY = 'ob.pref.version'

export function ensurePrefsMigrated() {
  try {
    const raw = localStorage.getItem(VERSION_KEY)
    const v = raw ? parseInt(raw, 10) : 0
    if (!v || v < PREF_VERSION) {
      // Example: remove any deprecated keys here
      // (none currently deprecated beyond Reset Prefs route)
      localStorage.setItem(VERSION_KEY, String(PREF_VERSION))
      console.info(`Preferences migrated to v${PREF_VERSION}`)
    }
  } catch {
    // ignore
  }
}

