import type { BoardDocument } from "../../../utils/board";
export type BoardHistory = { past: BoardDocument[]; future: BoardDocument[] };
export function pushHistory(
  history: BoardHistory,
  previous: BoardDocument,
): BoardHistory {
  return { past: [...history.past.slice(-29), previous], future: [] };
}
