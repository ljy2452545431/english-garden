import { useEffect, useState } from "react";
import { readBoardAsset } from "../@apis/boards";
import { boardAssetIds, type BoardDocument } from "../utils/board";
import { readImage, writeImage } from "../utils/board-storage";
import { boardStudioText as t } from "../i18n/board-studio";
type Images = { scope: string; urls: Record<string, string>; error: string };
/** 当前账号/作品的图片去重读取，最多三条并行；每次切换释放私密 Blob URL。 */
export function useBoardImages(
  document: BoardDocument,
  owner: string,
  token?: string,
) {
  const ids = boardAssetIds(document).sort().join(",");
  const scope = `${owner}:${token ?? ""}:${ids}`;
  const [images, setImages] = useState<Images>({
    scope: "",
    urls: {},
    error: "",
  });
  useEffect(() => {
    let cancelled = false;
    const made: Record<string, string> = {};
    const pending = ids ? ids.split(",") : [];
    let index = 0,
      error = "";
    setImages({ scope, urls: {}, error });
    async function work() {
      while (index < pending.length && !cancelled) {
        const id = pending[index++];
        try {
          let blob = await readImage(owner, id);
          if (cancelled) return;
          if (!blob) {
            if (!token) throw new Error(t.imageMissing);
            blob = await readBoardAsset(token, id);
            if (cancelled) return;
            await writeImage(owner, id, blob);
            if (cancelled) return;
          }
          made[id] = URL.createObjectURL(blob);
          setImages({ scope, urls: { ...made }, error });
        } catch (cause) {
          if (!cancelled) {
            error = (cause as Error).message;
            setImages({ scope, urls: { ...made }, error });
          }
        }
      }
    }
    void Promise.all(
      Array.from({ length: Math.min(3, pending.length) }, () => work()),
    );
    return () => {
      cancelled = true;
      Object.values(made).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [ids, owner, token, scope]);
  // render 当下即过滤旧账号状态，不依赖 effect 异步清空。
  return images.scope === scope
    ? { urls: images.urls, error: images.error }
    : { urls: {}, error: "" };
}
