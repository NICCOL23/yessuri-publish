/* Compatibility only: use the original cost-guide screen, never a separate layout. */
(async()=>{'use strict';await window.YESSURI_FIELDS_READY;const field=window.YESSURI_SERVICE_FIELDS.allItems.find(f=>f.id===new URLSearchParams(location.search).get('field'));location.replace(field?.href||'guide.html');})();
