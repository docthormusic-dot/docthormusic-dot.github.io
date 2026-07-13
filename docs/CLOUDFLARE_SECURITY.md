# Optional Cloudflare hardening for docthor.music

_Not active. Prerequisite: switch the domain's nameservers from Namecheap to
Cloudflare (free plan) and proxy the site. This does not change hosting —
GitHub Pages stays the origin. These headers improve security posture; **they
do not prevent anyone from downloading public images.**_

## Security headers (Cloudflare → Rules → Transform Rules / or a Worker)

Deploy CSP in **report-only** first, watch the console for a few days, then enforce.

```
Content-Security-Policy-Report-Only:
  default-src 'none';
  script-src 'self' https://w.soundcloud.com;
  frame-src https://w.soundcloud.com;
  img-src 'self' data: https://*.sndcdn.com;
  media-src 'self';
  style-src 'self';
  font-src 'self';
  connect-src 'self';
  manifest-src 'self';
  base-uri 'none';
  form-action 'none';
  frame-ancestors 'none'
```

Domain rationale (verified against the actual source, 2026-07-13):
- `w.soundcloud.com` — the consent-gated player iframe + its Widget API script
- `*.sndcdn.com` — track artwork images loaded by the player UI after consent
- everything else is self-hosted (fonts, GSAP, media); there are no analytics
- `data:` in img-src — the film-grain SVG background is a data URI

Also set:
```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```
(`frame-ancestors 'none'` in the CSP replaces X-Frame-Options.)

## Hotlink protection (optional, narrow)

Scope a rule to promotional photos ONLY: `docthor.music/assets/photos/*`

Allow: referer contains `docthor.music` or `www.docthor.music`; empty referer
(direct navigation, privacy browsers — blocking it breaks legitimate visitors);
verified search/social crawlers if using Cloudflare's known-bots list.

Do NOT apply to: `/assets/og.jpg` (social preview cards must fetch it),
anything the press kit needs, or SoundCloud-related resources.

Limitations: referer headers are trivially spoofed and often stripped by
privacy tools; this only stops lazy `<img src=…>` embedding on other sites.
The public GitHub repo remains clonable regardless.

## Explicitly not recommended
Aggressive bot fighting, CAPTCHAs, or rate limiting without evidence of abuse —
they would risk press access, social preview crawlers, accessibility tools and
search indexing for zero real protection.
