const { Plugin, Modal, Setting, Notice, PluginSettingTab, TFile, TFolder, normalizePath } = require('obsidian');

const PLUGIN_VERSION = '1.1.0';
const DEFAULT_SETTINGS = {
  interfaceMode: 'light',
  rootFolder: 'Vulnerability Research',
  defaultLanguage: 'English',
  defaultSeverity: 'Medium',
  defaultStatus: 'idea',
  defaultTemplatePackSource: '_vuln-template-pack',
  exportFolderName: '_exports',
  autoScanBeforePublicCopy: false,
  scanEmails: true,
  scanPrivateIps: true,
  scanTokens: true,
  sanitizeEmails: true,
  sanitizePrivateIps: true,
  sanitizeTokens: true
};
const CASE_STATUSES = { idea: 'Idea', testing: 'Testing', confirmed: 'Confirmed', reported: 'Reported', triaged: 'Triaged', accepted: 'Accepted', duplicate: 'Duplicate', fixed: 'Fixed', published: 'Published', closed: 'Closed' };
const SEVERITIES = { Informational: 'Informational', Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'Critical' };
const CATEGORIES = { 'auth-bypass': 'Auth bypass', idor: 'IDOR', xss: 'XSS', sqli: 'SQL injection', rce: 'RCE', 'path-traversal': 'Path traversal', 'info-disclosure': 'Information disclosure', csrf: 'CSRF', 'business-logic': 'Business logic', other: 'Other' };
const SECTIONS = {
  Summary: '## Summary\n\nDescribe the vulnerability clearly.\n',
  'Affected Component': '## Affected Component\n\n- Product:\n- Version:\n- Component/endpoint:\n- Required role:\n',
  'Steps to Reproduce': '## Steps to Reproduce\n\n1. \n2. \n3. \n\n### Expected behavior\n\n### Actual behavior\n',
  'Proof of Concept': '## Proof of Concept\n\nAdd sanitized requests, screenshots, logs, or commands.\n',
  Impact: '## Impact\n\nExplain the realistic security impact.\n',
  Remediation: '## Suggested Remediation\n\nDescribe the recommended fix.\n',
  Timeline: '## Disclosure Timeline\n\n- YYYY-MM-DD: Vulnerability discovered.\n- YYYY-MM-DD: Report submitted.\n',
  References: '## References\n\n- \n'
};
const STARTER_TEMPLATES = {
  'responsible-disclosure-report.md': '# Responsible Disclosure Report\n\n## Summary\n\n{{title}}\n\n## Target\n\n- Target: {{target}}\n- Vendor: {{vendor}}\n- Category: {{category}}\n- Severity: {{severity}}\n- CWE: {{cwe}}\n- CVSS: {{cvss}}\n\n## Steps to reproduce\n\n1. \n2. \n3. \n\n## Impact\n\n\n## Suggested remediation\n\n\n## Timeline\n\n- {{today}}: Report drafted.\n',
  'bug-bounty-report.md': '# Bug Bounty Report\n\n## Title\n\n{{title}}\n\n## Summary\n\n## Target\n\n{{target}}\n\n## Reproduction steps\n\n1. \n2. \n3. \n\n## Impact\n\n## Suggested fix\n',
  'cve-request-notes.md': '# CVE Request Notes\n\n## Vulnerability title\n\n{{title}}\n\n## Affected product\n\n- Product: {{target}}\n- Vendor: {{vendor}}\n- Affected version(s):\n- Fixed version:\n\n## CWE\n\n{{cwe}}\n\n## Description\n\n## References\n\n- \n',
  'disclosure-email-template.md': 'Subject: Responsible disclosure report - {{title}}\n\nHello,\n\nI am contacting you to responsibly disclose a potential security issue affecting {{target}}.\n\nSummary:\n{{title}}\n\nSeverity:\n{{severity}}\n\nBest regards,\n',
  'secret-review-checklist.md': '# Secret Review Checklist\n\n- [ ] Run secret scan\n- [ ] Remove Authorization headers\n- [ ] Remove cookies\n- [ ] Remove API keys and tokens\n- [ ] Remove private keys\n- [ ] Review screenshots manually\n'
};

module.exports = class VulnReportKitPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon('shield-check', 'Create vulnerability case', () => this.openCaseModal());
    this.addVisibleCommand({ id: 'create-vulnerability-case', name: 'Create vulnerability case', callback: () => this.openCaseModal() }, 'light');
    this.addVisibleCommand({ id: 'open-quick-start-guide', name: 'Open quick start guide', callback: () => this.openQuickStartGuide() }, 'light');
    this.addVisibleCommand({ id: 'run-local-health-check', name: 'Run local health check', callback: () => this.runLocalHealthCheck() }, 'light');
    this.addVisibleCommand({ id: 'open-vulnerability-dashboard', name: 'Open vulnerability dashboard', callback: () => this.openDashboard() }, 'light');
    this.addVisibleCommand({ id: 'update-current-case-status', name: 'Update current case status', callback: () => this.openStatusModal() }, 'light');
    this.addVisibleCommand({ id: 'generate-final-report', name: 'Generate final Markdown report for current case', callback: () => this.generateFinalReport(true) }, 'light');
    this.addVisibleCommand({ id: 'scan-current-case-for-secrets', name: 'Scan current case for secrets', callback: () => this.scanCurrentCase() }, 'light');
    this.addVisibleCommand({ id: 'create-sanitized-public-copy', name: 'Create sanitized public copy', callback: () => this.createSanitizedPublicCopy() }, 'light');
    this.addVisibleCommand({ id: 'create-demo-case', name: 'Create demo vulnerability case', callback: () => this.createDemoCase() }, 'advanced');
    this.addVisibleCommand({ id: 'open-templates-folder', name: 'Open templates folder', callback: () => this.openTemplatesFolder() }, 'advanced');
    this.addVisibleCommand({ id: 'install-starter-template-pack', name: 'Install starter template pack', callback: () => this.installStarterTemplatePack() }, 'advanced');
    this.addVisibleCommand({ id: 'import-template-pack-from-vault-folder', name: 'Import template pack from vault folder', callback: () => new ImportPackModal(this.app, this.settings, (d) => this.importTemplatePack(d)).open() }, 'advanced');
    this.addVisibleCommand({ id: 'create-note-from-template', name: 'Create note from template', callback: () => this.createNoteFromTemplateModal() }, 'advanced');
    this.addVisibleCommand({ id: 'insert-template-into-current-note', name: 'Insert template into current note', editorCallback: (editor) => this.insertTemplateModal(editor) }, 'advanced');
    this.addVisibleCommand({ id: 'insert-report-section', name: 'Insert report section', editorCallback: (editor) => new PickModal(this.app, 'Insert report section', SECTIONS, (k) => editor.replaceSelection('\n' + SECTIONS[k] + '\n')).open() }, 'advanced');
    this.addVisibleCommand({ id: 'open-exports-folder', name: 'Open exports folder', callback: () => this.openExportsFolder() }, 'advanced');
    this.addVisibleCommand({ id: 'export-current-case-bundle', name: 'Export current case bundle', callback: () => this.exportCurrentCaseBundle() }, 'advanced');
    this.addVisibleCommand({ id: 'create-shareable-case-archive', name: 'Create shareable case archive', callback: () => this.createShareableArchive() }, 'advanced');
    this.addVisibleCommand({ id: 'export-all-cases-index', name: 'Export all cases index', callback: () => this.exportAllCasesIndex() }, 'advanced');
    this.addVisibleCommand({ id: 'backup-templates', name: 'Backup templates', callback: () => this.backupTemplates() }, 'advanced');
    this.addSettingTab(new SettingsTab(this.app, this));
  }
  addVisibleCommand(command, mode) { if (mode !== 'advanced' || this.settings.interfaceMode === 'advanced') this.addCommand(command); }
  async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
  async saveSettings() { await this.saveData(this.settings); }
  openCaseModal() { new CaseModal(this.app, this.settings, (data) => this.createCase(data)).open(); }
  root() { return normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder); }
  templatesFolder() { return normalizePath(this.root() + '/_templates'); }
  exportsFolder() { return normalizePath(this.root() + '/' + (this.settings.exportFolderName || DEFAULT_SETTINGS.exportFolderName)); }
  currentCaseFolder() {
    const f = this.app.workspace.getActiveFile();
    if (!f || !f.parent) return null;
    const root = this.root();
    if (!f.parent.path.startsWith(root + '/')) return null;
    const first = f.parent.path.slice(root.length + 1).split('/')[0];
    return first ? normalizePath(root + '/' + first) : null;
  }
  async createCase(data) {
    const title = (data.title || '').trim() || 'Untitled vulnerability';
    const date = today();
    const folder = await this.availableFolder(this.root() + '/' + date + '-' + slug(title));
    await this.ensureFolder(folder + '/attachments');
    const ctx = Object.assign({}, data, { title, created: date, last_updated: date, case_folder: folder });
    const files = {
      '00-overview.md': overviewTemplate(ctx),
      '01-target.md': '# Target\n\n- Target: ' + (ctx.target || '') + '\n- Vendor: ' + (ctx.vendor || '') + '\n- Version tested:\n- Environment:\n',
      '02-reproduction.md': '# Reproduction\n\n## Preconditions\n\n- \n\n## Steps to reproduce\n\n1. \n2. \n3. \n\n## Expected behavior\n\n## Actual behavior\n',
      '03-impact.md': '# Impact\n\n## Security impact\n\n## Affected users or data\n\n## Severity rationale\n\nSeverity: ' + (ctx.severity || '') + '\nCWE: ' + (ctx.cwe || '') + '\nCVSS: ' + (ctx.cvss || '') + '\n',
      '04-evidence.md': '# Evidence\n\n## Screenshots / recordings\n\n## Logs / requests / responses\n\n```http\n# Paste sanitized evidence here\n```\n',
      '05-remediation.md': '# Remediation\n\n## Suggested fix\n\n## Defense in depth\n\n- \n',
      '06-timeline.md': '# Disclosure Timeline\n\n- ' + date + ': Case created.\n',
      '08-article-draft.md': '# Article Draft\n\n## Working title\n\n' + title + '\n\n## Public, sanitized summary\n\n'
    };
    let overview = null;
    for (const [name, content] of Object.entries(files)) { const f = await this.createIfMissing(folder + '/' + name, content); if (name === '00-overview.md') overview = f; }
    new Notice('Vulnerability case created: ' + title);
    if (overview) await this.app.workspace.getLeaf(false).openFile(overview);
    return folder;
  }
  async createDemoCase() {
    const folder = await this.createCase({ title: 'Demo IDOR in invoice download', target: 'Example SaaS', vendor: 'Example Vendor', category: 'idor', severity: 'Medium', status: 'testing', language: this.settings.defaultLanguage, cwe: 'CWE-639', cvss: '', disclosure: 'private' });
    await this.write(folder + '/02-reproduction.md', '# Reproduction\n\n1. Log in as Alice.\n2. Request another user invoice.\n\n```http\nGET /api/invoices/INV-2002/download HTTP/1.1\nHost: app.example.test\nAuthorization: Bearer <REDACTED_TOKEN>\nCookie: <REDACTED_COOKIE>\n```\n');
    await this.write(folder + '/03-impact.md', '# Impact\n\nA user may access invoice documents belonging to another account.\n');
  }
  async openQuickStartGuide() {
    await this.ensureFolder(this.root());
    const f = await this.write(this.root() + '/_vuln-report-kit-quickstart.md', '# Vuln Report Kit Quick Start\n\nVersion: ' + PLUGIN_VERSION + '\nMode: ' + (this.settings.interfaceMode || 'light') + '\n\n## Modes\n\n- Light mode shows the essential workflow commands.\n- Advanced mode enables templates, exports, backups, demo utilities, and extra helpers.\n\nChange mode in settings and reload the plugin to refresh visible commands.\n\n## Workflow\n\n1. Create a vulnerability case.\n2. Generate a final Markdown report.\n3. Scan for secrets.\n4. Create a sanitized public copy.\n5. Refresh the dashboard.\n');
    await this.app.workspace.getLeaf(false).openFile(f);
  }
  async runLocalHealthCheck() {
    const cases = await this.collectCases();
    const templates = await this.listTemplates();
    const f = await this.write(this.root() + '/_vuln-report-kit-health-check.md', '# Vuln Report Kit Health Check\n\nGenerated: ' + new Date().toISOString() + '\n\n- Version: ' + PLUGIN_VERSION + '\n- Mode: ' + (this.settings.interfaceMode || 'light') + '\n- Cases: ' + cases.length + '\n- Templates: ' + templates.length + '\n- Root folder: `' + this.root() + '`\n');
    await this.app.workspace.getLeaf(false).openFile(f);
  }
  async collectCases() {
    const root = this.root();
    const files = this.app.vault.getMarkdownFiles().filter(f => f.basename === '00-overview' && f.parent && f.parent.path.startsWith(root + '/'));
    const rows = [];
    for (const f of files) {
      const fm = frontmatter(await this.app.vault.read(f));
      rows.push({ title: fm.title || f.parent.name, target: fm.target || '', vendor: fm.vendor || '', category: fm.category || '', severity: fm.severity || '', status: fm.status || 'idea', cwe: fm.cwe || '', cvss: fm.cvss || '', created: fm.created || '', updated: fm.last_updated || dateFromMs(f.stat.mtime), folder: f.parent.path, path: f.path });
    }
    rows.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
    return rows;
  }
  async openDashboard() {
    const rows = await this.collectCases();
    const lines = ['# Vuln Report Kit Dashboard', '', 'Generated: ' + new Date().toISOString(), '', '- Total cases: ' + rows.length, '', '| Case | Target | Category | Severity | Status | CWE | CVSS | Updated |', '|---|---|---|---|---|---|---|---|'];
    for (const r of rows) lines.push('| [[' + r.path.replace(/\.md$/,'') + '|' + table(r.title) + ']] | ' + table(r.target) + ' | ' + table(r.category) + ' | ' + table(r.severity) + ' | ' + table(CASE_STATUSES[r.status] || r.status) + ' | ' + table(r.cwe) + ' | ' + table(r.cvss) + ' | ' + table(r.updated) + ' |');
    const f = await this.write(this.root() + '/_vuln-report-dashboard.md', lines.join('\n'));
    await this.app.workspace.getLeaf(false).openFile(f);
  }
  async openStatusModal() {
    const folder = this.currentCaseFolder();
    if (!folder) return new Notice('Open a note inside a vulnerability case folder first.');
    const file = this.app.vault.getAbstractFileByPath(folder + '/00-overview.md');
    const current = file instanceof TFile ? (frontmatter(await this.app.vault.read(file)).status || 'idea') : 'idea';
    new StatusModal(this.app, current, s => this.updateStatus(s)).open();
  }
  async updateStatus(status) {
    const folder = this.currentCaseFolder();
    if (!folder) return;
    const f = this.app.vault.getAbstractFileByPath(folder + '/00-overview.md');
    if (!(f instanceof TFile)) return new Notice('00-overview.md not found.');
    let c = await this.app.vault.read(f);
    c = setFm(c, 'status', status);
    c = setFm(c, 'last_updated', today());
    c = c.replace(/^- Status:\s*.*$/m, '- Status: ' + status);
    await this.app.vault.modify(f, c);
    const t = this.app.vault.getAbstractFileByPath(folder + '/06-timeline.md');
    if (t instanceof TFile) await this.app.vault.modify(t, (await this.app.vault.read(t)).trimEnd() + '\n- ' + today() + ': Status updated to ' + (CASE_STATUSES[status] || status) + '.\n');
    new Notice('Case status updated: ' + (CASE_STATUSES[status] || status));
  }
  caseFiles(folder) { return this.app.vault.getMarkdownFiles().filter(f => f.parent && f.parent.path === folder); }
  async generateFinalReport(open) {
    const folder = this.currentCaseFolder();
    if (!folder) return new Notice('Open a note inside a vulnerability case folder first.');
    const files = this.caseFiles(folder).filter(f => !['99-final-report','99-public-report','secret-scan-report'].includes(f.basename) && f.basename !== '08-article-draft').sort((a,b)=>a.path.localeCompare(b.path));
    const chunks = ['# Final Vulnerability Report\n', 'Generated: ' + new Date().toISOString() + '\n', 'Source folder: `' + folder + '`\n'];
    for (const file of files) { const body = stripFm(await this.app.vault.read(file)).trim(); if (body) chunks.push('\n---\n\n<!-- Source: ' + file.name + ' -->\n\n' + body + '\n'); }
    const f = await this.write(folder + '/99-final-report.md', chunks.join('\n'));
    if (open) await this.app.workspace.getLeaf(false).openFile(f);
    return f;
  }
  async scanCurrentCase() {
    const folder = this.currentCaseFolder();
    if (!folder) return new Notice('Open a note inside a vulnerability case folder first.');
    const f = await this.scanFolder(folder);
    await this.app.workspace.getLeaf(false).openFile(f);
  }
  async scanFolder(folder) {
    const findings = [];
    for (const file of this.caseFiles(folder).filter(f => f.basename !== 'secret-scan-report')) {
      const lines = (await this.app.vault.read(file)).split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/vrk-ignore|secret-scan-ignore|vuln-report-kit-ignore/i.test(line)) return;
        if (this.settings.scanTokens !== false && /(Authorization:\s*\S+\s+\S{8,}|Bearer\s+[A-Za-z0-9._\-+/=]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk_(live|test)_[A-Za-z0-9]{16,}|-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----)/i.test(line)) findings.push([file.name, i+1, 'Potential token/secret', safe(line)]);
        if (this.settings.scanEmails !== false && /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(line)) findings.push([file.name, i+1, 'Email address', safe(line)]);
        if (this.settings.scanPrivateIps !== false && /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/.test(line)) findings.push([file.name, i+1, 'Private IP address', safe(line)]);
      });
    }
    const out = ['# Secret Scan Report', '', 'Generated: ' + new Date().toISOString(), 'Case folder: `' + folder + '`', '', 'Total findings: ' + findings.length, '', '| File | Line | Type | Excerpt |', '|---|---:|---|---|'];
    for (const x of findings) out.push('| ' + table(x[0]) + ' | ' + x[1] + ' | ' + table(x[2]) + ' | `' + table(x[3]) + '` |');
    return await this.write(folder + '/secret-scan-report.md', out.join('\n'));
  }
  async createSanitizedPublicCopy() {
    const folder = this.currentCaseFolder();
    if (!folder) return new Notice('Open a note inside a vulnerability case folder first.');
    if (this.settings.autoScanBeforePublicCopy) await this.scanFolder(folder);
    let src = this.app.vault.getAbstractFileByPath(folder + '/99-final-report.md');
    if (!(src instanceof TFile)) src = await this.generateFinalReport(false);
    const f = await this.write(folder + '/99-public-report.md', sanitize(await this.app.vault.read(src), this.settings));
    await this.app.workspace.getLeaf(false).openFile(f);
  }
  async openTemplatesFolder() { await this.ensureFolder(this.templatesFolder()); const f = await this.createIfMissing(this.templatesFolder() + '/README.md', '# Vuln Report Kit Templates\n\nUse Advanced mode commands to install starter templates or import custom template packs.\n'); await this.app.workspace.getLeaf(false).openFile(f); }
  async installStarterTemplatePack() { const folder = this.templatesFolder() + '/starter'; await this.ensureFolder(folder); let c=0,s=0; for (const [n,t] of Object.entries(STARTER_TEMPLATES)) { if (this.app.vault.getAbstractFileByPath(folder + '/' + n)) s++; else { await this.app.vault.create(folder + '/' + n, t); c++; } } new Notice('Starter template pack installed. Created ' + c + ', skipped ' + s + '.'); }
  async listTemplates() { const root = this.templatesFolder(); return this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(root + '/') && !['README','_import-summary'].includes(f.basename)).map(f => ({ path: f.path, name: f.basename, display: f.path.slice(root.length + 1) })).sort((a,b)=>a.display.localeCompare(b.display)); }
  async templateContext() { const folder = this.currentCaseFolder(); const base = { today: today(), date: today(), title:'', target:'', vendor:'', category:'', severity:'', status:'', cwe:'', cvss:'', case_folder: folder || '' }; if (!folder) return base; const f = this.app.vault.getAbstractFileByPath(folder + '/00-overview.md'); return f instanceof TFile ? Object.assign(base, frontmatter(await this.app.vault.read(f))) : base; }
  async createNoteFromTemplateModal() { const ts = await this.listTemplates(); if (!ts.length) return new Notice('No templates found.'); new TemplateModal(this.app, ts, this.currentCaseFolder() || this.root(), async d => { const src = this.app.vault.getAbstractFileByPath(d.templatePath); if (!(src instanceof TFile)) return; const outFolder = normalizePath(d.outputFolder || this.root()); await this.ensureFolder(outFolder); const path = await this.availableFile(outFolder + '/' + slug(d.outputTitle || src.basename) + '.md'); const f = await this.app.vault.create(path, vars(await this.app.vault.read(src), await this.templateContext())); await this.app.workspace.getLeaf(false).openFile(f); }).open(); }
  async insertTemplateModal(editor) { const ts = await this.listTemplates(); if (!ts.length) return new Notice('No templates found.'); new PickTemplateModal(this.app, ts, async path => { const src = this.app.vault.getAbstractFileByPath(path); if (src instanceof TFile) editor.replaceSelection('\n' + vars(await this.app.vault.read(src), await this.templateContext()) + '\n'); }).open(); }
  async importTemplatePack(d) { const source = normalizePath(d.sourceFolder || ''); const sf = this.app.vault.getAbstractFileByPath(source); if (!(sf instanceof TFolder)) return new Notice('Template pack source folder not found.'); const dest = this.templatesFolder() + '/' + slug(d.packName || sf.name || 'imported-pack'); await this.ensureFolder(dest); let copied=0, skipped=0; for (const f of this.app.vault.getMarkdownFiles().filter(f=>f.path.startsWith(source + '/'))) { const rel=f.path.slice(source.length+1); const dp=normalizePath(dest + '/' + rel); await this.ensureParent(dp); const ex=this.app.vault.getAbstractFileByPath(dp); if (ex instanceof TFile && !d.overwrite) skipped++; else { const content=await this.app.vault.read(f); if (ex instanceof TFile) await this.app.vault.modify(ex, content); else await this.app.vault.create(dp, content); copied++; } } new Notice('Template pack imported: ' + copied + ' copied, ' + skipped + ' skipped.'); }
  async openExportsFolder() { await this.ensureFolder(this.exportsFolder()); const f = await this.createIfMissing(this.exportsFolder() + '/README.md', '# Vuln Report Kit Exports\n\nLocal exports, backups and shareable archives.\n'); await this.app.workspace.getLeaf(false).openFile(f); }
  async exportCurrentCaseBundle() { const folder=this.currentCaseFolder(); if(!folder) return new Notice('Open a case note first.'); const dest=await this.availableFolder(this.exportsFolder()+'/'+today()+'-'+slug(folder.split('/').pop())+'-bundle'); await this.ensureFolder(dest); for (const f of this.app.vault.getFiles().filter(f=>f.path.startsWith(folder+'/'))) await this.copyFile(f, normalizePath(dest+'/'+f.path.slice(folder.length+1))); new Notice('Case bundle exported.'); }
  async createShareableArchive() { const folder=this.currentCaseFolder(); if(!folder) return new Notice('Open a case note first.'); const dest=await this.availableFolder(this.exportsFolder()+'/'+today()+'-'+slug(folder.split('/').pop())+'-shareable'); await this.ensureFolder(dest); await this.generateFinalReport(false); await this.scanFolder(folder); const src=this.app.vault.getAbstractFileByPath(folder+'/99-final-report.md'); if(src instanceof TFile) await this.write(dest+'/99-public-report.md', sanitize(await this.app.vault.read(src), this.settings)); const scan=this.app.vault.getAbstractFileByPath(folder+'/secret-scan-report.md'); if(scan instanceof TFile) await this.write(dest+'/secret-scan-report.md', await this.app.vault.read(scan)); new Notice('Shareable archive created. Review it manually before sharing.'); }
  async exportAllCasesIndex() { const cases=await this.collectCases(); const lines=['# Vuln Report Kit - All Cases Index','','Generated: '+new Date().toISOString(),'','| Title | Target | Severity | Status | Folder |','|---|---|---|---|---|']; for(const c of cases) lines.push('| '+table(c.title)+' | '+table(c.target)+' | '+table(c.severity)+' | '+table(c.status)+' | `'+table(c.folder)+'` |'); const f=await this.write(this.exportsFolder()+'/'+today()+'-all-cases-index.md', lines.join('\n')); await this.app.workspace.getLeaf(false).openFile(f); }
  async backupTemplates() { const src=this.templatesFolder(); const dest=await this.availableFolder(this.exportsFolder()+'/'+today()+'-template-backup'); await this.ensureFolder(dest); for(const f of this.app.vault.getFiles().filter(f=>f.path.startsWith(src+'/'))) await this.copyFile(f, normalizePath(dest+'/_templates/'+f.path.slice(src.length+1))); new Notice('Template backup created.'); }
  async copyFile(src, dest) { await this.ensureParent(dest); const ex=this.app.vault.getAbstractFileByPath(dest); if (['md','txt','json','csv','yaml','yml','xml','html','css','js','ts','log','http'].includes(String(src.extension).toLowerCase())) { const c=await this.app.vault.read(src); if(ex instanceof TFile) await this.app.vault.modify(ex,c); else await this.app.vault.create(dest,c); } else if(this.app.vault.readBinary && this.app.vault.createBinary) { const b=await this.app.vault.readBinary(src); if(!(ex instanceof TFile)) await this.app.vault.createBinary(dest,b); } }
  async ensureFolder(path) { const p=normalizePath(path); if(!p || this.app.vault.getAbstractFileByPath(p)) return; const parts=p.split('/'); let cur=''; for(const x of parts){ cur=cur?cur+'/'+x:x; if(!this.app.vault.getAbstractFileByPath(cur)) await this.app.vault.createFolder(cur); } }
  async ensureParent(path) { const i=normalizePath(path).lastIndexOf('/'); if(i>-1) await this.ensureFolder(path.slice(0,i)); }
  async createIfMissing(path, content) { await this.ensureParent(path); const ex=this.app.vault.getAbstractFileByPath(path); return ex instanceof TFile ? ex : await this.app.vault.create(path, content); }
  async write(path, content) { await this.ensureParent(path); const ex=this.app.vault.getAbstractFileByPath(path); if(ex instanceof TFile){ await this.app.vault.modify(ex, content); return ex; } return await this.app.vault.create(path, content); }
  async availableFolder(path){ let p=normalizePath(path), i=2; while(this.app.vault.getAbstractFileByPath(p)) p=normalizePath(path+'-'+i++); return p; }
  async availableFile(path){ let p=normalizePath(path), i=2, dot=p.lastIndexOf('.'), base=dot>-1?p.slice(0,dot):p, ext=dot>-1?p.slice(dot):''; while(this.app.vault.getAbstractFileByPath(p)) p=base+'-'+i+++ext; return p; }
};

class CaseModal extends Modal { constructor(app, settings, cb){ super(app); this.cb=cb; this.d={ title:'', target:'', vendor:'', category:'auth-bypass', severity:settings.defaultSeverity||'Medium', status:settings.defaultStatus||'idea', language:settings.defaultLanguage||'English', cwe:'', cvss:'', disclosure:'private' }; } onOpen(){ const e=this.contentEl; e.empty(); e.createEl('h2',{text:'Create vulnerability case'}); text(e,'Title','Vulnerability title',v=>this.d.title=v); text(e,'Target','Target',v=>this.d.target=v); text(e,'Vendor','Vendor or maintainer',v=>this.d.vendor=v); dropdown(e,'Category',CATEGORIES,this.d.category,v=>this.d.category=v); dropdown(e,'Severity',SEVERITIES,this.d.severity,v=>this.d.severity=v); dropdown(e,'Initial status',CASE_STATUSES,this.d.status,v=>this.d.status=v); text(e,'CWE','CWE-XXX',v=>this.d.cwe=v); text(e,'CVSS','CVSS score or vector',v=>this.d.cvss=v); dropdown(e,'Report language',{English:'English',Italian:'Italian'},this.d.language,v=>this.d.language=v); new Setting(e).addButton(b=>b.setButtonText('Create case').setCta().onClick(()=>{this.close();this.cb(this.d);})); } onClose(){ this.contentEl.empty(); } }
class StatusModal extends Modal { constructor(app,current,cb){ super(app); this.status=current||'idea'; this.cb=cb; } onOpen(){ const e=this.contentEl; e.empty(); e.createEl('h2',{text:'Update case status'}); dropdown(e,'Status',CASE_STATUSES,this.status,v=>this.status=v); new Setting(e).addButton(b=>b.setButtonText('Update status').setCta().onClick(()=>{this.close();this.cb(this.status);})); } onClose(){this.contentEl.empty();} }
class PickModal extends Modal { constructor(app,title,options,cb){ super(app); this.title=title; this.options=options; this.key=Object.keys(options)[0]; this.cb=cb; } onOpen(){ const e=this.contentEl; e.empty(); e.createEl('h2',{text:this.title}); const opts={}; Object.keys(this.options).forEach(k=>opts[k]=k); dropdown(e,'Item',opts,this.key,v=>this.key=v); new Setting(e).addButton(b=>b.setButtonText('Insert').setCta().onClick(()=>{this.close();this.cb(this.key);})); } onClose(){this.contentEl.empty();} }
class ImportPackModal extends Modal { constructor(app,settings,cb){ super(app); this.cb=cb; this.d={sourceFolder:settings.defaultTemplatePackSource||'_vuln-template-pack',packName:'',overwrite:false}; } onOpen(){ const e=this.contentEl; e.empty(); e.createEl('h2',{text:'Import template pack'}); text(e,'Source folder inside vault','_vuln-template-pack',v=>this.d.sourceFolder=v,this.d.sourceFolder); text(e,'Pack name','advanced-template-pack',v=>this.d.packName=v); new Setting(e).setName('Overwrite existing templates').addToggle(t=>t.setValue(false).onChange(v=>this.d.overwrite=v)); new Setting(e).addButton(b=>b.setButtonText('Import pack').setCta().onClick(()=>{this.close();this.cb(this.d);})); } onClose(){this.contentEl.empty();} }
class TemplateModal extends Modal { constructor(app,templates,folder,cb){ super(app); this.templates=templates; this.cb=cb; this.d={templatePath:templates[0]?.path||'',outputTitle:templates[0]?.name||'new-note',outputFolder:folder}; } onOpen(){ const e=this.contentEl; e.empty(); e.createEl('h2',{text:'Create note from template'}); const opts={}; this.templates.forEach(t=>opts[t.path]=t.display); dropdown(e,'Template',opts,this.d.templatePath,v=>this.d.templatePath=v); text(e,'Output title','new-note',v=>this.d.outputTitle=v,this.d.outputTitle); text(e,'Output folder','Folder inside vault',v=>this.d.outputFolder=v,this.d.outputFolder); new Setting(e).addButton(b=>b.setButtonText('Create note').setCta().onClick(()=>{this.close();this.cb(this.d);})); } onClose(){this.contentEl.empty();} }
class PickTemplateModal extends Modal { constructor(app,templates,cb){ super(app); this.templates=templates; this.cb=cb; this.path=templates[0]?.path||''; } onOpen(){ const e=this.contentEl; e.empty(); e.createEl('h2',{text:'Insert template'}); const opts={}; this.templates.forEach(t=>opts[t.path]=t.display); dropdown(e,'Template',opts,this.path,v=>this.path=v); new Setting(e).addButton(b=>b.setButtonText('Insert').setCta().onClick(()=>{this.close();this.cb(this.path);})); } onClose(){this.contentEl.empty();} }
class SettingsTab extends PluginSettingTab { constructor(app,plugin){ super(app,plugin); this.plugin=plugin; } display(){ const e=this.containerEl; const p=this.plugin; e.empty(); e.createEl('h2',{text:'Vuln Report Kit settings'}); e.createEl('p',{text:'Version '+PLUGIN_VERSION}); e.createEl('h3',{text:'Interface mode'}); new Setting(e).setName('Mode').setDesc('Light shows essential commands. Advanced enables template management, exports, backups, demo utilities, and extra helpers. Reload the plugin after changing this setting.').addDropdown(d=>d.addOptions({light:'Light',advanced:'Advanced'}).setValue(p.settings.interfaceMode||'light').onChange(async v=>{p.settings.interfaceMode=v; await p.saveSettings(); new Notice('Mode saved. Reload the plugin to refresh visible commands.');})); e.createEl('h3',{text:'Core settings'}); savedText(e,p,'Root folder','rootFolder'); savedText(e,p,'Default template pack source','defaultTemplatePackSource'); dropdownSetting(e,p,'Default language',{English:'English',Italian:'Italian'},'defaultLanguage'); dropdownSetting(e,p,'Default severity',SEVERITIES,'defaultSeverity'); dropdownSetting(e,p,'Default status',CASE_STATUSES,'defaultStatus'); e.createEl('h3',{text:'Quick actions'}); new Setting(e).setName('Open quick start guide').addButton(b=>b.setButtonText('Open').onClick(()=>p.openQuickStartGuide())); new Setting(e).setName('Run local health check').addButton(b=>b.setButtonText('Run').onClick(()=>p.runLocalHealthCheck())); e.createEl('h3',{text:'Secret scanner'}); bool(e,p,'Auto-scan before public copy','autoScanBeforePublicCopy'); bool(e,p,'Scan emails','scanEmails'); bool(e,p,'Scan private IPs','scanPrivateIps'); bool(e,p,'Scan tokens and secrets','scanTokens'); e.createEl('h3',{text:'Sanitization'}); bool(e,p,'Sanitize emails','sanitizeEmails'); bool(e,p,'Sanitize private IPs','sanitizePrivateIps'); bool(e,p,'Sanitize tokens and secrets','sanitizeTokens'); } }
function text(el,name,ph,cb,val=''){ new Setting(el).setName(name).addText(t=>t.setPlaceholder(ph).setValue(val).onChange(cb)); }
function dropdown(el,name,opts,val,cb){ new Setting(el).setName(name).addDropdown(d=>d.addOptions(opts).setValue(val).onChange(cb)); }
function savedText(el,p,name,key){ new Setting(el).setName(name).addText(t=>t.setValue(p.settings[key]||DEFAULT_SETTINGS[key]).onChange(async v=>{p.settings[key]=v.trim()||DEFAULT_SETTINGS[key]; await p.saveSettings();})); }
function dropdownSetting(el,p,name,opts,key){ new Setting(el).setName(name).addDropdown(d=>d.addOptions(opts).setValue(p.settings[key]||DEFAULT_SETTINGS[key]).onChange(async v=>{p.settings[key]=v; await p.saveSettings();})); }
function bool(el,p,name,key){ new Setting(el).setName(name).addToggle(t=>t.setValue(Boolean(p.settings[key])).onChange(async v=>{p.settings[key]=v; await p.saveSettings();})); }
function overviewTemplate(c){ return '---\ntype: vulnerability-case\ntitle: "'+yaml(c.title)+'"\ntarget: "'+yaml(c.target)+'"\nvendor: "'+yaml(c.vendor)+'"\ncategory: "'+yaml(c.category)+'"\nseverity: "'+yaml(c.severity)+'"\nstatus: "'+yaml(c.status||'idea')+'"\nlanguage: "'+yaml(c.language)+'"\ncwe: "'+yaml(c.cwe)+'"\ncvss: "'+yaml(c.cvss)+'"\ndisclosure: "'+yaml(c.disclosure)+'"\ncreated: '+c.created+'\nlast_updated: '+c.last_updated+'\ntags:\n  - vuln-research\n  - '+yaml(c.category)+'\n---\n\n# '+c.title+'\n\n## Summary\n\nDescribe the vulnerability in a clear, concise way.\n\n## Current status\n\n- Status: '+(c.status||'idea')+'\n- Severity: '+(c.severity||'')+'\n- Category: '+(c.category||'')+'\n- CWE: '+(c.cwe||'')+'\n- CVSS: '+(c.cvss||'')+'\n\n## Quick notes\n\n- \n'; }
function sanitize(s,settings){ let o=String(s||''); if(settings.sanitizeTokens!==false){ o=o.replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,'<REDACTED_PRIVATE_KEY>'); o=o.replace(/\bAuthorization:\s*Bearer\s+[^\n\r`'"<>]{8,}/gi,'Authorization: Bearer <REDACTED_TOKEN>'); o=o.replace(/\bBearer\s+[A-Za-z0-9._\-+/=]{20,}\b/gi,'Bearer <REDACTED_TOKEN>'); o=o.replace(/\b(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,'<REDACTED_GITHUB_TOKEN>'); o=o.replace(/\bsk_(live|test)_[A-Za-z0-9]{16,}\b/g,'<REDACTED_STRIPE_KEY>'); o=o.replace(/\bCookie:\s*[^\n\r]+/gi,'Cookie: <REDACTED_COOKIE>'); } if(settings.sanitizeEmails!==false) o=o.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'<EMAIL>'); if(settings.sanitizePrivateIps!==false) o=o.replace(/\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/g,'<PRIVATE_IP>'); return o; }
function safe(s){ let x=sanitize(s,{sanitizeTokens:true,sanitizeEmails:true,sanitizePrivateIps:true}); return x.length>120?x.slice(0,117)+'...':x; }
function vars(s,c){ return String(s||'').replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(c,k)?String(c[k]||''):m); }
function stripFm(s){ return String(s||'').replace(/^---\n[\s\S]*?\n---\n?/,''); }
function frontmatter(s){ const m=String(s||'').match(/^---\n([\s\S]*?)\n---/); const r={}; if(!m) return r; for(const line of m[1].split(/\r?\n/)){ const x=line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/); if(x){ let v=x[2].trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); r[x[1]]=v; }} return r; }
function setFm(content,key,value){ const v='"'+yaml(value)+'"'; if(!content.startsWith('---\n')) return '---\n'+key+': '+v+'\n---\n\n'+content; const end=content.indexOf('\n---',4); if(end<0) return content; const fm=content.slice(4,end); const body=content.slice(end); const re=new RegExp('^'+esc(key)+':\\s*.*$','m'); const nfm=re.test(fm)?fm.replace(re,key+': '+v):fm.trimEnd()+'\n'+key+': '+v; return '---\n'+nfm+'\n'+body; }
function yaml(v){ return String(v||'').replace(/"/g,'\\"'); }
function table(v){ return String(v||'').replace(/\|/g,'\\|').replace(/`/g,'\\`').replace(/\n/g,' '); }
function slug(v){ return String(v||'untitled').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'untitled'; }
function today(){ return new Date().toISOString().slice(0,10); }
function dateFromMs(ms){ try{return new Date(ms).toISOString().slice(0,10);}catch{return '';} }
function esc(v){ return String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
