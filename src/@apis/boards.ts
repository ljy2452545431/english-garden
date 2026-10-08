import { request, binaryRequest } from "@/server";
import type { BoardDocument, BoardRecord, BoardSummary } from "../utils/board";
export type BoardAsset = {
  id: string;
  userId: string;
  mime: string;
  size: number;
};
export const listBoards = (token: string) =>
  request<{ boards: BoardSummary[] }>("/api/boards", token);
export const loadBoard = (token: string, id: string) =>
  request<{ board: BoardRecord }>(
    `/api/boards/${encodeURIComponent(id)}`,
    token,
  );
export const saveBoard = (
  token: string,
  title: string,
  document: BoardDocument,
  id?: string,
  version?: number,
) =>
  request<{ board: BoardRecord }>(
    id ? `/api/boards/${encodeURIComponent(id)}` : "/api/boards",
    token,
    id ? { title, document, version } : { title, document },
    id ? "PATCH" : "POST",
  );
export const removeBoard = (token: string, id: string) =>
  request<{ deleted: boolean }>(
    `/api/boards/${encodeURIComponent(id)}`,
    token,
    undefined,
    "DELETE",
  );
export const uploadBoardAsset = async (
  token: string,
  blob: Blob,
): Promise<BoardAsset> => {
  const response = await binaryRequest("/api/board-assets", token, blob);
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(result.error?.message ?? "图片上传失败");
  return result.data.asset;
};
export const readBoardAsset = async (
  token: string,
  id: string,
): Promise<Blob> => {
  const response = await binaryRequest(
    `/api/board-assets/${encodeURIComponent(id)}`,
    token,
  );
  if (!response.ok) throw new Error("图片暂时无法读取，请重新打开画布");
  return response.blob();
};

export const listBoardAssets = (token: string) =>
  request<{ assets: BoardAsset[] }>("/api/board-assets", token);
export const removeBoardAsset = (token: string, id: string) =>
  request<{ deleted: boolean }>(
    "/api/board-assets/" + encodeURIComponent(id),
    token,
    undefined,
    "DELETE",
  );
