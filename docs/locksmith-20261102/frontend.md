# Frontend implementation

- Shared category source contains 20 fields, with locksmith (열쇠·도어락) after doors and before aircon. Generated service-fields.js, find/request fallback options and recruit list synchronized.
- Home uses 20 equal cells: computer spans one column in both home stylesheet layers. Existing desktop 10-column layout remains, producing two rows.
- Registration help count derives from shared definitions; recruitment promo count is dynamic with 20-category fallback; legacy service picker includes locksmith.
- New general guide field and locksmith-service task cover inspection, repair and replacement. No invented prices or security bypass instructions. Existing doors/lock task unchanged.
- Added example-locksmith-a/b/c, explicitly fictitious with AI example image, no public telephone. Existing 57 examples unchanged; live yescom remains outside static data and is not modified.
- Generated board-fields.js and API fields.json/catalog.json synchronized. Backend index and SQL not touched by this worker.
- Shared AI asset reused by new guide via assets/images/work-tasks/v1/../../category-locksmith.webp. File existence and URL normalization independently verified.

## Verification

- Three source builders PASS: 20 shared fields, 113 guide task mappings, 20 question fields.
- Node syntax checks PASS for data.js, service-fields.js, work-guide-catalog.js, technician-promo.js, technician-service-fields.js, service-picker.js.
- Git HEAD comparison PASS: all original 19 field records, all existing groups/fields/tasks/images and all 57 example records deep-equal. Exactly 3 new examples.
- Backend local migration test 7 PASS (run for compatibility, backend ownership elsewhere).
- Browser layout and save/reload verification are pending parent integration QA; no deployment performed by this worker.

## Changed files

data/service-fields.json; data/work-catalog.json; data.js; home-boiler.css; home-motion.css; service-picker.js; technician-promo.js; technician-service-fields.js; tools/build-board-fields.cjs; service-fields.js; work-guide-catalog.js; board-fields.js; find.html; request.html; technician-recruit.html; supabase/functions/board-api/fields.json; supabase/functions/board-api/catalog.json.

## Admin follow-up

- technician-public-profile.js now mounts the shared 20-field picker on its existing fields input. The same original input retains value and submit ownership, including custom fields.
- technician-service-fields.js accepts an optional input target; registration default #t-fields is unchanged.
- technician-detail.html loads service-fields.js, the shared picker and its existing stylesheet before the public-profile script.
- Existing public-profile UI regression test PASS, syntax checks PASS. Browser admin picker QA remains parent integration verification.
- Additional changed files: technician-public-profile.js, technician-detail.html.

THREAD_DONE: locksmith_frontend
