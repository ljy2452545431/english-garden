import { useEffect, useRef, useState } from "react";
import { readBoardAsset } from "../@apis/boards";
import { boardAssetIds, type BoardDocument } from "../utils/board";
import { readImage, writeImage } from "../utils/board-storage";
import {
  createBoardImageCache,
  type ImageSnapshot,
} from "../utils/board-image-cache";
import { boardStudioText as t } from "../i18n/board-studio";
type Images = ImageSnapshot & { scope: string };
/** 同账号/令牌中仅增量读取新增图片；切换身份及卸载释放全部私密 URL。 */
export function useBoardImages(
  document: BoardDocument,
  owner: string,
  token?: string,
) {
  const ids = boardAssetIds(document).sort().join(","),
    scope = `${owner}:${token ?? ""}`;
  const cache = useRef<ReturnType<typeof createBoardImageCache> | null>(null);
  const [images, setImages] = useState<Images>({
    scope: "",
    urls: {},
    error: "",
  });
  useEffect(() => {
    const current = createBoardImageCache({
      load: async (id, active) => {
        let blob = await readImage(owner, id);
        if (!active()) return new Blob();
        if (!blob) {
          if (!token) throw new Error(t.imageMissing);
          blob = await readBoardAsset(token, id);
          if (active()) await writeImage(owner, id, blob);
        }
        return blob;
      },
      publish: (value) => setImages({ ...value, scope }),
    });
    cache.current = current;
    setImages({ scope, urls: {}, error: "" });
    return () => {
      current.dispose();
      if (cache.current === current) cache.current = null;
    };
  }, [owner, token, scope]);
  useEffect(() => {
    cache.current?.update(ids ? ids.split(",") : []);
  }, [ids, scope]);
  // 新身份/移除图片当次 render 就过滤，避免 effect 执行前显示旧私密内容。
  const desired = new Set(ids ? ids.split(",") : []);
  return images.scope === scope
    ? {
        urls: Object.fromEntries(
          Object.entries(images.urls).filter(([id]) => desired.has(id)),
        ),
        error: images.error,
      }
    : { urls: {}, error: "" };
}
