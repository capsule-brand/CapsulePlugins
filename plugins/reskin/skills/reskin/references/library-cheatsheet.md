# Animation library cheat-sheet

Pick the library that matches the *effect* and the project's stack. Reuse whatever
the project already has before adding a new dependency.

| Effect / feel | Recommended | Notes |
|---|---|---|
| Component enter/exit, hover, layout shifts (React) | **Framer Motion** | Idiomatic in React; `AnimatePresence`, `layout`, springs. |
| Scroll-driven (pin, scrub, parallax, timelines) | **GSAP + ScrollTrigger** | Most powerful for choreographed scroll; framework-agnostic. |
| Buttery smooth/inertial scroll | **Lenis** | Wraps the page; pairs with GSAP ScrollTrigger. |
| Vector micro-animations (icons, loaders) | **Lottie** | Designer-authored JSON; tiny, crisp. |
| 3D / shaders / hero canvases | **Three.js / R3F** | Heavy — always lazy-load; flag bundle cost. |
| Simple fades/slides, no dep budget | **CSS transitions/keyframes** | Lightest; good default for low-motion sites. |

## Stack → default choice
- React + Vite/Next  → Framer Motion (+ GSAP/Lenis if scroll-heavy)
- Vue / Svelte       → native transitions first, GSAP for complex scroll
- Plain HTML/Tailwind → CSS first, GSAP/Lenis if the reference demands it

## Always
- Gate every effect behind `prefers-reduced-motion`.
- Lazy-load Three.js / large Lottie / heavy GSAP timelines.
- Keep durations honest: micro 120–200ms, base 200–400ms, expressive 400–700ms.
