import type { BoardDocument, BoardNode } from "../../../utils/board";
export type BoardEditorProps = {
  document: BoardDocument;
  onChange: (document: BoardDocument) => void;
  onUpload: (file: File) => Promise<string>;
  assetUrls: Record<string, string>;
  onExit?: () => void;
};
export type Tool = "select" | "pan" | "pen" | "text" | "note" | "rect" | "ellipse";
export type Gesture = {
  pointerId: number;
  mode: "move" | "resize" | "draw" | "pan";
  start: [number, number];
  node?: BoardNode;
  points?: [number, number][];
  scroll?: [number, number];
  preview?: Partial<BoardNode>;
};

