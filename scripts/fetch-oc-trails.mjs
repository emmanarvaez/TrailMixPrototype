#!/usr/bin/env node
// Fetches named hiking trails in Orange County, CA from OpenStreetMap (Overpass API)
// and writes supabase/003_oc_trails.sql. It never connects to Supabase and needs no keys.
//
//   node scripts/fetch-oc-trails.mjs                 fetch from Overpass and write the SQL
//   node scripts/fetch-oc-trails.mjs --cache <dir>   also save/reuse raw Overpass responses in <dir>
//
// Trail data © OpenStreetMap contributors, available under the ODbL (https://www.openstreetmap.org/copyright).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "TrailMix-prototype/1.0 (https://github.com/emmanarvaez/TrailMixPrototype)";
// Orange County, CA (south, west, north, east). A rectangle, so it also clips small edges of
// neighbouring counties (e.g. Chino Hills, the Riverside side of the Santa Ana Mountains).
const OC_BBOX = [33.38, -118.13, 33.95, -117.41];
const MIN_MILES = 0.3;
const SAME_TRAIL_KM = 0.4; // same-named ways closer than this are treated as one trail
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "003_oc_trails.sql");

const cacheFlag = process.argv.indexOf("--cache");
const cacheDir = cacheFlag !== -1 ? process.argv[cacheFlag + 1] : null;

// ─── Overpass ────────────────────────────────────────────────────────────────

async function overpass(query) {
  const key = createHash("sha1").update(query).digest("hex").slice(0, 12);
  const cacheFile = cacheDir && join(cacheDir, `overpass-${key}.json`);
  if (cacheFile && existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, "utf8"));

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) {
      const json = await response.json();
      if (cacheFile) {
        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(cacheFile, JSON.stringify(json));
      }
      return json;
    }
    // 429/504 mean the public server is busy: wait and retry
    if ((response.status === 429 || response.status === 504) && attempt < 3) {
      console.warn(`Overpass busy (${response.status}), retrying in ${attempt * 20}s…`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 20_000));
      continue;
    }
    throw new Error(`Overpass request failed: ${response.status} ${await response.text()}`);
  }
}

const bbox = OC_BBOX.join(",");

const TRAILS_QUERY = `[out:json][timeout:300][bbox:${bbox}];
(
  relation["route"="hiking"]["name"];
  way["highway"~"^(path|footway|track)$"]["name"];
);
out body geom;`; // "body" (not "tags") so relations include their member ways

// Parks and protected areas (as bounding boxes) and city/town points, for each trail's "area"
const PLACES_QUERY = `[out:json][timeout:180][bbox:${bbox}];
(
  nwr["leisure"~"^(park|nature_reserve)$"]["name"];
  nwr["boundary"~"^(protected_area|national_park)$"]["name"];
  node["place"~"^(city|town)$"]["name"];
);
out tags bb;`;

// ─── Geometry ────────────────────────────────────────────────────────────────

const toRad = (deg) => (deg * Math.PI) / 180;

function km(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(h));
}

const lineKm = (points) => points.slice(1).reduce((sum, point, i) => sum + km(points[i], point), 0);
const KM_PER_MILE = 1.609344;

// ─── Which ways count as trails ──────────────────────────────────────────────

const UNPAVED = /^(dirt|earth|ground|gravel|fine_gravel|compacted|sand|grass|rock|pebblestone|unpaved|mud|woodchips)$/;
const TRAIL_WORDS = /\b(trail|trl|loop|ridge|canyon|fire road|truck trail|motorway|peak|falls|nature|wilderness)\b/i;
// Ways named after a whole park, or plain utility roads, aren't trails someone would log
const NOT_A_TRAIL = /^(access|service|maintenance|utility) road$|\b(park|preserve|reserve|open space|wilderness)$/i;
const STREET_NAME = /\b(ave|avenue|st|street|blvd|boulevard|rd|road|dr|drive|way|ln|lane|pkwy|parkway|ct|court|pl|place|cir|circle)\.?$/i;

function isTrailWay(tags) {
  if (!tags.name || NOT_A_TRAIL.test(tags.name.trim())) return false;
  if (/^(sidewalk|crossing|access_aisle|traffic_island)$/.test(tags.footway ?? "")) return false;
  if (/^(private|no)$/.test(tags.access ?? "") || /^(private|no)$/.test(tags.foot ?? "")) return false;
  // Named footways along streets are sidewalks that were never tagged as such
  if (tags.highway === "footway" && STREET_NAME.test(tags.name) && !TRAIL_WORDS.test(tags.name)) return false;
  return Boolean(
    tags.sac_scale || tags.trail_visibility || tags["mtb:scale"] || UNPAVED.test(tags.surface ?? "") || TRAIL_WORDS.test(tags.name),
  );
}

// OSM's hiking difficulty scale; trails without it get no difficulty rather than a guess
const SAC_DIFFICULTY = {
  hiking: "Easy",
  mountain_hiking: "Moderate",
  demanding_mountain_hiking: "Hard",
  alpine_hiking: "Hard",
  demanding_alpine_hiking: "Hard",
  difficult_alpine_hiking: "Hard",
};

const cleanName = (name) => name.trim().replace(/\s+/g, " ");

// ─── Build trails ────────────────────────────────────────────────────────────

function buildTrails(elements) {
  const ways = elements.filter((el) => el.type === "way" && el.geometry?.length > 1);
  const relations = elements.filter((el) => el.type === "relation");
  const usedWays = new Set();
  const trails = [];

  // Hiking route relations are already one trail each
  for (const relation of relations) {
    const name = cleanName(relation.tags.name);
    const lines = relation.members
      .filter((member) => member.type === "way" && member.geometry?.length > 1)
      .map((member) => member.geometry);
    if (!lines.length) continue;
    for (const member of relation.members) if (member.type === "way") usedWays.add(member.ref);
    trails.push({
      name,
      osmId: `relation/${relation.id}`,
      miles: lines.reduce((sum, line) => sum + lineKm(line), 0) / KM_PER_MILE,
      start: lines[0][0],
      difficulty: SAC_DIFFICULTY[relation.tags.sac_scale] ?? null,
    });
  }

  // Remaining trail ways, grouped by name, then split into clusters of ways that actually touch
  const byName = new Map();
  for (const way of ways) {
    if (usedWays.has(way.id) || !isTrailWay(way.tags)) continue;
    const name = cleanName(way.tags.name);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(way);
  }

  for (const [name, group] of byName) {
    const parent = group.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const ends = (way) => [way.geometry[0], way.geometry[way.geometry.length - 1]];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const near = ends(group[i]).some((a) => ends(group[j]).some((b) => km(a, b) < SAME_TRAIL_KM));
        if (near) parent[find(i)] = find(j);
      }
    }
    const clusters = new Map();
    group.forEach((way, i) => {
      const root = find(i);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root).push(way);
    });

    for (const cluster of clusters.values()) {
      const lengths = cluster.map((way) => lineKm(way.geometry));
      const longest = cluster[lengths.indexOf(Math.max(...lengths))];
      // Start at a trailhead: an endpoint that doesn't join another segment of the same trail
      const endpoints = cluster.flatMap(ends);
      const trailhead =
        endpoints.find((point) => endpoints.filter((other) => km(point, other) < 0.02).length === 1) ?? longest.geometry[0];
      // Most common sac_scale along the trail, weighted by length
      const sacMiles = {};
      cluster.forEach((way, i) => {
        const sac = way.tags.sac_scale;
        if (sac) sacMiles[sac] = (sacMiles[sac] ?? 0) + lengths[i];
      });
      const sac = Object.entries(sacMiles).sort((a, b) => b[1] - a[1])[0]?.[0];
      trails.push({
        name,
        osmId: `way/${longest.id}`,
        miles: lengths.reduce((sum, length) => sum + length, 0) / KM_PER_MILE,
        start: trailhead,
        difficulty: SAC_DIFFICULTY[sac] ?? null,
      });
    }
  }

  return trails.filter((trail) => trail.miles >= MIN_MILES);
}

// ─── Area: smallest park containing the trailhead, else the nearest city ─────

function addAreas(trails, places) {
  const parks = places
    // Marine protected areas hug the coast and would wrongly claim beach-side trailheads
    .filter((el) => el.bounds && (el.tags.leisure || el.tags.boundary) && !/marine/i.test(el.tags.name))
    .map((el) => ({
      name: cleanName(el.tags.name),
      ...el.bounds,
      size: (el.bounds.maxlat - el.bounds.minlat) * (el.bounds.maxlon - el.bounds.minlon),
    }));
  const cities = places.filter((el) => el.type === "node" && el.tags.place).map((el) => ({ name: el.tags.name, lat: el.lat, lon: el.lon }));

  for (const trail of trails) {
    const { lat, lon } = trail.start;
    const park = parks
      .filter((p) => p.name !== trail.name && lat >= p.minlat && lat <= p.maxlat && lon >= p.minlon && lon <= p.maxlon)
      .sort((a, b) => a.size - b.size)[0];
    const city = cities
      .map((c) => ({ ...c, dist: km(trail.start, c) }))
      .filter((c) => c.dist < 15)
      .sort((a, b) => a.dist - b.dist)[0];
    trail.area = park?.name ?? city?.name ?? null;
  }
}

// Names that say nothing on their own in a search list, so they always get their area
const GENERIC_NAME = /^(fire road|horse trail|equestrian trail|bike path|service road|nature (loop|trail)|loop trail|community trail|main trail|trail [a-z0-9])$/i;

// Trail names must be unique in the table: the longest trail keeps the plain name,
// others with the same name get their area added, e.g. "Ridge Trail (Laguna Coast Wilderness Park)"
function makeNamesUnique(trails) {
  for (const trail of trails) if (GENERIC_NAME.test(trail.name) && trail.area) trail.name = `${trail.name} (${trail.area})`;

  const groups = new Map();
  for (const trail of trails) {
    const key = trail.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(trail);
  }
  const taken = new Set();
  for (const group of groups.values()) {
    group.sort((a, b) => b.miles - a.miles);
    group.forEach((trail, i) => {
      let name = i === 0 || !trail.area ? trail.name : `${trail.name} (${trail.area})`;
      for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${trail.name} (${n})`;
      trail.name = name;
      taken.add(name.toLowerCase());
    });
  }
}

// ─── SQL ─────────────────────────────────────────────────────────────────────

const sqlText = (value) => (value == null ? "null" : `'${String(value).replace(/'/g, "''")}'`);

function toSql(trails) {
  const rows = trails.map((t) =>
    `  (${[
      sqlText(t.name),
      sqlText(t.area),
      t.miles.toFixed(1),
      "null", // elevation gain: OSM doesn't have it, so it stays empty
      sqlText(t.difficulty),
      t.start.lat.toFixed(6),
      t.start.lon.toFixed(6),
      sqlText(t.osmId),
      "'osm'",
    ].join(", ")})`,
  );

  return `-- TrailMix migration 003: real Orange County trails from OpenStreetMap
-- Generated by scripts/fetch-oc-trails.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand; re-run the script.
-- Trail data © OpenStreetMap contributors, available under the ODbL (https://www.openstreetmap.org/copyright).
--
-- ${trails.length} trails. Existing trails are never deleted. A trail whose name already exists keeps its id
-- (so hike_logs stay linked) and gets OSM's distance, location and id; its elevation, photo and area are kept.
-- Distances are the trail's own length in miles (not round trip). Elevation is left empty: OSM doesn't record it.
-- Safe to run more than once.

begin;

-- Columns used by these trails (area and the numeric types match 002_save_hikes.sql)
alter table trails add column if not exists area text;
alter table trails add column if not exists osm_id text;
alter table trails add column if not exists latitude double precision;
alter table trails add column if not exists longitude double precision;
alter table trails add column if not exists source text;

alter table trails
  alter column distance type numeric(5,1)
  using nullif(regexp_replace(distance::text, '[^0-9.]', '', 'g'), '')::numeric;
alter table trails
  alter column elevation type integer
  using nullif(regexp_replace(elevation::text, '[^0-9]', '', 'g'), '')::integer;

create unique index if not exists trails_name_key on trails(name);
create unique index if not exists trails_osm_id_key on trails(osm_id);

-- Trails added by hand before this import
update trails set source = 'seed' where source is null;

insert into trails (name, area, distance, elevation, difficulty, latitude, longitude, osm_id, source) values
${rows.join(",\n")}
on conflict (name) do update set
  distance   = excluded.distance,
  latitude   = excluded.latitude,
  longitude  = excluded.longitude,
  osm_id     = excluded.osm_id,
  difficulty = coalesce(excluded.difficulty, trails.difficulty),
  area       = coalesce(trails.area, excluded.area),
  source     = 'osm';

commit;
`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log("Fetching trails from Overpass (this can take a minute)…");
const trailData = await overpass(TRAILS_QUERY);
console.log(`  ${trailData.elements.length} OSM elements`);
console.log("Fetching parks and cities…");
const placeData = await overpass(PLACES_QUERY);
console.log(`  ${placeData.elements.length} OSM elements`);

const trails = buildTrails(trailData.elements);
addAreas(trails, placeData.elements);
makeNamesUnique(trails);
trails.sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(OUTPUT, toSql(trails));
const withDifficulty = trails.filter((t) => t.difficulty).length;
const withArea = trails.filter((t) => t.area).length;
console.log(`\nWrote ${trails.length} trails to ${OUTPUT}`);
console.log(`  ${withArea} with an area, ${withDifficulty} with a difficulty (from sac_scale), ${trails.filter((t) => t.osmId.startsWith("relation")).length} from hiking route relations`);
