import type { BoardDocument } from "./board";
export type BoardDraft = {
  title: string;
  document: BoardDocument;
  id?: string;
  version?: number;
};
let opening: Promise<IDBDatabase> | undefined;
function database() {
  if (!opening)
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("english-garden-art-v1", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("drafts");
        db.createObjectStore("images");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        opening = undefined;
        reject(new Error("本机作品存储不可用，请保存到两人作品库或导出图片"));
      };
    });
  return opening;
}
async function access<T>(
  store: string,
  key: string,
  value?: T,
): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      store,
      value === undefined ? "readonly" : "readwrite",
    );
    const request =
      value === undefined
        ? transaction.objectStore(store).get(key)
        : transaction.objectStore(store).put(value, key);
    let result: T | undefined;
    request.onsuccess = () => {
      result = request.result;
    };
    transaction.oncomplete = () =>
      resolve(value === undefined ? result : value);
    transaction.onerror = () =>
      reject(new Error("本机作品存储已满或不可用，请导出图片"));
    transaction.onabort = () => reject(new Error("本机作品保存未完成"));
  });
}
export const readDraft = (owner: string) => access<BoardDraft>("drafts", owner);
export const writeDraft = (owner: string, draft: BoardDraft) =>
  access("drafts", owner, draft);
export const readImage = (owner: string, id: string) =>
  access<Blob>("images", `${owner}:${id}`);
export const writeImage = (owner: string, id: string, blob: Blob) =>
  access("images", `${owner}:${id}`, blob);
