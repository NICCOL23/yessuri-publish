/* The shared applicant document changes appearance only in administrator mode. */
(()=>{'use strict';if(document.body.dataset.technicianPage!=='detail'||new URLSearchParams(location.search).get('admin')!=='1')return;document.body.classList.add('admin-density');const link=document.createElement('link');link.rel='stylesheet';link.href='admin-pages-compact.css?v=1';document.head.append(link);})();
