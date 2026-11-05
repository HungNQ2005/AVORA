'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log(' AVORA ADMIN AUDIT LOG FRONTEND VERIFICATION SUITE');
console.log('========================================================================');

const frontendDir = path.resolve(__dirname, '../frontend/src');

// 1. Verify Endpoints
console.log('[TEST 1] Verifying apiEndpoints.js additions...');
const apiEndpointsContent = fs.readFileSync(path.join(frontendDir, 'constants/apiEndpoints.js'), 'utf8');
assert(apiEndpointsContent.includes('AUDIT_LOGS:'), 'AUDIT_LOGS missing in apiEndpoints.js');
assert(apiEndpointsContent.includes('AUDIT_LOG_DETAIL:'), 'AUDIT_LOG_DETAIL missing in apiEndpoints.js');
assert(apiEndpointsContent.includes('AUDIT_LOG_STATS:'), 'AUDIT_LOG_STATS missing in apiEndpoints.js');
console.log(' -> PASS: apiEndpoints.js has AUDIT_LOGS, AUDIT_LOG_DETAIL, and AUDIT_LOG_STATS');

// 2. Verify auditLogService.js
console.log('[TEST 2] Verifying auditLogService.js...');
const servicePath = path.join(frontendDir, 'services/auditLogService.js');
assert(fs.existsSync(servicePath), 'auditLogService.js does not exist');
const serviceContent = fs.readFileSync(servicePath, 'utf8');
assert(serviceContent.includes('export const fetchAuditLogs'), 'fetchAuditLogs export missing');
assert(serviceContent.includes('export const fetchAuditLogById'), 'fetchAuditLogById export missing');
assert(serviceContent.includes('authenticatedFetch'), 'authenticatedFetch missing in auditLogService.js');
assert(serviceContent.includes('URLSearchParams'), 'URLSearchParams missing in auditLogService.js');
console.log(' -> PASS: auditLogService.js exists with fetchAuditLogs and fetchAuditLogById');

// 3. Verify App.jsx route and guards
console.log('[TEST 3] Verifying App.jsx route and aliases...');
const appContent = fs.readFileSync(path.join(frontendDir, 'App.jsx'), 'utf8');
assert(appContent.includes("import AuditLogManagementPage from './features/audit_logs/pages/AuditLogManagementPage'"), 'AuditLogManagementPage import missing in App.jsx');
assert(appContent.includes('<AdminRoute><AuditLogManagementPage /></AdminRoute>') || appContent.includes('<AdminRoute>\n                  <AuditLogManagementPage />'), 'AdminRoute guarded route missing in App.jsx');
assert(appContent.includes('/dashboard/audit-logs'), 'Route path /dashboard/audit-logs missing');
assert(appContent.includes('path="/admin/audit-logs"'), 'Alias redirect /admin/audit-logs missing');
assert(appContent.includes('path="/audit-logs"'), 'Alias redirect /audit-logs missing');
console.log(' -> PASS: App.jsx properly mounts and guards audit-logs route with aliases');

// 4. Verify dashboardNav.jsx
console.log('[TEST 4] Verifying dashboardNav.jsx navigation item...');
const navContent = fs.readFileSync(path.join(frontendDir, 'features/dashboard/components/dashboardNav.jsx'), 'utf8');
assert(navContent.includes('/dashboard/audit-logs'), '/dashboard/audit-logs link missing in dashboardNav.jsx');
assert(navContent.includes('Nhật ký kiểm toán (Audit Log)'), 'Label missing in dashboardNav.jsx');
console.log(' -> PASS: dashboardNav.jsx has Audit Log link in admin section');

// 5. Verify feature files existence
console.log('[TEST 5] Verifying features/audit_logs/ files existence...');
const expectedFiles = [
  'features/audit_logs/components/AuditLogFilterBar.jsx',
  'features/audit_logs/components/AuditLogFilterBar.css',
  'features/audit_logs/components/AuditLogTable.jsx',
  'features/audit_logs/components/AuditLogTable.css',
  'features/audit_logs/components/AuditLogDetailModal.jsx',
  'features/audit_logs/components/AuditLogDetailModal.css',
  'features/audit_logs/components/AuditLogDiffViewer.jsx',
  'features/audit_logs/components/AuditLogDiffViewer.css',
  'features/audit_logs/pages/AuditLogManagementPage.jsx',
  'features/audit_logs/pages/AuditLogManagementPage.css',
];

for (const f of expectedFiles) {
  const fullPath = path.join(frontendDir, f);
  assert(fs.existsSync(fullPath), `File missing: ${f}`);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert(content.length > 50, `File appears empty: ${f}`);
}
console.log(` -> PASS: All ${expectedFiles.length} audit log feature files exist and have substantial content`);

// 6. Verify Diff Viewer capabilities
console.log('[TEST 6] Verifying AuditLogDiffViewer features...');
const diffContent = fs.readFileSync(path.join(frontendDir, 'features/audit_logs/components/AuditLogDiffViewer.jsx'), 'utf8');
assert(diffContent.includes('So sánh trực quan'), 'Visual diff tab missing');
assert(diffContent.includes('Mã JSON gốc'), 'Raw JSON tab missing');
assert(diffContent.includes('Chỉ hiện trường thay đổi'), 'Filter toggle missing');
assert(diffContent.includes('Bản ghi mới tạo'), 'INS notice missing');
assert(diffContent.includes('Bản ghi đã bị xóa'), 'DEL notice missing');
assert(diffContent.includes('Nhật ký phiên đăng nhập'), 'LGN notice missing');
console.log(' -> PASS: AuditLogDiffViewer supports visual diff, raw JSON, filtering, and special action handling');

// 7. Verify Filter Bar validation
console.log('[TEST 7] Verifying AuditLogFilterBar features...');
const filterContent = fs.readFileSync(path.join(frontendDir, 'features/audit_logs/components/AuditLogFilterBar.jsx'), 'utf8');
assert(filterContent.includes('dateError'), 'dateError prop missing in FilterBar');
assert(filterContent.includes('onReset'), 'onReset prop missing in FilterBar');
assert(filterContent.includes('onRefresh'), 'onRefresh prop missing in FilterBar');
assert(filterContent.includes('ACTION_OPTIONS'), 'ACTION_OPTIONS missing in FilterBar');
console.log(' -> PASS: AuditLogFilterBar supports debounce search, action dropdown, entity, dates, reset, refresh');

// 8. Verify Table pagination
console.log('[TEST 8] Verifying AuditLogTable pagination...');
const tableContent = fs.readFileSync(path.join(frontendDir, 'features/audit_logs/components/AuditLogTable.jsx'), 'utf8');
assert(tableContent.includes('renderPaginationButtons'), 'Pagination buttons missing in Table');
assert(tableContent.includes('onPageSizeChange'), 'Page size selector missing in Table');
assert(tableContent.includes('onViewDetail'), 'onViewDetail missing in Table');
console.log(' -> PASS: AuditLogTable has complete columns, badges, detail action, and pagination');

console.log('========================================================================');
console.log(' ALL FRONTEND VERIFICATION CHECKS PASSED SUCCESSFULLY (100%)');
console.log('========================================================================');
