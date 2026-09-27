# Pen to Box

A browser-based [MuJoCo](https://mujoco.org/) simulation of an SO-101 robot placing a pen in a box. The page also shows two short camera recordings and links to the [ACT model](https://huggingface.co/Jacob-Brokloff/act_2026-09-25_15-17-46) and [training dataset](https://huggingface.co/datasets/Jacob-Brokloff/SIO_101_Updated_Pen_Box_Combined_50).

The **Replay demo** button plays recorded joint actions in MuJoCo WebAssembly. The ACT model does **not** run inference in this webpage. The initial scene and joint mapping were fitted from a recorded episode and local SO-101 calibration, so the simulation is an approximation of the physical setup.

## Run locally

Requires Node.js and Python 3.

```sh
npm ci
npm start
```

Open <http://127.0.0.1:8765/>. The local server supplies the cross-origin isolation headers required by the MuJoCo WebAssembly build. Opening `index.html` directly from disk may not work reliably.

The SO-101 model and meshes come from [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie); its license is included at `assets/so101/LICENSE`. No physical robot is controlled by this page.

## Cloudflare Workers Static Assets

The build step packages only the webpage, recorded media, SO-101 assets, and browser dependencies into `dist/`. It excludes local diagnostics and ACT weights. The included `wrangler.jsonc` serves `dist/` as static assets; `_headers` supplies the cross-origin isolation headers needed by MuJoCo WebAssembly.

```sh
npm ci
npm run build
npm run preview:cloudflare
```

When ready to publish to a Cloudflare account, run `npx wrangler deploy`. This repository has not been deployed to Cloudflare. The hosted page still replays recorded actions rather than running the ACT model.
