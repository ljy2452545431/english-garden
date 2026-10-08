import type { CSSProperties, SVGProps } from "react";
import type { BoardDocument, BoardNode } from "../../utils/board";
import { boardEditorZh as t } from "../../i18n/board-editor";

export function nodeTransform(node: BoardNode) {
  return `translate(${node.x} ${node.y}) rotate(${node.rotation} ${node.width / 2} ${node.height / 2})`;
}
/** points 为 0..1 的局部归一化坐标，缩放笔迹时保持图案。 */
export function NodeDrawing({
  node,
  assetUrls,
}: {
  node: BoardNode;
  assetUrls: Record<string, string>;
}) {
  const { width: w, height: h } = node;
  if (node.kind === "stroke")
    return (
      <polyline
        points={node.points.map(([x, y]) => `${x * w},${y * h}`).join(" ")}
        fill="none"
        stroke={node.color}
        strokeWidth={node.fontSize / 4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  if (node.kind === "ellipse")
    return (
      <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={node.fill} />
    );
  if (node.kind === "rect")
    return <rect width={w} height={h} fill={node.fill} rx={8} />;
  if (node.kind === "image") {
    const url = node.assetId ? assetUrls[node.assetId] : undefined;
    return url && (url.startsWith("blob:") || /^https:\/\//.test(url)) ? (
      <image
        href={url}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
      />
    ) : (
      <>
        <rect width={w} height={h} fill="#E5EBF2" />
        <text
          x={w / 2}
          y={h / 2}
          fill="#536273"
          textAnchor="middle"
          fontSize={18}
        >
          {t.imageMissing}
        </text>
      </>
    );
  }
  const inset = node.kind === "note" ? 20 : 0;
  return (
    <>
      {node.kind === "note" && (
        <rect width={w} height={h} rx={4} fill={node.fill} />
      )}
      <svg width={w} height={h} overflow="hidden">
        <text
          fill={node.color}
          fontSize={node.fontSize}
          fontFamily="system-ui, sans-serif"
        >
          {node.text.split("\n").map((line, index) => (
            <tspan
              key={index}
              x={inset}
              y={inset + node.fontSize * (1 + index * 1.35)}
            >
              {line || " "}
            </tspan>
          ))}
        </text>
      </svg>
    </>
  );
}
export function BoardView({
  document,
  assetUrls,
  style,
  ...props
}: {
  document: BoardDocument;
  assetUrls: Record<string, string>;
  style?: CSSProperties;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={`0 0 ${document.width} ${document.height}`}
      role="img"
      aria-label={t.drawing}
      style={{ width: "100%", display: "block", ...style }}
      {...props}
    >
      <rect
        width={document.width}
        height={document.height}
        fill={document.background}
      />
      {document.nodes.map((node) => (
        <g key={node.id} transform={nodeTransform(node)}>
          <NodeDrawing node={node} assetUrls={assetUrls} />
        </g>
      ))}
    </svg>
  );
}
