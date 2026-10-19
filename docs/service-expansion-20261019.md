# Main and guide service expansion — 2026-10-19

Existing 93 task objects and original image assets preserved. Nine distinct tasks added: bathroom renovation, wallpaper installation, sheet-vinyl installation, kitchen cabinet installation, wardrobe installation, TV repair, monitor repair, computer upgrade, computer purchase consultation. Total 102 tasks. Five groups; legacy field=it and group=life&work=it-work URLs remain accepted. No board, login, notification, reservation, payment, upload or database added.

## Backup and restore
Backup: F:/yessuri-web/review-backups/main-guide-20261019-2026-10-19T05-40-56-734Z
Baseline commit: 10c9642. Backed up 374 files with SHA-256. Restore only listed changed files from backup/files; remove only new files introduced by this change after reviewing the manifest. Never overwrite unrelated later edits. Original images were not replaced.

## Changed original files
- app.js
- category-refresh.css
- data/work-catalog.json
- guide-flow.css
- guide.html
- index.html
- tools/build-work-catalog.cjs
- work-guide-catalog.js
- work-guide-v3.js

## Content and image management
Canonical data: data/work-catalog.json. Regenerate browser catalog: node tools/build-work-catalog.cjs. Keep existing task IDs. New image records point to ../v2/ relative to the original asset base. Optimized files are WebP, 768×768; home composite images are 320×240. New task images use separate targets. Wallpaper installation reuses the existing wallpaper illustration (not a real project photo). The bathroom, sheet-vinyl, sink/wardrobe home composites were created for reviewed samples. Six additional target illustrations use the built-in image generation tool. Image review means visual suitability only, not engineering certification. No manufacturer source or field validation is claimed.

Generation prompt set: complete ivory kitchen sink cabinet with stainless sink/faucet; built-in ivory wardrobe with shelves/rail; TV with subtle screen fault; LED monitor with uneven backlight; desktop with SSD/RAM for upgrade; two desktop setups for purchase comparison. All white-background realistic restrained 3D, no text/logo/people. Prompts and original archive paths are recorded in the task image production records.

## Availability and remaining work
No live question board exists. Free-board buttons and claims of available free posting are omitted. Computer advice links use the current guide and existing inquiry route. Construction/TV/monitor tasks have no matching verified provider category: inquiry uses existing Kakao route instead of unrelated profile lists. Existing expert profiles remain explicitly examples. No seller inventory, quote, warranty duration or scheduling promise was added.

## Home destinations
- guide.html?work=bath-renovation#work-guide
- guide.html?work=wallpaper-install#work-guide
- guide.html?work=flooring-install#work-guide
- Sink/wardrobe: guide.html?field=kitchen#work-guide
- Air conditioner: guide.html?field=aircon#work-guide
- TV/monitor: guide.html?field=display#work-guide
- Computer: guide.html?group=computer#work-guide
- Existing other nine category links preserved.

## Reference research
- https://www.houzz.com/services (space and service classification)
- https://www.homedepot.com/services/c/bathroom-remodel/d9843b7cb (partial versus full bathroom work)
- https://www.lxzin.com/zin/consulting/start/ (product/space consultation)
- https://www.samsungsvc.co.kr/ (separate TV/monitor/PC product categories)
Checked 2026-10-19. Overseas pricing, warranties and schedules were not adopted.
