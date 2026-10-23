/**
 * Repositions the "Divel" node in salem_network_layout.json.
 *
 * The Gephi export pins Divel — the Devil, who receives 41 accusations — to
 * the bottom-left corner of the layout lattice, 1,964 units from its nearest
 * neighbour (typical spacing: 27.8). That placement stretches the layout's
 * vertical extent and reads as a data error in the story's first step.
 *
 * The fix snaps Divel to the same lattice as the rest of the export, at the
 * nearest free cell to the centroid of its accusation neighbours, so it sits
 * inside the cloud its edges belong to. Idempotent: run again and it is a
 * no-op. The original file is backed up once, beside the data.
 *
 * Usage:  node fix-divel-position.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, '..', 'data', 'salem_network_layout.json');
const backupPath = join(here, '..', 'data', 'salem_network_layout.backup.json');

const network = JSON.parse(readFileSync(dataPath, 'utf8'));
const nodes = network.nodes;

const divel = nodes.find((n) => n.key === 'Divel');
const before = { x: divel.attributes.x, y: divel.attributes.y };

// Lattice observed in the export: the afflicted girls' column starts at
// (-3072.378, 86.660); neighbouring columns step 25.305 in x, cell rows step
// 27.836 in y.
const ANCHOR = { x: -3072.378, y: 86.66 };
const XS = 25.305;
const YS = 27.836;

const neighbours = [];
for (const e of network.edges) {
	if (e.source === 'Divel') neighbours.push(e.target);
	else if (e.target === 'Divel') neighbours.push(e.source);
}
const cx = neighbours.reduce((s, k) => s + nodes.find((n) => n.key === k).attributes.x, 0) / neighbours.length;
const cy = neighbours.reduce((s, k) => s + nodes.find((n) => n.key === k).attributes.y, 0) / neighbours.length;

const snap = (v, a, s) => a + Math.round((v - a) / s) * s;
let gx = snap(cx, ANCHOR.x, XS);
let gy = snap(cy, ANCHOR.y, YS);

// Walk outward until the cell is free of other nodes.
const occupied = (x, y) =>
	nodes.some((n) => n.key !== 'Divel' && Math.abs(n.attributes.x - x) < 0.01 && Math.abs(n.attributes.y - y) < 0.01);
if (occupied(gx, gy)) gx += XS;
if (occupied(gx, gy)) gy += YS;

if (Math.abs(before.x - gx) < 0.01 && Math.abs(before.y - gy) < 0.01) {
	console.log('already fixed — no change');
	process.exit(0);
}

if (!existsSync(backupPath)) {
	writeFileSync(backupPath, readFileSync(dataPath));
	console.log('backup written:', backupPath);
}

divel.attributes.x = gx;
divel.attributes.y = gy;
writeFileSync(dataPath, JSON.stringify(network, null, '\t') + '\n');

console.log(`Divel: (${before.x}, ${before.y}) -> (${gx}, ${gy})`);
