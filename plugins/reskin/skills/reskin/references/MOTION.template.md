# MOTION.md — <reference name>

> The "feel" spec — what DESIGN.md can't capture. Only reliable from a LIVE url.
> Source: <url> · Captured: <date>

## Animation stack (detected)
- Library: [ ] CSS only  [ ] Framer Motion  [ ] GSAP (+ScrollTrigger)  [ ] Lenis (smooth scroll)  [ ] Lottie  [ ] Three.js / WebGL  [ ] other:
- Evidence (window globals / network reqs / class signatures):
- Smooth-scroll present? library + settings:

## Motion language
- Default easing curve(s) (cubic-bezier / spring config):
- Default durations (fast / base / slow, in ms):
- Stagger pattern (delay between items):
- Distance / scale of entrance moves:

## Per-trigger inventory
- On load / first paint:
- On hover / focus:
- On in-view (reveal):
- On scroll-progress (parallax, pin, scrub):
- On route / page transition:

## Reduced motion plan
- `@media (prefers-reduced-motion: reduce)` behavior for each of the above
  (disable / shorten / cross-fade only):

## Cost & risk
- Bundle weight of the chosen stack:
- Effects classified "needs manual pass" (and why):
