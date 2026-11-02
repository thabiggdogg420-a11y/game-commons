export const GENRES = ["Arcade", "Puzzle", "Strategy", "Adventure", "Simulation", "Other"];
export const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
export type Game = {
  id: string; title: string; description: string; creator: string; genre: string;
  tags: string[]; controls: string; license: string; attribution: string;
  parentId: string | null; parentVersion: number | null; createdAt: string; updatedAt: string;
  latestVersion: number; savedVersion?:number; starter?: boolean; canEdit?: boolean; withdrawnAt?: string | null; moderatedAt?: string | null; moderationReason?:string|null;
};
export type Upload = { title: string; description: string; creator: string; genre: string; tags: string[]; controls: string; source: string; attribution: string; parentId: string | null; parentVersion: number | null; notes: string };
export function validateUpload(input: Record<string, unknown>): Upload {
  const read = (key: string, min: number, max: number) => {
    const value = typeof input[key] === "string" ? (input[key] as string).trim() : "";
    if (value.length < min || value.length > max) throw new Error(`${key}: use ${min}–${max} characters.`);
    return value;
  };
  if (input.rightsConfirmed !== true) throw new Error("Confirm that you can license the code and all included assets under MIT.");
  const source = read("source", 30, MAX_SOURCE_BYTES);
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES) throw new Error("The HTML file must be 2 MB or smaller.");
  if (!/<(?:!doctype\s+html|html|canvas|body)[\s>]/i.test(source)) throw new Error("Upload a complete HTML game.");
  if (/<(?:script|link)\b[^>]*(?:src|href)\s*=\s*["']?(?:https?:|\/\/)/i.test(source)) throw new Error("Bundle scripts and styles into the HTML file. External libraries cannot load in the preview.");
  const genre = read("genre", 2, 30);
  if (!GENRES.includes(genre)) throw new Error("Choose a supported genre.");
  const tags = Array.isArray(input.tags) ? input.tags.filter((t): t is string => typeof t === "string").map(t => t.trim().toLowerCase()).filter(Boolean) : [];
  if (tags.length > 8 || tags.some(t => t.length > 32)) throw new Error("Use up to 8 tags, each 32 characters or fewer.");
  const parentId = typeof input.parentId === "string" && input.parentId ? input.parentId : null;
  if (parentId && !/^[a-zA-Z0-9-]{1,80}$/.test(parentId)) throw new Error("Invalid parent game.");
  if (parentId && (!Number.isSafeInteger(input.parentVersion) || Number(input.parentVersion) < 1)) throw new Error("Choose an explicit positive parent version for this remix.");
  if (!parentId && input.parentVersion != null) throw new Error("A parent version requires a parent game.");
  return { title: read("title", 3, 80), description: read("description", 20, 1200), creator: read("creator", 2, 60), genre, tags: [...new Set(tags)], controls: read("controls", 3, 400), attribution: read("attribution", 3, 1000), source, parentId, parentVersion: parentId && Number.isInteger(input.parentVersion) ? Number(input.parentVersion) : null, notes: typeof input.notes === "string" ? input.notes.slice(0, 400) : "First contribution" };
}
export function searchGames(games: Game[], q = "", genre = "All") {
  const stop = new Set(["a","an","the","game","games","with","i","want","to","play","me","find","some","something","and","for","of","like"]);
  const terms = q.toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter(t => t && !stop.has(t));
  return games.filter(g => genre === "All" || g.genre === genre).map(g => {
    const haystack = `${g.title} ${g.description} ${g.genre} ${g.tags.join(" ")} ${g.controls}`.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    return {g, score};
  }).filter(r => !terms.length || r.score > 0).sort((a,b) => b.score - a.score || b.g.updatedAt.localeCompare(a.g.updatedAt)).map(r => r.g);
}
export const PREVIEW_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
export function sandboxDocument(source: string) {
  // The policy appears before all uploaded markup; the opaque iframe origin is the second boundary.
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}"><meta name="referrer" content="no-referrer">${source}`;
}
