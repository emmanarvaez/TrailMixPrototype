// Illustrated stand-in for trails without a photo: a sun, sky and layered hills in TrailMix colors.
// Returned as a data URL so it works anywhere a photo URL does. The palette and hill shapes are
// picked from the trail name, so each trail always gets the same picture.

const palettes = [
  { sky: "#fbf5e8", sun: "#e66a3c", back: "#9bb486", front: "#244f3b" },
  { sky: "#f8dfa6", sun: "#e66a3c", back: "#6d8b68", front: "#173c2d" },
  { sky: "#dce5cf", sun: "#f1bd4e", back: "#9bb486", front: "#244f3b" },
  { sky: "#fde7d2", sun: "#c2571f", back: "#d5a23e", front: "#5a3e2b" },
];

const ridges = [
  ["M0 230 90 120l70 70 80-110 160 150v170H0Z", "M0 290 110 190l90 70 70-60 130 110v90H0Z"],
  ["M0 210 120 90l100 110 60-50 120 100v150H0Z", "M0 300 80 240l120 30 110-90 90 80v140H0Z"],
  ["M0 250 70 170l90 30 100-140 140 170v120H0Z", "M0 280 140 200l80 60 80-30 100 70v120H0Z"],
];

function hash(text: string) {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

export function trailPlaceholder(name: string): string {
  const h = hash(name);
  const color = palettes[h % palettes.length];
  const [back, front] = ridges[(h >>> 3) % ridges.length];
  const sunX = 90 + ((h >>> 6) % 220); // unsigned shifts: h can exceed 2^31
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
<rect width="400" height="400" fill="${color.sky}"/>
<circle cx="${sunX}" cy="105" r="44" fill="${color.sun}" opacity=".9"/>
<path d="${back}" fill="${color.back}"/>
<path d="${front}" fill="${color.front}"/>
<path d="M150 400c20-40 70-50 60-90s40-50 70-60" fill="none" stroke="${color.sky}" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14" opacity=".8"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
