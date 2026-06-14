# Asset Optimization Pipeline

In-place asset optimizer that converts, renames, resizes, and updates code references automatically.

## Usage

```bash
node assets-optimization/optimize.js
```

The pipeline runs three passes in order:

1. **Convert & Normalize** — converts assets to optimal formats, normalizes all filenames
2. **Reference Update** — finds and replaces old filenames in source code
3. **Dimension Enforcement** — resizes images that have dimension markers in their filename

## What it does

### Format Conversion

Assets are converted to the smallest viable format. Already-optimal files are skipped.

| Source formats | Target | Engine |
|---|---|---|
| png, jpg, jpeg, gif, bmp, tiff, heic, heif | **webp** | sharp |
| ttf, otf, woff, eot | **woff2** | wawoff2 |
| wav, mp3, flac, aac, m4a, aiff, wma, ogg | **opus** | ffmpeg |
| avi, mov, wmv, flv, mkv, m4v, 3gp | **mp4** | ffmpeg |

Files already in these target formats are skipped: `webp`, `woff2`, `opus`, `svg`, `avif`, `ico`, `webm`.

MP4 files are only re-encoded if they exceed 1280x720 or need container conversion.

### Filename Normalization

Every file processed (converted or skipped) gets its name normalized:

- Spaces, hyphens, and special characters become `_`
- Consecutive underscores collapse to one
- Leading/trailing underscores are stripped
- Everything lowercased
- Extensions lowercased

| Before | After |
|---|---|
| `Deputy Owner.png` | `deputy_owner.webp` |
| `Mod-Daze's File.JPG` | `mod_daze_s_file.webp` |
| `SOME  FILE--name.PNG` | `some_file_name.webp` |
| `already_clean.webp` | `already_clean.webp` |

This makes filenames predictable everywhere — if you know the asset name, you know the path.

### Reference Updating

After conversion and renaming, the pipeline scans all `.js`, `.ts`, `.css`, `.html`, and `.json` files in `main/` and replaces every occurrence of the old filename with the new one.

If `Deputy Owner.png` became `deputy_owner.webp`, every reference in your source code updates automatically.

### Dimension Enforcement

Embed target dimensions directly in the filename using `_w#` and/or `_h#` markers. The pipeline reads the actual image dimensions and resizes if they don't match.

#### Tags

| Tag | Meaning | Example filename |
|---|---|---|
| `_w#` | Target width in pixels | `icon_w32.webp` |
| `_h#` | Target height in pixels | `banner_h120.webp` |
| `_w#_h#` | Both dimensions | `avatar_w64_h64.webp` |
| `_h#_w#` | Both dimensions (order doesn't matter) | `sprite_h16_w16.webp` |

#### Behavior

- **One dimension specified** — resizes to that dimension, auto-calculates the other to preserve aspect ratio
- **Both dimensions specified** — resizes to fit inside the bounding box, preserving aspect ratio
- **Already correct** — skipped, no re-encoding
- **No markers** — skipped entirely

#### Examples

```
logo_w200.webp         Width pinned to 200px, height scales proportionally
banner_h80.webp        Height pinned to 80px, width scales proportionally
rank_w24_h24.webp      Fits inside 24x24, aspect ratio preserved
clan_badge_w128.webp   Width pinned to 128px
```

To use: just rename your file to include the dimension tag before running the pipeline. The normalization pass preserves these markers since they're already `_` delimited and lowercase-safe.

### Caching

Converted files are cached by SHA256 hash in `.cache/sync/`. If a file hasn't changed since the last run, the cached conversion is reused instead of re-encoding. This makes repeat runs fast.

The cache index lives at `.cache/sync/cache-index.json`.

## Configuration

### Source directories

Edit `constants.js` to change which directories are optimized:

```js
export const SYNC_SEND_OPERATIONS = [
    { local: path.resolve(__dirname, "..", "public") },
];
```

### Quality settings

Edit `convertors/constants.js`:

```js
export const QUALITY = {
    imageWebp: 80,          // WebP quality (0-100)
    audioOpusBitrate: "96k", // Opus audio bitrate
    videoCrf: 23,            // H.264 CRF (lower = better quality)
    videoAudioBitrate: "128k",
};

export const VIDEO_MAX = {
    width: 1280,
    height: 720,
};
```

## Dependencies

| Dependency | Purpose | Required |
|---|---|---|
| **sharp** | Image conversion (webp) + dimension enforcement | Yes (for images) |
| **wawoff2** | Font conversion (woff2) | Yes (for fonts) |
| **ffmpeg/ffprobe** | Audio (opus) + video (mp4) conversion | Yes (for audio/video) |

FFmpeg binaries are bundled in `ffmpeg/` — no system install needed. Converters that can't find their engine are skipped gracefully with a warning.

## File Structure

```
assets-optimization/
├── optimize.js                  Entry point
├── constants.js                 Source directory configuration
├── convertors/
│   ├── base-convertor.js        Abstract base class
│   ├── constants.js             Format maps, quality, skip list
│   ├── image-convertor.js       sharp → webp
│   ├── font-convertor.js        wawoff2 → woff2
│   ├── audio-convertor.js       ffmpeg → opus
│   └── video-convertor.js       ffmpeg → mp4
├── lib/
│   ├── assets/
│   │   ├── asset-optimizer.js   Orchestrator: scan → classify → convert → apply
│   │   ├── asset-conversion.js  File conversion + normalization logic
│   │   ├── asset-cache.js       SHA256 hash cache
│   │   └── dimension-enforcer.js  Dimension tag parsing + resize
│   ├── reference-updater.js     Scans source code, replaces old filenames
│   └── notifications/
│       ├── ui-logger.js         Terminal output (progress bars, banners)
│       └── audit-logger.js      File-based audit trail
└── ffmpeg/                      Bundled ffmpeg/ffprobe binaries
```
