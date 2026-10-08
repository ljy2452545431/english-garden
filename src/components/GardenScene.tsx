/** 原创 SVG 插画，无远程图片或字体依赖。 */
export function GardenScene(){return <svg className="garden-scene" viewBox="0 0 450 270" aria-label="两棵小树在花园里一起生长" role="img">
  <defs><linearGradient id="leaf" x2="0" y2="1"><stop stopColor="var(--leaf-light)"/><stop offset="1" stopColor="var(--accent)"/></linearGradient><pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="var(--accent)" opacity=".1"/></pattern></defs>
  <circle cx="234" cy="139" r="122" fill="var(--scene-bg)"/><circle cx="342" cy="62" r="28" fill="var(--sun)"/><rect x="104" y="195" width="282" height="54" rx="27" fill="url(#dots)"/>
  <ellipse cx="233" cy="237" rx="145" ry="14" fill="var(--accent)" opacity=".1"/>
  <g className="sway"><path d="M169 201V127" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"/><path d="M169 154C98 153 110 87 117 82c41 2 55 38 52 72" fill="url(#leaf)"/><path d="M169 136c-4-52 33-72 61-64 8 39-23 66-61 64" fill="var(--leaf-light)"/><path d="m169 152-35-43m35 24 39-43" stroke="var(--scene-bg)" strokeWidth="2" opacity=".6"/></g>
  <g className="sway delayed"><path d="M281 204v-65" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"/><path d="M281 163c-56 2-60-46-53-55 39-3 55 27 53 55" fill="var(--leaf-light)"/><path d="M281 148c-3-42 26-58 49-52 6 32-17 54-49 52" fill="url(#leaf)"/><path d="m281 162-36-36m36 20 31-36" stroke="var(--scene-bg)" strokeWidth="2" opacity=".7"/></g>
  <path d="M139 189h63l-9 43a8 8 0 0 1-8 6h-31a8 8 0 0 1-8-6z" fill="var(--terracotta)"/><rect x="135" y="186" width="71" height="13" rx="6" fill="var(--pot-light)"/>
  <path d="M254 194h55l-8 37a8 8 0 0 1-8 6h-23a8 8 0 0 1-8-6z" fill="var(--terracotta)"/><rect x="251" y="191" width="61" height="12" rx="5" fill="var(--pot-light)"/>
  <path d="M366 213h-36l-7 22h50z" fill="var(--sun)"/><path d="M342 209v-20m0 10c-14 0-13-16-13-16 14 0 13 16 13 16m0-8c0-14 14-12 14-12s-1 14-14 12" fill="var(--accent)"/>
  <g fill="var(--accent)" opacity=".65"><path d="m77 94 3-8 3 8 8 3-8 3-3 8-3-8-8-3z"/><path d="m371 131 2-6 2 6 6 2-6 2-2 6-2-6-6-2z"/></g>
  <path d="m104 174 3-3m270-143 5-2" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"/>
</svg>;}
