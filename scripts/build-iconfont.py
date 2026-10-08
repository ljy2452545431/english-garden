"""从 iconfont 公开开源图标集合提取本项目使用的路径；不保存账户数据。"""
import json
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    9402: "https://www.iconfont.cn/api/collection/detail.json?id=9402",
    23534: "https://www.iconfont.cn/api/collection/detail.json?id=23534",
}
BOTANICAL = {"Sprout": "plant-line", "Leaf": "leaf-line", "Palette": "palette-line", "Sun": "sun-line"}
MAPPING = {
    "Sprout": "plant-line", "Sun": "sun-line", "ArrowUpRight": "arrowright",
    "ArrowRight": "arrowright", "Check": "check", "CalendarDays": "calendar",
    "BookOpen": "read", "Headphones": "customerservice", "Heart": "heart",
    "Palette": "palette-line", "Library": "book", "Lock": "lock", "LogOut": "logout",
    "ChevronLeft": "left", "ChevronRight": "right", "Flame": "fire",
    "Leaf": "leaf-line", "PenLine": "edit", "NotebookPen": "edit-square",
    "Menu": "menu", "X": "close", "Volume2": "sound", "Square": "stop",
    "Mic": "audio", "Languages": "translate", "ArrowUp": "arrowup",
    "ArrowDown": "arrowdown", "Download": "download", "Upload": "upload",
    "CloudUpload": "cloud-upload", "Sparkles": "star", "RotateCcw": "undo",
    "Pause": "pause", "Play": "caret-right", "Send": "send",
    "RefreshCw": "reload", "Trash2": "delete",
}

def main():
    collections = {}
    for collection, source in SOURCES.items():
        with urllib.request.urlopen(source, timeout=30) as response:
            data = json.load(response)["data"]
        if collection == 9402:
            assert data["collection"]["is_official"] == 1
        assert data["collection"]["id"] == collection
        collections[collection] = data
    paths = {}
    references = []
    for alias, name in MAPPING.items():
        collection = 23534 if alias in BOTANICAL else 9402
        by_name = {icon["name"]: icon for icon in collections[collection]["icons"]}
        icon = by_name[name]
        svg = ET.fromstring(icon["show_svg"])
        assert svg.attrib["viewBox"] == "0 0 1024 1024"
        items = []
        for child in svg:
            assert child.tag.endswith("}path")
            assert set(child.attrib) <= {"d", "fill", "opacity", "p-id"}
            # 全部为单色线性路径，渲染时由 currentColor 随主题取色。
            items.append(child.attrib["d"])
        paths[name] = items
        references.append({"component": alias, "name": name, "id": icon["id"], "collection": collection})
    folder = ROOT / "src/components/icons"
    folder.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(paths, ensure_ascii=False, indent=2)
    (folder / "paths.ts").write_text(
        "// 来源：iconfont.cn Ant Design 9402 / Remix Icon 2.5 23534，许可见 docs/icon-sources.md。\n"
        + "export const iconPaths = " + serialized + " as const;\n", encoding="utf-8")
    (ROOT / "docs/iconfont-manifest.json").write_text(json.dumps({
        "sources": [{"url": source, "collection": collection,
                     "collectionName": collections[collection]["collection"]["name"]}
                    for collection, source in SOURCES.items()],
        "icons": references,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    aliases = "\n".join(f"export const {alias} = createIcon('{name}', {23534 if alias in BOTANICAL else 9402}, {str(alias == 'ArrowUpRight').lower()});" for alias, name in MAPPING.items())
    (folder / "index.tsx").write_text("""import type { SVGProps } from 'react';
import { iconPaths } from './paths';

/** 兼容既有图标组件；装饰图标默认隐藏于辅助技术，含 aria-label 时启用语义。 */
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
}

function createIcon(name: keyof typeof iconPaths, collection: 9402 | 23534, diagonal = false) {
  return function IconfontIcon({ size = 24, absoluteStrokeWidth: _absoluteStrokeWidth, strokeWidth: _strokeWidth, children, ...props }: IconProps) {
    const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
    return <svg width={size} height={size} viewBox="0 0 1024 1024" fill="currentColor"
      aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined}
      focusable="false" {...props} data-icon-source={`iconfont:${collection}:${name}`}>
      <g transform={diagonal ? 'rotate(-45 512 512)' : undefined}>
        {iconPaths[name].map((path, index) => <path key={index} d={path} />)}
      </g>
      {children}
    </svg>;
  };
}

""" + aliases + "\n", encoding="utf-8")
    print(f"提取 {len(paths)} 个原始图标，生成 {len(MAPPING)} 个兼容组件。")

if __name__ == '__main__':
    main()
