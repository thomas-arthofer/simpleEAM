---
status: diagnosed
trigger: "UAT Phase 02.2 (sovereignty-marker-lifecycle-auto-add-on-drop-delete-with-el) reported 4 failing gaps despite 7/7 static verification passes: G-02.2-3 (auto-add markers on library-sidebar drop of new main element fails live, only Ctrl+R fixes it), G-02.2-4 (native keyboard Delete/Backspace leaves markers orphaned, only Ctrl+R cleans up), G-02.2-5 (custom context-menu Delete leaves markers orphaned, only Ctrl+R cleans up), G-02.2-6 (duplicate/copy/paste of a marked main element does not give the copy its own markers, only Ctrl+R adds them). 2 other UAT checks passed (non-selectability with accepted deviation; reposition-on-drag fully passed)."
goal: find_root_cause_only
symptoms_prefilled: true
created: 2026-08-03T00:00:00.000Z
updated: 2026-08-03T00:00:00.000Z
---

## Current Focus

hypothesis: CONFIRMED for G-02.2-3/6, HYPOTHESIZED (unconfirmed) for G-02.2-4/5. See Resolution.
test: exhaustive static code reading of ExcalidrawWrapper.tsx handleChange, sovereigntyMarkers.ts, FullCustomContextMenu.tsx, Excalidraw v0.18.1 internal dist source (onChange invocation contract, updateScene/replaceAllElements, locked-element handling, library drop MIME handling), git commit history, and Docker deployment state.
expecting: n/a — investigation concluded (diagnose-only mode)
next_action: none — return ROOT CAUSE FOUND / partial to caller

## Symptoms

expected: |
  1. (G-02.2-3) Dragging a new main element from the library sidebar onto a diagram (Sovereignty flag on, company selected) shows fill/ring markers shortly after drop, no manual Ctrl+R needed.
  2. (G-02.2-4) Selecting a main element with markers and pressing keyboard Delete/Backspace removes the main element AND its markers in the same change (no orphans).
  3. (G-02.2-5) Right-click → Delete (custom context menu) removes the main element and its markers atomically.
  4. (G-02.2-6) Duplicating (context menu) or copy/pasting a main element with markers gives the copy its own fill/ring pair automatically, via D-02 diff detection.
actual: |
  1. Marker never appears after drop; only pressing Ctrl+R (manual sync) brings it in.
  2. Marker persists after native Delete/Backspace; only Ctrl+R cleans it up.
  3. Marker persists after context-menu Delete; only Ctrl+R cleans it up.
  4. Duplicate/pasted copy has no ring/fill; only Ctrl+R adds it.
errors: none reported (silent failures, no console errors surfaced in UAT)
reproduction: "cd client && yarn dev, featureFlags.Sovereignty enabled, company selected, diagram with >=1 BusinessCapability/DataObject root. See test steps 3-6 in 02.2-UAT.md."
started: "Phase 02.2 implementation (commits 32a472a, 5b82b0b, 6eb8742, 4be613f, all 2026-07-31 11:48-11:56). UAT performed 2026-07-31 to 2026-08-03 via `yarn dev` (per 02.2-UAT.md header), NOT via the Docker client container."

## Eliminated

- hypothesis: "onChange never fires for drop/delete/duplicate (handler not wired)"
  evidence: "ExcalidrawWrapper.tsx line 446 wires `onChange={handleChange}` directly to `<ExcalidrawTyped>`; this is the SAME function that runs `repositionAllMarkerEllipses` (confirmed working, UAT test 2 passed) in the same invocation, before the D-01/D-02/D-03 logic, with no early-return separating them except the top-level suppressOnChangeRef guard."
  timestamp: 2026-08-03

- hypothesis: "A custom keydown handler intercepts native Delete/Backspace before Excalidraw processes it"
  evidence: "Grepped DiagramKeyboardShortcuts.ts, DiagramEditor.tsx, FullCustomContextMenu.tsx: only Shift+Delete (delete-diagram dialog), Ctrl+F (search), and Ctrl/Cmd+ combos (n/o/s/d/e/i/p/r/m) are intercepted. Plain Delete/Backspace passes through untouched to Excalidraw's native handling."
  timestamp: 2026-08-03

- hypothesis: "Newly dropped library element lacks databaseId until saved, so D-02 diff detection can't classify it as a real main element"
  evidence: "createLibraryItemFromDatabaseElement (architectureElements.ts) requires a real existing `element: T` with an id, and stamps customData.databaseId = metadata.referenceId + isMainElement: true on the main container before drop. Library-sidebar items always carry a valid, pre-existing databaseId. The separate 'create brand-new unsaved entity' flow (newElementsUtils.ts / SaveDiagramDialog's detectNewElements) is unrelated to dragging an existing library item."
  timestamp: 2026-08-03

- hypothesis: "Stale/cached JS bundle — tester's browser running pre-Phase-02.2 code (Next.js dynamic-import HMR quirk, or a stale Docker image)"
  evidence: |
    Two sub-checks:
    (a) Docker: `nextgen-eam-client` image was built 2026-07-30T18:53:01+02:00, container started 2026-07-31T09:10:03 — BOTH before all 4 Phase 02.2 commits (11:48-11:56 on 07-31). Only one image exists (no dangling newer build). This IS a real stale-deployment fact, BUT is irrelevant to this investigation: 02.2-UAT.md's header explicitly states testing was done via `cd client && yarn dev` (local dev server), not the Docker container. docker-compose.override.yml confirms no source bind-mount for the client service (production Dockerfile builds the image at build time only).
    (b) Within the yarn-dev hypothesis: UAT test 1 shows a partial NEW behavior (`locked: true` — markers selectable/resizable but not draggable), and `git show 32a472a` confirms `locked: false -> true` was the exact one-line change of the FIRST Phase 02.2 commit (11:48). Since this new behavior IS observably active in the tested session, the dev server was NOT running fully pre-Phase-02.2 code either.
  timestamp: 2026-08-03

- hypothesis: "Logic bug in handleChange's D-02 diff-detection, removeOrphanedMarkersLive, or applySovereigntyMarkers (off-by-one, wrong filter, wrong id comparison)"
  evidence: "Traced line-by-line for drop/native-delete/duplicate scenarios. All three functions read correctly in isolation: removeOrphanedMarkersLive correctly treats isDeleted:true main elements as absent and tombstones their markers; applySovereigntyMarkers correctly recomputes stale-marker removal + fresh-marker creation, including for duplicates sharing a databaseId with distinct element ids. No off-by-one, inverted condition, or wrong-field-read bug found."
  timestamp: 2026-08-03

- hypothesis: "suppressOnChangeRef reentrancy race — multiple internal updateScene() calls within one handleChange invocation only have one boolean flag to suppress reentrant onChange calls, so a later reentrant call slips through unsuppressed"
  evidence: |
    Confirmed via Excalidraw v0.18.1 dist source (dist/dev/index.js:25932 `updateScene`, :30537 `this.props.onChange?.(elements, this.state, this.files)` in componentDidUpdate) that onChange fires once per React commit with `elements = this.scene.getElementsIncludingDeleted()`. Each of ExcalidrawWrapper's 3 internal updateScene() call sites (reposition, orphan-cleanup, D-02 sync-apply) sets `suppressOnChangeRef.current = true` synchronously BEFORE calling updateScene, so by the time any deferred/reentrant onChange fires, the flag is already true and gets correctly consumed-and-reset by the top-of-handleChange guard. No definitive proof this races incorrectly in practice was found; treated as unproven rather than confirmed, but no code fact supports it as the cause either.
  timestamp: 2026-08-03

- hypothesis: "Library-drop MIME type mismatch — app's EXCALIDRAW_LIBRARY_MIME constant doesn't match Excalidraw v0.18.1's actual expected MIME string, causing handleAppOnDrop to silently no-op internally"
  evidence: "grep confirms both architectureElements.ts and library.ts define `EXCALIDRAW_LIBRARY_MIME = 'application/vnd.excalidrawlib+json'`, which EXACTLY matches Excalidraw's own MIME_TYPES.excalidrawlib constant (dist/dev/chunk-4FTI6OG3.js:260: `excalidrawlib: \"application/vnd.excalidrawlib+json\"`). Drop correctly routes through Excalidraw's internal addElementsFromPasteOrLibrary path."
  timestamp: 2026-08-03

- hypothesis: "locked:true blocks Excalidraw's internal scene reconciliation / updateScene from applying mutations (including isDeleted tombstones) to marker elements"
  evidence: "Grepped all `.locked` usages in Excalidraw v0.18.1 dist source: only 2 relevant sites found — actionSelectAll (excludes locked elements from Ctrl+A selection, expected/intended per D-04) and actionUnlockAllElements (an explicit user action to unlock, unrelated). updateScene's own implementation (dist/dev/index.js:25932) shows `this.scene.replaceAllElements(nextElements)` runs unconditionally whenever sceneData.elements is truthy, with no locked-element filtering anywhere in that path. No evidence locked affects programmatic writes."
  timestamp: 2026-08-03

## Evidence

- timestamp: 2026-08-03
  checked: "ExcalidrawWrapper.tsx handleChange (lines ~187-292), full re-read"
  found: |
    Sequential structure per onChange call:
    1. `if (suppressOnChangeRef?.current) { suppressOnChangeRef.current = false; return }` — top guard.
    2. `repositionAllMarkerEllipses(elements)` — if changed, sets suppress flag, updateScene (captureUpdate: EVENTUALLY).
    3. `removeOrphanedMarkersLive(effectiveElements)` — if orphansRemoved, sets suppress flag, updateScene (captureUpdate: IMMEDIATELY), runs UNCONDITIONALLY (no feature-flag gate).
    4. D-02 diff: computes `currentMainElementIds` from `effectiveElements` (skipping isDeleted), diffs against `previouslySeenMainElementIdsRef.current` to get `newMainElementIds`, **then immediately and unconditionally overwrites `previouslySeenMainElementIdsRef.current = currentMainElementIds` synchronously — BEFORE the async fetch below even starts.**
    5. `if (newMainElementIds.length > 0 && featureFlags.Sovereignty && selectedCompanyId)`: fires a fire-and-forget `void (async () => { const syncedElements = await syncSovereigntyMarkers(...); if (syncedElements !== effectiveElements) { ...updateScene... } })()` with **no try/catch**.
  implication: "The ref is marked 'seen' synchronously regardless of whether the subsequent async sync attempt succeeds, fails, or yields zero markers. There is no retry path — once an id is in the ref, it is never reconsidered by the live onChange diff again."

- timestamp: 2026-08-03
  checked: "sovereigntyMarkers.ts fetchSovereigntyMarkersForDiagram / syncSovereigntyMarkers"
  found: |
    fetchSovereigntyMarkersForDiagram wraps each root's `apolloClient.query(...)` in try/catch, logs+continues on failure (fail-closed per root, never throws out of the function). `syncSovereigntyMarkers` returns `elements` UNCHANGED (no-op) whenever `markerByNodeId.size === 0` — which occurs if: (a) the query legitimately returns no marker entries for a brand-new root not yet evaluated by whatever backend process computes sovereignty status, (b) a transient network/GraphQL error on that specific root, or (c) any other reason the merge produces zero entries. In ALL of these cases, syncSovereigntyMarkers resolves normally (no throw) with `elements` unchanged.
  implication: "Combined with the prior finding: a newly-dropped/duplicated main element that doesn't get a marker on its FIRST (and only) live-sync attempt — for any reason, including the backend simply not having computed its sovereignty status yet — will NEVER be retried by the live onChange path. Only Ctrl+R (handleManualSync, which does an unconditional full resync independent of previouslySeenMainElementIdsRef) will pick it up later. This exactly matches the reported symptom pattern for G-02.2-3 and G-02.2-6: 'only ctrl-R brought in the marker' / 'ctrl-R adds it'."

- timestamp: 2026-08-03
  checked: "databaseSyncUtils.ts syncDiagramOnOpenSimple / syncDiagramOnOpen (the Ctrl+R path) and DiagramHandlers.ts handleManualSync"
  found: "handleManualSync reads the current scene, calls syncDiagramOnOpen (which composes syncDiagramOnOpenSimple + syncSovereigntyMarkers unconditionally on ALL current elements, with no dependency on previouslySeenMainElementIdsRef), then updateScene. This is architecturally a full, diff-detection-independent resync."
  implication: "Confirms Ctrl+R's 'fixes it' behavior is explained simply by it being a full unconditional resync, not by any special/different logic that the live path is missing — consistent with the D-02 no-retry theory being the root cause rather than some other missing feature."

- timestamp: 2026-08-03
  checked: "FullCustomContextMenu.tsx handleDelete/handleDuplicate/handleCopy/handlePaste"
  found: |
    - handleDelete: reads fresh elements, filters selected out, calls `removeOrphanedMarkersLive(newElements)` inline, then `excalidrawAPI.updateScene({elements: cleanedElements, appState:{...}, captureUpdate: CaptureUpdateAction.IMMEDIATELY})`. Never sets `suppressOnChangeRef.current = true` first — and the component does not even receive `suppressOnChangeRef` as a prop, unlike ExcalidrawWrapper's own internal updateScene call sites.
    - handleDuplicate: generates ids via naive string concat (`duplicate_${el.id}_${Date.now()}_${index}`), does not remap groupIds/boundElements/containerId — already logged in STATE.md line 117 as an accepted backlog item (grouping bug), unrelated to sovereignty markers specifically.
    - handleCopy/handlePaste: use a custom `window.__excalidraw_clipboard` global, entirely separate from Excalidraw's own native copy/paste (Ctrl+C/Ctrl+V) mechanism.
  implication: "Confirmed, real code asymmetry (missing suppressOnChangeRef usage) for context-menu delete/duplicate/paste. Plausible contributing factor for G-02.2-5/6 when performed via the context menu specifically, but does not explain G-02.2-4 (native keyboard delete, which never touches this file at all) — these two delete-gaps must share a different or partially-different cause than this asymmetry alone."

- timestamp: 2026-08-03
  checked: "Excalidraw v0.18.1 dist source: onChange invocation, updateScene, locked-element handling, library-drop MIME"
  found: "onChange fires from componentDidUpdate as `this.props.onChange?.(this.scene.getElementsIncludingDeleted(), this.state, this.files)` whenever `!this.state.isLoading`, once per commit. updateScene's `this.scene.replaceAllElements(nextElements)` runs unconditionally for any sceneData.elements, no locked-element special-casing found anywhere. EXCALIDRAW_LIBRARY_MIME string matches exactly. CaptureUpdateAction enum values are valid, correctly imported/used both in-app and internally."
  implication: "Ruled out several Excalidraw-internals-based theories (isLoading stuck, locked blocking mutation, invalid enum, MIME mismatch) as explanations for the delete-path gaps. No definitive mechanism found in Excalidraw's own source explaining why removeOrphanedMarkersLive's tombstone would fail to render for BOTH the native-delete and context-menu-delete paths despite reading correctly in isolation."

- timestamp: 2026-08-03
  checked: "Docker deployment state (nextgen-eam-client image/container timestamps) vs git commit timestamps vs 02.2-UAT.md reproduction instructions"
  found: "Docker client image/container both predate all 4 Phase 02.2 commits, BUT 02.2-UAT.md explicitly instructs testing via `cd client && yarn dev`, not the Docker container. This Docker staleness is a real, separate infrastructure fact (the production container will need a rebuild+redeploy before this fix reaches production) but is NOT the explanation for the UAT-reported failures, which were performed against a live dev server."
  implication: "Noted as a tangential finding worth flagging separately to the user, but excluded from the root-cause explanation for the 4 gaps."

## Resolution

root_cause: |
  Two distinct root causes identified, matching the task's allowance for genuinely distinct causes per gap:

  1. CONFIRMED (G-02.2-3, G-02.2-6): In ExcalidrawWrapper.tsx's `handleChange`, the D-02 diff-detection block updates `previouslySeenMainElementIdsRef.current` to include a newly-seen main element's id SYNCHRONOUSLINE, immediately, before the async `syncSovereigntyMarkers(...)` fetch (fired via a fire-and-forget `void (async () => {...})()` with no try/catch) has resolved or even started. If that fetch attempt does not yield a marker for the new element on its single attempt — whether due to the backend not yet having computed a sovereignty status for a brand-new entity, a transient GraphQL/network hiccup, or any other reason `markerByNodeId.size === 0` for that node — `syncSovereigntyMarkers` returns the elements unchanged, and the element's id is already permanently "seen" in the ref, so it is NEVER retried by the live onChange path again. Only Ctrl+R (`handleManualSync`), which performs a full unconditional resync independent of this ref, ever picks it up. This is a mark-before-confirm race with no retry/failure path — a genuine logic gap, not a timing fluke that self-heals on the next interaction.

  2. UNCONFIRMED / best-available hypothesis (G-02.2-4, G-02.2-5): Both native-keyboard delete (via ExcalidrawWrapper.handleChange's reactive removeOrphanedMarkersLive) and custom context-menu delete (via FullCustomContextMenu.handleDelete's inline removeOrphanedMarkersLive + direct updateScene) fail identically, despite being structurally different code paths that both read as logically correct in isolation. The one concrete, confirmed code fact distinguishing the context-menu path from every other updateScene() call site in the codebase is that FullCustomContextMenu.tsx's handlers (delete/duplicate/copy/paste) never set `suppressOnChangeRef.current = true` before calling `excalidrawAPI.updateScene()`, and the component doesn't even receive that ref as a prop. This is a real asymmetry and a plausible contributing factor for G-02.2-5 (and G-02.2-6 when routed through the context menu), but it does NOT explain G-02.2-4, which never touches FullCustomContextMenu.tsx at all and relies solely on Excalidraw's native delete + the reactive onChange cleanup — a path that reads as correct and was extensively traced against Excalidraw's own internal onChange/updateScene/locked-element source with no bug found. This half of the investigation could not be conclusively resolved via static analysis alone; it requires live browser instrumentation (temporary console.log at each of removeOrphanedMarkersLive's call sites, plus a Network-tab check for whether any GraphQL request fires at all on native delete) to confirm the actual break point.
fix: ""
verification: ""
files_changed: []
