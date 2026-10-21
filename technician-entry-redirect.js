/* Keep old registration links and query/hash bookmarks working. */
(() => {
 'use strict';
 const target=new URL('technician-board.html',location.href);
 target.search=location.search;
 target.hash=location.hash;
 location.replace(target.href);
})();
