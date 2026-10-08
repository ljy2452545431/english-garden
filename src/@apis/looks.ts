import { request } from "@/server";
import type { Appearance } from "../utils/preferences";
export type SharedLook = {
  id: string;
  name: string;
  appearance: Appearance;
  userId: string;
  displayName: string;
  createdAt: string;
};
export const listLooks = (token: string) =>
  request<{ looks: SharedLook[] }>("/api/looks", token);
export const createLook = (
  token: string,
  name: string,
  appearance: Appearance,
) => request<{ look: SharedLook }>("/api/looks", token, { name, appearance });
export const deleteLook = (token: string, id: string) =>
  request<{ deleted: boolean }>(
    `/api/looks/${encodeURIComponent(id)}`,
    token,
    undefined,
    "DELETE",
  );
