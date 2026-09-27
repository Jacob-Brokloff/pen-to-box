import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const files = [
  ['index.html', 'index.html'],
  ['style.css', 'style.css'],
  ['app.js', 'app.js'],
  ['joint-mapping.js', 'joint-mapping.js'],
  ['wood.js', 'wood.js'],
  ['assets/recorded-actions.json', 'assets/recorded-actions.json'],
  ['assets/so101', 'assets/so101'],
  ['media', 'media'],
  ['public/_headers', '_headers'],
  ['node_modules/@mujoco/mujoco/mujoco.js', 'node_modules/@mujoco/mujoco/mujoco.js'],
  ['node_modules/@mujoco/mujoco/mujoco.wasm', 'node_modules/@mujoco/mujoco/mujoco.wasm'],
  ['node_modules/three/build/three.module.js', 'node_modules/three/build/three.module.js'],
  ['node_modules/three/build/three.core.js', 'node_modules/three/build/three.core.js'],
  ['node_modules/three/examples/jsm/controls/OrbitControls.js', 'node_modules/three/examples/jsm/controls/OrbitControls.js'],
  ['node_modules/three/LICENSE', 'node_modules/three/LICENSE'],
];

for (const [source] of files) await stat(join(root, source));
await rm(output, { recursive: true, force: true });
for (const [source, target] of files) {
  const destination = join(output, target);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(root, source), destination, { recursive: true });
}
console.log(`Built static site in ${output}`);
