# REFLECTION

## 1. The Persistence Consultation

When deciding how to store documents, three options came up: localStorage, the File System Access API, and IndexedDB.

localStorage seemed straightforward at first — simple to implement, no setup required. But it carries a hard 5–10 MB browser limit, and for a document management app where content grows over time, that ceiling becomes a real problem fast. It was described as fine for small apps, but not suitable here.

The File System Access API relied too heavily on the user's actual filesystem. It would require re-prompting for folder permissions each session, creating unnecessary friction for anyone just wanting to open their notes. That wasn't the experience I wanted to build.

IndexedDB had excellent storage capability, no practical size ceiling for everyday document use, no permission prompts, and persistence that survives browser restarts. It was recommended as the most suitable option for a self-contained, single-user, no-backend app — and that reasoning made it an easy decision.

## 2. Search → Paste → Cite

Rather than searching mid-build, I provided a Next.js reference document upfront before any code was written. The goal was to anchor the agent before it made assumptions about the framework — particularly important because Next.js 16 has breaking changes from earlier versions. I couldn't always see the direct impact, but the intention was to ground the routing conventions and App Router structure from the start.

## 3. CLAUDE.md Catching Drift

I didn't experience significant drift. My approach was to keep instructions clear and concise, working through features in dedicated branches — UXUI, tutorial, mainui, mobileversion — so each session had a tight scope. That structure naturally prevented scope creep. The constraint in CLAUDE.md around not creating new folders without permission also kept the project structure clean throughout.

## 4. The Design Pass

I wanted the app to look professional — something people would trust with their actual writing. On the home page, the focus was on building a proper showcase: a cycling feature display, hero animations, an "about" section. Inside the workspace, we added five colour themes, a gradient logo, glassmorphism modals, entrance animations, a first-run tutorial, and a "What's New" panel. Mobile optimisation was deliberate — scrollable toolbars, larger touch targets, responsive padding — and the typography was chosen to feel familiar to anyone who uses word processors. The design clicked when the themes and accent bars were working together; the app finally had a visual identity rather than just a functional interface.

## 5. Harder Than Expected

Setting up Next.js took noticeably more than a static site — running terminal commands, understanding the App Router file structure, and getting the dev server running before writing a single line of UI. Having previously only used localStorage, the shift to IndexedDB was a conceptual step up, even though the benefits became obvious quickly. The overall capability of Next.js and Tailwind v4 is clearly greater than what I had been producing before, but that power comes with more to configure upfront.

## 6. The Docs Folder in Hindsight

I would add more to the docs folder next time. The references there — layouts, pages, fonts — I couldn't always see their direct impact; I added them hoping they'd anchor the process. In hindsight, a well-curated docs folder could genuinely shape specific features if references are chosen with a clear outcome in mind. Next time I'd be more intentional: pick references that map directly to the features I'm planning, rather than general framework documentation.
