# Media Protection — how assets are protected on docthor.music

_Last updated 2026-07-13. Honest summary first: this site is public and its
repository is public (required for free GitHub Pages). **Anything deployed can
be saved by anyone** — via the browser, network tab, cache, screenshots, screen
recording, or simply cloning the repo. Nothing below changes that. What these
measures actually do: keep valuable originals out of the public entirely,
create ownership evidence, and deter casual misuse._

## What is genuinely protected
- **Master files** (PSDs, raw video renders, lossless masters, unwatermarked
  originals): they are NEVER in this repository. They live in the private local
  workspace under `01_Website/02_Working/` (Photoshop Assets, Headings masters,
  dated video renders) and are backed up by the owner. This is real protection —
  the public can only ever obtain the web derivatives.
- **Personal metadata**: public JPEGs are pipeline-stripped of all EXIF/XMP/
  Photoshop metadata (no camera info, GPS, editing history). Verified: the only
  embedded fields are deliberate ownership fields.

## What is only evidence or deterrent (not protection)
- Ownership EXIF (Copyright/Artist/contact) — trivially removable; useful as
  provenance evidence, not as a lock.
- The press-use notice, footer ©, and Terms — legal deterrents.
- Optional watermarking — raises effort for misuse; determined actors crop/inpaint.
- Optional Cloudflare hotlink rules (docs/CLOUDFLARE_SECURITY.md) — stop lazy
  embedding only; the repo remains clonable.

## How public derivatives are generated
`python3 tools/process-images.py` (from repo root, needs Pillow):
strips ALL metadata from every JPEG under `assets/`, embeds ownership EXIF
(Copyright, Artist, contact), re-encodes at quality 85, and bakes in watermarks
for files opted in via `tools/watermark.conf`.

## How to add a new image safely
1. Keep the master outside the repo (in `02_Working/`).
2. Export a web-sized JPEG/WebP into `assets/…` (photos in `assets/photos/`).
3. Run `python3 tools/process-images.py`.
4. Run `sh tools/audit-assets.sh` — must pass.
5. Commit. The GitHub Action re-runs the audit on push.

## How to opt an image into watermarking
Add its repo-relative path (e.g. `assets/photos/newshot.jpg`) under `TARGETS:`
in `tools/watermark.conf`, tune `OPACITY`/`SCALE`/`POSITION`, re-run the
processing script. Keep the unwatermarked original outside the repo. Never
watermark: logo, heading graphics, UI assets, press-kit editorial files.

## The asset audit
`sh tools/audit-assets.sh` — fails if the tree contains source/master formats,
archives, files > 15 MB, suspicious names (`original`, `master`, `backup`,
`unwatermarked`, …) or media outside `assets/`. Rules: `tools/audit-rules.conf`.
Runs automatically on every push via `.github/workflows/asset-audit.yml`;
`.gitignore` additionally refuses the blocked source formats at commit time.

## How to test metadata stripping
```
python3 -c "from PIL import Image; im=Image.open('assets/photos/about.jpg'); \
print(dict(im.getexif())); print([k for k in im.info if k!='jfif'])"
```
Expected: only tags 0x013B/0x8298/0x010E (Artist/Copyright/Description), no
photoshop/xmp blocks.

## Cloudflare (optional, not active)
See `docs/CLOUDFLARE_SECURITY.md`. Requires moving DNS from Namecheap's
nameservers to Cloudflare (free) — owner decision, not automated.

## Rollback
Every change is a git commit — `git revert <sha>` or restore any prior asset
from history. Processed images replaced the committed derivatives; the true
originals were never in git and are unaffected.

## Unavoidable limitations
Screenshots, screen/audio recording, browser cache saves, network-response
saving, repo cloning, EXIF re-stripping, watermark cropping. The protection
model is: publish only what you are comfortable being copied, keep everything
else out of the deployment entirely.
