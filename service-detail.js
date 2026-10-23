/* Compatibility only: use the original cost-guide screen, never a separate layout. */
(()=>{'use strict';const field=window.YESSURI_SERVICE_FIELDS.items.find(f=>f.id===new URLSearchParams(location.search).get('field'));location.replace(field?.href||'guide.html');})();
