# basepaint MCP server

An MCP server that reads the daily [BasePaint](https://basepaint.xyz) canvas, helps an agent choose where to paint (unfinished sketches, open space), previews pixel-art proposals on the live canvas, and encodes them as `paint(day, tokenId, pixels)` payloads. It never signs or sends transactions.

## Setup

```bash
npm run mcp:setup   # from the repo root: installs and builds into mcp/basepaint/dist
```

The repo's `.mcp.json` registers the server as `basepaint`, so Claude Code picks it up when opened at the repo root. For other clients, run `node mcp/basepaint/dist/src/index.js` over stdio.

| Env var | Default | Purpose |
| --- | --- | --- |
| `BASE_RPC_URL` | `mainnet.base.org`, publicnode, drpc | Comma-separated Base RPCs. The endpoint must serve `eth_getLogs`. |
| `BASEPAINT_LOG_CHUNK` | `2000` | Block span per `eth_getLogs` request. The span is split automatically if a provider rejects it. |
| `BASEPAINT_LOG_CONCURRENCY` | `3` | Parallel log requests. |
| `BASEPAINT_PROPOSALS_DIR` | `mcp/basepaint/proposals` | Where proposal files are written. Pixelminter's `/api/proposals` reads the same variable. |
| `PIXELMINTER_URL` | `http://localhost:3000` | Base URL for the "review and commit" links. |

## How the canvas is read

- **chain** (default): replays every `Painted(day, tokenId, author, pixels)` event from `0xBa5e05cb…dAc83` inside the day's time window (`startedAt + (day-1) * epochDuration`). This source can tell unpainted pixels from painted ones and knows who painted each pixel. Results are cached, and later calls only scan new blocks.
- **api** (fallback): reads `basepaint.xyz/api/art/image?day=N&scale=1` and maps each pixel to the palette. This image fills unpainted pixels with palette color 0, so emptiness and authorship are lost.
- Theme, palette and size come from the on-chain metadata registry (`0x5104…aD01`). If that read fails, they come from `basepaint.xyz/api/theme/N`.

## Tools

| Tool | What it does |
| --- | --- |
| `basepaint_status` | Day, theme, palette with its one-char legend (`0-9a-z` = palette index), pixel count, time left. |
| `basepaint_get_canvas` | PNG of the canvas or a region, with coordinate labels and a grid. Unpainted pixels are drawn as a gray checker pattern. |
| `basepaint_get_region_pixels` | Exact pixels of a region (up to 128×128) as text, with rulers. |
| `basepaint_analyze` | Density heatmap, unfinished areas (windows ranked by sparse tiles, e.g. sketch lines), largest open rectangles, color usage, top authors. |
| `basepaint_preview_proposal` | Applies `rects` → `lines` → `ascii` → `pixels` to a copy of the canvas. Returns stats, a `proposalId` and before/after crops. `onlyEmpty` protects other people's work. |
| `basepaint_preview_animation` | Frame-by-frame animation built from named sprites (with `flipX`/`flipY`), rects, lines, ascii and pixels per frame. `hold` repeats a frame. Returns per-frame stats and a contact sheet. |
| `basepaint_encode_proposal` | Re-validates the proposal against the latest canvas, checks brush strength, splits the payload into transactions and writes `<id>.encoded.json` plus a transparent `<id>.png` overlay. For animations, it encodes one `paint()` per frame containing only the pixels that change, in order (`startFrame`/`frameCount` pick a range). |
| `basepaint_brush_info` | Brush owner, strength and pixels used today. |

## Animations and background repair

The first `basepaint_preview_animation` call stores a snapshot of the canvas in `<id>.animation.json`. Revisions made with `replaceId` reuse that snapshot, even after some frames have been painted onchain.

Each frame contains its sprite pixels plus **repairs**: every pixel the previous frame covered and this frame doesn't goes back to its snapshot color. With `loop`, frame 0 also repairs the last frame. As a result, painting frames 0..k in order always shows exactly the original background plus frame k's sprite, with no trails. `test/animation.test.ts` checks this over two loop cycles.

- `repair: 'footprint'` restores every pixel the animation ever covers, in every frame. Frames get bigger but are fully self-contained.
- Unpainted pixels can't be un-painted onchain, so they are restored with palette color 0, which is how BasePaint displays empty pixels. Use `emptyRepair: 'skip'` to leave them. Encoded deltas skip palette-0 repairs on pixels that are still empty.
- If someone else paints inside the footprint after the snapshot, preview and encode report it, because repairs would overwrite that newer work.

In Pixelminter, an animation loads as one editor frame per animation frame, with a shared `AI: <title>` layer and its fps. You can mint the GIF with the Pixelminter button, or select each frame and use Commit To Basepaint in order.

## Reviewing and committing in Pixelminter

Every preview and encode also writes `<id>.proposal.json`, which holds the resolved `[x, y, paletteIndex]` pixels. With `npm run dev` running, open the link from the tool output (`http://localhost:3000/?proposal=<id>`), or pick the proposal in the **AI Proposals** panel. The proposal loads as a new `AI: <title>` layer on the 256×256 grid, over today's canvas and with today's palette. You can edit it there, then use **Commit To Basepaint** → **Mint BP** with your wallet as usual.

Keep in mind that Pixelminter commits every visible layer. The panel warns you when other visible layers have pixels and offers to hide them.

The `basepaint_contribute` prompt walks through the full workflow: status → canvas → analyze → zoom → draft → preview → encode.

Example ASCII proposal. Chars are palette indices, and `.` leaves the pixel untouched:

```json
{
  "onlyEmpty": true,
  "ascii": [{ "x": 70, "y": 158, "rows": ["..0000..", ".098890.", "09888a90", ".000000."] }]
}
```

## Development

```bash
npm --prefix mcp/basepaint test        # builds, then runs node:test suites in test/
npm --prefix mcp/basepaint run typecheck
```
