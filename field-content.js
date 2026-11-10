/* Public cards use the same published catalog as search and registration. */
(()=>{'use strict';if(new URLSearchParams(location.search).get('fields-preview')==='1')return;addEventListener('load',async()=>{await window.YESSURI_FIELDS_READY;window.YESSURI_SERVICE_FIELDS?.renderCards(document.querySelector('#category-grid'),window.YESSURI_SERVICE_FIELDS.allItems);});})();
