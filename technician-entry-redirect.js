/* Keep old registration links and query/hash bookmarks working. */
(() => {
 'use strict';
 const guide=['#process-title','#prepare-title','#faq-title','#entry-privacy-title'].includes(location.hash);
 const target=new URL(guide?'technician-notice.html':'technician-board.html',location.href);
 target.search=location.search;
 target.hash=location.hash;
 location.replace(target.href);
})();
