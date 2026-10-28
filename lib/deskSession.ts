// The desk (app/desk/c) is the landing page: its monitor shows a case study,
// a tap zooms through into it, and the case study's Home icon zooms back out.
// The desk stays mounted behind the case study (see DeskHost), so these hooks
// are plain module state shared within the one loaded bundle.
export const DESK_ROUTE = "/desk/c";

const SESSION_KEY = "desk-session";

// Survives a refresh, so Home still leads back to the desk rather than to the
// stack once someone has entered through it.
export function markDeskSession(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {}
}

export function isDeskSession(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

// The monitor showed the case study at rest, header settled. The page it hands
// off to must start the same way, or the swap visibly replays the settle.
let arrivingFromDesk = false;

export function setArrivingFromDesk(): void {
  arrivingFromDesk = true;
}

export function peekArrivingFromDesk(): boolean {
  return arrivingFromDesk;
}

export function clearArrivingFromDesk(): void {
  arrivingFromDesk = false;
}

// When the desk is not mounted (a refresh on a case study), it reads which
// case study to put back on its monitor from here, and starts zoomed in.
const RETURN_KEY = "desk-return";

export function noteDeskReturn(value: string): void {
  try {
    window.sessionStorage.setItem(RETURN_KEY, value);
  } catch {}
}

export function takeDeskReturn(): string | null {
  try {
    const value = window.sessionStorage.getItem(RETURN_KEY);
    window.sessionStorage.removeItem(RETURN_KEY);
    return value;
  } catch {
    return null;
  }
}

// Going back: the desk loads the case study being left onto its monitor and
// resolves once it is showing, so the route change lands on a matching frame.
type Preparer = (slug: string) => Promise<void>;
let preparer: Preparer | null = null;

export function registerDeskPreparer(prepare: Preparer): () => void {
  preparer = prepare;
  return () => {
    if (preparer === prepare) preparer = null;
  };
}

export function prepareDeskReturn(slug: string): Promise<void> {
  return preparer ? preparer(slug) : Promise.resolve();
}
