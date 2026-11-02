// Uses the pinned emulator's public APIs. Never removes or rewrites a cartridge.
// Kept self-contained so the player can inline the same tested function.
export function createDatakinSave(getCore, report) {
  let pending = null, requested = false, captureRequested = false;
  return function saveProgress(capture = true) {
    const core = getCore();
    if (!core) return Promise.resolve(false);
    requested = true;
    captureRequested ||= capture;
    if (pending) return pending;
    pending = Promise.resolve().then(async () => {
      report('Saving progress on this browser…');
      do {
        const snapshot = captureRequested;
        requested = captureRequested = false;
        if (snapshot && !core.forceAutoSaveState()) throw new Error('Snapshot failed.');
        await core.FSSync();
      } while (requested);
      report('Saved on this browser. You can reload now.');
      return true;
    }).catch(() => {
      report('Progress could not be saved on this browser. Keep this page open and pause again to retry.');
      return false;
    }).finally(() => { pending = null; });
    return pending;
  };
}
