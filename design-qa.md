# GPT Image 2.5 spotlight — design QA

final result: passed

Reviewed on 2026-09-09. This pass covers the isolated spotlight and its navigation entry in the existing gallery. It does not certify model quality or a public deployment.

## Publication preparation

The scoped change was reapplied to the latest remote main commit `b477278` in an isolated worktree. It retains the remote branch's 541 gallery records, local API plugin, dependencies, payment endpoints and community routes. Existing README text is unchanged outside the new spotlight sections. All four prompt, original-image and output-image hashes match their saved generation records.

The clean installation and production build pass. `npm test` passes 40 tests and `npm run test:apimart` passes 24 tests, with no failures. Browser checks against that build confirm seven case options, both distinct Rio images loading and the original #527 detail modal opening correctly. The original working directory remains separate from the publication branch.

## Follow-up: keep both images visible in narrow windows

The user reported seeing only one image. In the actual 491 × 734 in-app browser, both Rio assets had loaded, but the under-600-pixel layout stacked them vertically. The second image began at y=1010, below the initial viewport. The side-by-side canvas now retains two columns at narrow widths and uses a 12:7 frame with contained images. Compact labels remain left GPT 2.0 and right GPT 2.5. The enlargement dialog still offers larger individual images for inspection.

Verified in the production preview: both images share the same top edge and fit within the viewport at 491 × 734 and 390 × 844, with no horizontal overflow. The 1686-pixel Chrome layout retains its original geometry. Mobile enlargement opens and closes, and the left detail link opens the original #527 modal. Browser Back returns to the comparison; the console reports no errors or warnings. Build and whitespace checks passed. Temporary viewport sizing was reset, and the user's open previews were refreshed. Inspected evidence: [actual narrow window](docs/design/gpt-image-2-5/narrow-pair-491.jpg) and [390-pixel mobile](docs/design/gpt-image-2-5/narrow-pair-390.jpg). This supersedes the earlier stacked mobile canvas screenshots below. No P0/P1/P2 issue remains.

## Follow-up: three more real comparisons

The spotlight now has four real recreations followed by three labeled demonstrations. Added #527 Rio travel diorama, #523 Manhattan watercolor and #510 Bichon Shop icon, each generated once from the unchanged gallery prompt without a reference image or post-generation editing. The [case index](docs/design/gpt-image-2-5/real-cases.md) links the workspace PNGs, complete prompts and generation records. Input hashes, source/output hashes and actual dimensions were verified against all three new records.

A localized case selector above the next button opens any of the seven examples directly. Both selection methods reset the split to 50%, default real cases to side-by-side and update the case URL. The left GPT 2.0 image links to its existing gallery detail modal; the right GPT 2.5 image displays the new output. All three README spotlight sections now list the four real cases and share the updated [homepage screenshot](docs/design/gpt-image-2-5/case532-preview.jpg).

Inspected evidence: [Rio](docs/design/gpt-image-2-5/case527-preview.jpg), [Manhattan](docs/design/gpt-image-2-5/case523-preview.jpg), [Bichon Shop](docs/design/gpt-image-2-5/case510-preview.jpg), and [mobile](docs/design/gpt-image-2-5/more-cases-mobile.jpg). Desktop captures are 1386 × 1283 pixels at a 1386 × 1135 CSS viewport; mobile is a 390 × 2151 full-page capture at 390 × 844. Images fit their panels, the selector remains within the sidebar, and the selected navy/cyan/lime design is retained. No P0/P1/P2 issue remains.

Production browser verification passed for all new image pairs, exact prompts, labels, source details and case URLs. Each detail link opens the matching original gallery modal; Back returns to the spotlight. English selection and case URLs survive reload, the last demo wraps to the first real case, and the mobile generation-record dialog opens and closes with Escape. There is no horizontal overflow at 390 or 1386 pixels, and the console reports no errors or warnings. `npm run build` and `git diff --check` passed. The original gallery code and case data are unchanged from this follow-up's baseline; original generation code, gallery styles and configuration retain their earlier baseline contents. No commit, push or public deployment was performed.

## Follow-up: version labels and original-case details

The project owner requested explicit display labels: left **GPT 2.0**, right **GPT 2.5**. These appear in the comparison and enlarged views. Tool-reported model metadata is retained separately in the generation record.

The left image now has **查看详情 / View details**, linked to the corresponding gallery URL (`/?case=532` for the real test). The original gallery reads a valid numeric case parameter after loading its case data and opens its existing detail modal. Closing the modal removes the case parameter, so an ordinary reload does not reopen it. Existing demo cases #531 and #526 link to their own original details; the illustrative mug has no fabricated source link.

Browser verification passed on the production preview: labels are correct; side-by-side, slider and 390-pixel mobile clicks open the original #532 modal with `/images/case532.jpg` and the matching title; closing clears the parameter; the regular gallery reload has no modal; browser Back returns to the spotlight; the browser console reports no errors or warnings. `npm run build` and `git diff --check` passed. The current [desktop preview](docs/design/gpt-image-2-5/case532-preview.jpg) and [mobile preview](docs/design/gpt-image-2-5/case532-mobile.jpg) include the new labels and detail action. No P0/P1/P2 issue remains.

## Follow-up: first real case recreation

The user requested a real website case generated with the built-in image tool. Case #532 was generated once from the exact 8143-character gallery prompt, with no reference image and no post-generation edits. The source, unchanged prompt, output dimensions, timing and SHA-256 hashes are recorded in [case532-test-record.json](docs/design/gpt-image-2-5/case532-test-record.json); the complete input is in [case532-test-input.json](docs/design/gpt-image-2-5/case532-test-input.json).

The real case is now the first example and defaults to side-by-side comparison. Its record panel replaces model-selection radios because the tool returned no specific model ID, quality setting or cost. The original gallery image and new generated image are distinct. The other three examples retain their demonstration labels and controls. This is a single recreation using the site's documented prompt; the original generation conditions were not independently verified.

Current evidence: [desktop](docs/design/gpt-image-2-5/case532-preview.jpg), [mobile](docs/design/gpt-image-2-5/case532-mobile.jpg), [selected design and current page together](docs/design/gpt-image-2-5/case532-design-comparison.jpg), and [previous controls and current record panel together](docs/design/gpt-image-2-5/case532-controls-comparison.jpg). Desktop viewport is 1386 × 1135 CSS pixels; the capture is 1386 × 1283 pixels, cropped to the top 1135 pixels for the full-view comparison. Mobile viewport is 390 × 844 with a 390 × 2396 full-page capture. Both are 1 image pixel per CSS pixel.

The current evidence was inspected. The six-panel images, source attribution and generated observations are intentional content changes requested by the user. Fonts, navy/cyan tokens, hero, column alignment and button hierarchy retain design 1. Portrait images are fully contained on desktop and shown at their native aspect ratios in the mobile stacked view. No P0/P1/P2 layout or interaction issue remains. Existing P3 font and asset differences below still apply.

Verified: two different images load at their recorded dimensions; the real case has no model radios; returning to a demonstration restores its two radios and shared image; slider keyboard adjustment works; generation-record and image dialogs open and close; English labels and default side-by-side state survive reload; neither desktop nor mobile overflows; the production session reports zero console errors or warnings. The exact prompt matches the gallery source, test input and rendered-case data. `npm run build` passes, and the original gallery bundle is unchanged. README sections in all three languages now describe the first real recreation and use its new screenshot.

The new output retains the grid and readable LIMORA branding. Panel 2 uses a dripping lemon half instead of the requested floating slice; extra text appears on the cart and campaign strip. These are observations about the single output, without a model ranking claim. The previous demonstration-only delivery boundary is superseded by this section. No public deployment or repository push was performed.

## Reference and evidence

- Selected visual truth: design 1, the first displayed immersive slider design, preserved as [design-1.jpg](docs/design/gpt-image-2-5/design-1.jpg).
- Portable reference: [design-1.jpg](docs/design/gpt-image-2-5/design-1.jpg).
- Verified production build preview: `http://127.0.0.1:4179/gpt-image-2-5/`.
- Final browser screenshot: [preview.jpg](docs/design/gpt-image-2-5/preview.jpg).
- Full-view comparison, reference left and implementation right: [comparison.jpg](docs/design/gpt-image-2-5/comparison.jpg).
- Focused comparisons: [hero typography and artwork](docs/design/gpt-image-2-5/hero-comparison.jpg), [prompt and controls](docs/design/gpt-image-2-5/controls-comparison.jpg).
- Responsive evidence: [mobile](docs/design/gpt-image-2-5/mobile.jpg), [mobile image dialog](docs/design/gpt-image-2-5/mobile-dialog.jpg), [English example](docs/design/gpt-image-2-5/english.jpg).

Desktop state: Chinese, ceramic mug, Sunburst selected, slider at 50%, dialogs closed. Source size is 1386 × 1135 pixels. The implementation CSS viewport is 1386 × 1135; the clear full-page capture is 1386 × 1287 pixels. The combined comparison uses the implementation's top 1135 pixels without scaling. Evidence is 1 image pixel per CSS pixel. Additional explanatory text and the footer are below the reference crop.

Mobile CSS viewport is 390 × 844, with a 390 × 1719 full-page capture. English evidence is 1386 × 1282 and uses the travel example. Those views validate responsiveness and content states; there is no supplied mobile or English reference for pixel comparison. A 1024-pixel intermediate viewport was checked for overflow. The temporary viewport override was reset after review.

## Findings and iteration history

No actionable P0, P1, or P2 findings remain.

1. **P2 — vertical spacing.** The [first comparison](docs/design/gpt-image-2-5/iteration-1.jpg) placed the workspace around y=475 instead of the reference's y=455 and made the sidebar taller. Reduced hero and sidebar spacing. The final workspace begins at y=455.48 and the sidebar aligns with the main comparison panel.
2. **P2 — hero artwork treatment.** The first image had a rectangular background edge and its cyan rim sat too far right. Added a radial mask to the generated raster, increased its display size, and shifted the image left. The final full-view and hero crops show a blended dark sphere beside the copy.
3. **P2 — mobile density and skip-link capture.** The square mobile canvas left excessive vertical space around the landscape image. Changed the mobile slider to 4:3 and stacked comparison to 2:3. Replaced the skip-link's offscreen transform with clipping so full-page capture also hides it when unfocused. The final mobile evidence has no floating skip-link overlay or horizontal overflow.
4. **Development warning.** Editing imported case data could remount the root during hot reload. Separated the React entry from the exported App component. The production browser session reports no errors or warnings. This finding is separate from visual fidelity.

The revised implementation was recaptured and compared with the reference in the same image after the fixes. Focused control and hero crops were inspected alongside the full view.

## Required fidelity surfaces

| Surface | Assessment |
| --- | --- |
| Fonts and typography | Large bold display heading, smaller Chinese headline, muted descriptions, and compact controls preserve the reference hierarchy. The system sans-serif stack has modest glyph-width differences from the generated reference. Chinese and English remain readable without truncating controls. |
| Spacing and layout rhythm | Wide image panel, narrow prompt sidebar, common top edge, border radii, and button grouping follow design 1. Mobile becomes one column; no horizontal overflow at 390, 1024, or 1386 pixels. |
| Colors and tokens | Navy background, pale text, cyan selected states, and cyan-to-lime primary buttons match the source direction. Focus outlines remain visible. Native radio rendering varies slightly by browser. |
| Image quality | Both custom assets are generated raster images. The mug preserves warm product photography, a right-facing handle, wood, books, and blurred foliage. The sphere has no visible rectangular edge. Portrait examples use containment to retain their full artwork. |
| Copy and content | Official model names and document links replace speculative descriptions. Both comparison panels explicitly use illustrative material. No latency, price, or model-performance claims are fabricated. Shared prompts, source links, model selection, and parameters are presented in Chinese and English. |

Expected adaptations: existing project branding is retained; the reference's login action becomes a return-to-gallery link; model radios select the planned comparison model; an example counter, source attribution, methodology, and explicit demonstration notice are added. The original generation and account flows remain in the gallery.

P3 follow-up only: the generated mug silhouette, Chinese glyph widths, decorative lettering, and native radio appearance vary slightly from the reference. These do not block use or change the selected layout.

## Interaction and regression checks

- Slider supports pointer changes and keyboard arrow changes; tested 50% → 51% → 50%.
- Side-by-side mode works; mobile stacks the two images.
- Sunburst and Flare selection updates the visible label and the official model document in the parameters dialog.
- Copy prompt shows success; pasting through the browser UI into the gallery search reproduced the exact prompt.
- Three examples cycle and wrap. Case query parameters survive reload; English selection survives reload through `lang=en`.
- Image enlargement and parameters dialogs open and close; Escape works, images load, and closing restores body scrolling. Dialogs have accessible names.
- Original gallery search for `531` returns one match; its original case-details modal opens and closes. The new navigation entry opens the isolated spotlight.
- Production preview returns HTTP 200 for the homepage, spotlight, spotlight with query parameters, and both reused gallery images. Main images load in the browser; the fresh production session has zero console errors or warnings.
- `npm run build` passes and emits both HTML entries with separate gallery and spotlight CSS/JS bundles. `git diff --check` passes.
- Starting-worktree comparison confirms the original gallery change is one navigation link. Existing gallery CSS, model adapter, generation endpoint, package files, Vercel configuration, and case data are unchanged from the starting worktree. All pre-existing README content is retained outside the added spotlight blocks.
- English, Chinese, and Japanese README blocks include the spotlight link, official documentation, truthful demonstration status, and the final preview image.

## Initial delivery boundary (before the real-case follow-up)

The page and README changes are complete locally. Actual GPT Image 2 versus GPT Image 2.5 generated outputs, measured settings/costs, and live 2.5 generation are outside this demonstration build. No commit, push, or public deployment was performed. The production preview is kept running and open for review.
