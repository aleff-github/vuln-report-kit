const {
	Plugin,
	Modal,
	Setting,
	Notice,
	PluginSettingTab,
	TFile,
	TFolder,
	normalizePath
} = require('obsidian');

const PLUGIN_VERSION = '1.0.0';

const DEFAULT_SETTINGS = {
	rootFolder: 'Vulnerability Research',
	defaultLanguage: 'English',
	defaultSeverity: 'Medium',
	defaultStatus: 'idea',
	defaultTemplatePackSource: '_vuln-template-pack',
	exportFolderName: '_exports',
	autoScanBeforePublicCopy: false,
	ignoreRedactedValues: true,
	ignoreScanComments: true,
	scanPrivateKeys: true,
	scanAuthorizationHeaders: true,
	scanJwtTokens: true,
	scanAwsKeys: true,
	scanGitHubTokens: true,
	scanGoogleApiKeys: true,
	scanSlackTokens: true,
	scanStripeKeys: true,
	scanGenericSecrets: true,
	scanCookies: true,
	scanSessionIds: true,
	scanPasswords: true,
	scanEmails: true,
	scanPrivateIps: true,
	scanLocalhostUrls: true,
	scanBasicAuthUrls: true,
	sanitizeEmails: true,
	sanitizePrivateIps: true,
	sanitizeLocalhostUrls: true,
	sanitizeTokens: true,
	sanitizeAuthorizationHeaders: true,
	sanitizePrivateKeys: true,
	sanitizeAwsKeys: true,
	sanitizeGitHubTokens: true,
	sanitizeGoogleApiKeys: true,
	sanitizeSlackTokens: true,
	sanitizeStripeKeys: true,
	sanitizeJwtTokens: true,
	sanitizeCookies: true,
	sanitizePasswords: true,
	sanitizeBasicAuthUrls: true
};

const CASE_STATUSES = {
	'idea': 'Idea',
	'testing': 'Testing',
	'confirmed': 'Confirmed',
	'reported': 'Reported',
	'triaged': 'Triaged',
	'accepted': 'Accepted',
	'duplicate': 'Duplicate',
	'fixed': 'Fixed',
	'published': 'Published',
	'closed': 'Closed'
};

const DISCLOSURE_TYPES = {
	'private': 'Private disclosure',
	'bug-bounty': 'Bug bounty',
	'coordinated': 'Coordinated disclosure',
	'public-writeup': 'Public write-up',
	'internal': 'Internal research',
	'other': 'Other'
};

const REPORT_SECTIONS = {
	'Summary': `## Summary\n\nDescribe the vulnerability in one or two clear paragraphs.\n`,
	'Affected Component': `## Affected Component\n\n- Product:\n- Version:\n- Component/endpoint:\n- Required role:\n`,
	'Steps to Reproduce': `## Steps to Reproduce\n\n1. \n2. \n3. \n\n### Expected behavior\n\n\n### Actual behavior\n\n`,
	'Proof of Concept': `## Proof of Concept\n\nAdd sanitized requests, screenshots, logs, or commands.\n`,
	'Impact': `## Impact\n\nExplain the security impact, affected users/data, and realistic attack scenario.\n`,
	'Remediation': `## Suggested Remediation\n\nDescribe the recommended fix and any defense-in-depth measures.\n`,
	'Timeline': `## Disclosure Timeline\n\n- YYYY-MM-DD: Vulnerability discovered.\n- YYYY-MM-DD: Report submitted.\n- YYYY-MM-DD: Vendor response.\n- YYYY-MM-DD: Fix released.\n`,
	'References': `## References\n\n- \n`,
	'Public Disclosure Notes': `## Public Disclosure Notes\n\nDocument what was removed, redacted, generalized, or intentionally omitted from the public version.\n`
};

const STARTER_TEMPLATE_PACK = {
	'responsible-disclosure-report.md': `# Responsible Disclosure Report

## Summary

{{title}}

## Affected target

- Target: {{target}}
- Vendor: {{vendor}}
- Category: {{category}}
- Severity: {{severity}}
- CWE: {{cwe}}
- CVSS: {{cvss}}

## Technical details

Describe the vulnerability and the vulnerable component.

## Steps to reproduce

1. 
2. 
3. 

## Impact

Explain the realistic security impact.

## Suggested remediation

Describe the recommended fix.

## Disclosure timeline

- {{date}}: Report drafted.

## References

- 
`,
	'bug-bounty-report.md': `# Bug Bounty Report

## Title

{{title}}

## Summary

Provide a concise summary suitable for a triager.

## Target

{{target}}

## Vulnerability type

{{category}}

## Severity

{{severity}}

## Reproduction steps

1. 
2. 
3. 

## Proof of concept

Paste sanitized evidence only.

## Impact


## Suggested fix


## Additional notes

`,
	'cve-request-template.md': `# CVE Request Notes

## Vulnerability title

{{title}}

## Affected product

- Product: {{target}}
- Vendor: {{vendor}}
- Affected version(s):
- Fixed version:

## Vulnerability type

- Category: {{category}}
- CWE: {{cwe}}

## Description

Write a concise description of the vulnerability.

## Impact


## Attack requirements

- Authentication required:
- User interaction required:
- Network access required:

## References

- Advisory:
- Patch:
- Report:
`,
	'wordpress-plugin-vuln-report.md': `# WordPress Plugin Vulnerability Report

## Summary

{{title}}

## Plugin information

- Plugin/theme name: {{target}}
- Vendor/maintainer: {{vendor}}
- Version tested:
- WordPress version:
- PHP version:

## Vulnerability classification

- Category: {{category}}
- CWE: {{cwe}}
- Severity: {{severity}}
- CVSS: {{cvss}}

## Vulnerable endpoint / hook / function


## Reproduction environment


## Steps to reproduce

1. 
2. 
3. 

## Impact


## Remediation


## Disclosure notes

`,
	'api-security-report.md': `# API Security Report

## Summary

{{title}}

## API / endpoint

- Target: {{target}}
- Endpoint:
- Method:
- Required role:

## Vulnerability type

{{category}}

## Request example

\`\`\`http
# Sanitized request
\`\`\`

## Response example

\`\`\`http
# Sanitized response
\`\`\`

## Steps to reproduce

1. 
2. 
3. 

## Impact


## Recommended fix

`,
	'medium-article-template.md': `# Medium Article Draft

## Working title

{{title}}

## Hook

Open with the problem, not with tool output.

## Context

Explain the affected product or class of vulnerability without exposing sensitive details.

## Technical explanation

Describe the root cause in a safe and educational way.

## Impact


## Responsible disclosure timeline


## Lessons learned


## References

- 
`,
	'disclosure-email-template.md': `Subject: Responsible disclosure report - {{title}}

Hello,

I am contacting you to responsibly disclose a potential security issue affecting {{target}}.

Summary:
{{title}}

Severity:
{{severity}}

I can provide technical details, reproduction steps, and sanitized evidence in the attached report.

Please confirm receipt of this message and let me know the preferred process for coordinated disclosure.

Best regards,
`,
	'owasp-checklist.md': `# OWASP Review Checklist

## Access control

- [ ] IDOR / broken object-level authorization checked
- [ ] Privilege escalation checked
- [ ] Missing function-level authorization checked

## Injection

- [ ] SQL injection checked
- [ ] Command injection checked
- [ ] Template injection checked

## Authentication and sessions

- [ ] Session fixation checked
- [ ] Token leakage checked
- [ ] Weak password reset flow checked

## Sensitive data exposure

- [ ] Secrets removed from report
- [ ] Personal data redacted
- [ ] Private IPs redacted when appropriate
`,
	'secret-review-checklist.md': `# Secret Review Checklist

Before publishing or sending a report:

- [ ] Run Vuln Report Kit secret scan
- [ ] Remove Authorization headers
- [ ] Remove Cookie and Set-Cookie headers
- [ ] Remove API keys and tokens
- [ ] Remove private keys
- [ ] Redact private IP addresses when needed
- [ ] Redact email addresses when needed
- [ ] Review screenshots manually
- [ ] Review attached files manually
`
};

const SECRET_PATTERNS = [
	{
		name: 'Private key block',
		severity: 'high',
		settingKey: 'scanPrivateKeys',
		recommendation: 'Remove the private key block or replace it with <REDACTED_PRIVATE_KEY> before sharing.',
		regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i
	},
	{
		name: 'Authorization header',
		severity: 'high',
		settingKey: 'scanAuthorizationHeaders',
		recommendation: 'Redact the Authorization header before publishing or sending the report.',
		regex: /\bAuthorization:\s*(Bearer|Basic|Token|ApiKey|JWT)\s+[^\s`'"<>]{8,}/i
	},
	{
		name: 'Bearer token',
		severity: 'high',
		settingKey: 'scanAuthorizationHeaders',
		recommendation: 'Replace the bearer value with Bearer <REDACTED_TOKEN>.',
		regex: /\bBearer\s+[A-Za-z0-9._\-+/=]{20,}\b/i
	},
	{
		name: 'JWT token',
		severity: 'high',
		settingKey: 'scanJwtTokens',
		recommendation: 'Replace the JWT with <REDACTED_JWT> and verify that screenshots do not expose it.',
		regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/
	},
	{
		name: 'AWS access key',
		severity: 'high',
		settingKey: 'scanAwsKeys',
		recommendation: 'Remove the key and rotate it if it was ever real.',
		regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/
	},
	{
		name: 'AWS secret access key assignment',
		severity: 'high',
		settingKey: 'scanAwsKeys',
		recommendation: 'Remove the AWS secret value and rotate it if it was ever real.',
		regex: /\baws(.{0,20})?(secret|secret_access_key|secretAccessKey).{0,10}[:=]\s*["']?[A-Za-z0-9/+=]{35,}["']?/i
	},
	{
		name: 'GitHub token',
		severity: 'high',
		settingKey: 'scanGitHubTokens',
		recommendation: 'Replace the token with <REDACTED_GITHUB_TOKEN> and rotate it if it was ever real.',
		regex: /\b(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/
	},
	{
		name: 'Google API key',
		severity: 'high',
		settingKey: 'scanGoogleApiKeys',
		recommendation: 'Replace the key with <REDACTED_GOOGLE_API_KEY> and review API key restrictions.',
		regex: /\bAIza[0-9A-Za-z\-_]{30,}\b/
	},
	{
		name: 'Slack token',
		severity: 'high',
		settingKey: 'scanSlackTokens',
		recommendation: 'Replace the Slack token with <REDACTED_SLACK_TOKEN> and rotate it if it was ever real.',
		regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/
	},
	{
		name: 'Stripe secret key',
		severity: 'high',
		settingKey: 'scanStripeKeys',
		recommendation: 'Replace the Stripe key with <REDACTED_STRIPE_KEY> and rotate it if it was ever real.',
		regex: /\bsk_(live|test)_[A-Za-z0-9]{16,}\b/
	},
	{
		name: 'Basic-auth URL',
		severity: 'high',
		settingKey: 'scanBasicAuthUrls',
		recommendation: 'Remove credentials from the URL and replace them with https://<USER>:<PASSWORD>@host.',
		regex: /https?:\/\/[^\s/:@]+:[^\s/@]+@[^\s)\]'"`]+/i
	},
	{
		name: 'Cookie header',
		severity: 'medium',
		settingKey: 'scanCookies',
		recommendation: 'Replace Cookie and Set-Cookie values with <REDACTED_COOKIE>.',
		regex: /\b(Cookie|Set-Cookie):\s*[^\n]{8,}/i
	},
	{
		name: 'Session identifier',
		severity: 'medium',
		settingKey: 'scanSessionIds',
		recommendation: 'Replace session identifiers with <REDACTED_SESSION>.',
		regex: /\b(PHPSESSID|JSESSIONID|sessionid|session_id|sid|sessid)\s*=\s*[A-Za-z0-9._\-]{10,}/i
	},
	{
		name: 'Generic secret assignment',
		severity: 'medium',
		settingKey: 'scanGenericSecrets',
		recommendation: 'Check whether the value is a real secret and replace it with a clear placeholder.',
		regex: /\b(api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|secret|private[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{16,}["']?/i
	},
	{
		name: 'Password-like assignment',
		severity: 'medium',
		settingKey: 'scanPasswords',
		recommendation: 'Replace the password-like value with <REDACTED_PASSWORD>.',
		regex: /\b(pass(word)?|pwd)\s*[:=]\s*["']?[^\s"']{8,}/i
	},
	{
		name: 'Email address',
		severity: 'low',
		settingKey: 'scanEmails',
		recommendation: 'Redact personal or non-public email addresses when preparing a public report.',
		regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
	},
	{
		name: 'Private IP address',
		severity: 'low',
		settingKey: 'scanPrivateIps',
		recommendation: 'Replace private/internal IP addresses with <PRIVATE_IP> when they are not needed.',
		regex: /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/
	},
	{
		name: 'Localhost URL',
		severity: 'low',
		settingKey: 'scanLocalhostUrls',
		recommendation: 'Replace local URLs with <LOCAL_URL> when preparing generalized public material.',
		regex: /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?[^\s)\]'"`]*/i
	}
];

module.exports = class VulnReportKitPlugin extends Plugin {
	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('shield-check', 'Create vulnerability case', () => {
			new CaseModal(this.app, this.settings, async (data) => {
				await this.createVulnerabilityCase(data);
			}).open();
		});

		this.addCommand({
			id: 'create-vulnerability-case',
			name: 'Create vulnerability case',
			callback: () => {
				new CaseModal(this.app, this.settings, async (data) => {
					await this.createVulnerabilityCase(data);
				}).open();
			}
		});

		this.addCommand({
			id: 'open-quick-start-guide',
			name: 'Open quick start guide',
			callback: async () => {
				await this.openQuickStartGuide();
			}
		});

		this.addCommand({
			id: 'create-demo-case',
			name: 'Create demo vulnerability case',
			callback: async () => {
				await this.createDemoCase();
			}
		});

		this.addCommand({
			id: 'run-local-health-check',
			name: 'Run local health check',
			callback: async () => {
				await this.runLocalHealthCheck();
			}
		});

		this.addCommand({
			id: 'open-vulnerability-dashboard',
			name: 'Open vulnerability dashboard',
			callback: async () => {
				await this.openVulnerabilityDashboard();
			}
		});

		this.addCommand({
			id: 'update-current-case-status',
			name: 'Update current case status',
			callback: async () => {
				await this.openStatusModalForCurrentCase();
			}
		});

		this.addCommand({
			id: 'open-templates-folder',
			name: 'Open templates folder',
			callback: async () => {
				await this.openTemplatesFolder();
			}
		});

		this.addCommand({
			id: 'install-starter-template-pack',
			name: 'Install starter template pack',
			callback: async () => {
				await this.installStarterTemplatePack();
			}
		});

		this.addCommand({
			id: 'import-template-pack-from-vault-folder',
			name: 'Import template pack from vault folder',
			callback: async () => {
				new ImportTemplatePackModal(this.app, this.settings, async (data) => {
					await this.importTemplatePackFromVaultFolder(data);
				}).open();
			}
		});

		this.addCommand({
			id: 'create-note-from-template',
			name: 'Create note from template',
			callback: async () => {
				await this.openCreateNoteFromTemplateModal();
			}
		});

		this.addCommand({
			id: 'insert-template-into-current-note',
			name: 'Insert template into current note',
			editorCallback: async (editor) => {
				await this.openInsertTemplateModal(editor);
			}
		});

		this.addCommand({
			id: 'insert-report-section',
			name: 'Insert report section',
			editorCallback: (editor) => {
				new SectionModal(this.app, (sectionName) => {
					const text = REPORT_SECTIONS[sectionName] || '';
					editor.replaceSelection(`\n${text}\n`);
				}).open();
			}
		});

		this.addCommand({
			id: 'generate-final-report',
			name: 'Generate final Markdown report for current case',
			callback: async () => {
				await this.generateFinalReport();
			}
		});

		this.addCommand({
			id: 'scan-current-case-for-secrets',
			name: 'Scan current case for secrets',
			callback: async () => {
				await this.scanCurrentCaseForSecrets();
			}
		});

		this.addCommand({
			id: 'create-sanitized-public-copy',
			name: 'Create sanitized public copy',
			callback: async () => {
				await this.createSanitizedPublicCopy();
			}
		});

		this.addCommand({
			id: 'export-current-case-bundle',
			name: 'Export current case bundle',
			callback: async () => {
				await this.exportCurrentCaseBundle();
			}
		});

		this.addCommand({
			id: 'create-shareable-case-archive',
			name: 'Create shareable case archive',
			callback: async () => {
				await this.createShareableCaseArchive();
			}
		});

		this.addCommand({
			id: 'export-all-cases-index',
			name: 'Export all cases index',
			callback: async () => {
				await this.exportAllCasesIndex();
			}
		});

		this.addCommand({
			id: 'backup-templates',
			name: 'Backup templates',
			callback: async () => {
				await this.backupTemplates();
			}
		});

		this.addCommand({
			id: 'open-exports-folder',
			name: 'Open exports folder',
			callback: async () => {
				await this.openExportsFolder();
			}
		});

		this.addSettingTab(new VulnReportKitSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createVulnerabilityCase(data) {
		const title = data.title.trim() || 'Untitled vulnerability';
		const date = getToday();
		const rootFolder = normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		const baseFolderName = `${date}-${slugify(title)}`;
		const caseFolder = await this.getAvailableFolderPath(`${rootFolder}/${baseFolderName}`);
		const attachmentsFolder = `${caseFolder}/attachments`;

		await this.ensureFolder(rootFolder);
		await this.ensureFolder(caseFolder);
		await this.ensureFolder(attachmentsFolder);

		const context = {
			...data,
			title,
			created: date,
			lastUpdated: date,
			caseFolder
		};

		const files = {
			'00-overview.md': templateOverview(context),
			'01-target.md': templateTarget(context),
			'02-reproduction.md': templateReproduction(context),
			'03-impact.md': templateImpact(context),
			'04-evidence.md': templateEvidence(context),
			'05-remediation.md': templateRemediation(context),
			'06-timeline.md': templateTimeline(context),
			'08-article-draft.md': templateArticleDraft(context)
		};

		let overviewFile = null;
		for (const [filename, content] of Object.entries(files)) {
			const created = await this.createFileIfMissing(`${caseFolder}/${filename}`, content);
			if (filename === '00-overview.md') overviewFile = created;
		}

		new Notice(`Vulnerability case created: ${title}`);
		if (overviewFile) {
			await this.app.workspace.getLeaf(false).openFile(overviewFile);
		}

		return { caseFolder, overviewFile };
	}

	async openQuickStartGuide() {
		const rootFolder = normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		await this.ensureFolder(rootFolder);
		const content = buildQuickStartGuide(rootFolder, this.getTemplatesFolder(), PLUGIN_VERSION);
		const guideFile = await this.createOrOverwriteFile(`${rootFolder}/_vuln-report-kit-quickstart.md`, content);
		new Notice('Quick start guide opened.');
		await this.app.workspace.getLeaf(false).openFile(guideFile);
	}

	async createDemoCase() {
		const result = await this.createVulnerabilityCase({
			title: 'Demo IDOR in invoice download',
			target: 'Example SaaS',
			vendor: 'Example Vendor',
			category: 'idor',
			severity: 'Medium',
			status: 'testing',
			language: this.settings.defaultLanguage || DEFAULT_SETTINGS.defaultLanguage,
			cwe: 'CWE-639',
			cvss: '',
			disclosure: 'private'
		});

		const caseFolder = result && result.caseFolder;
		if (!caseFolder) return;

		await this.createOrOverwriteFile(`${caseFolder}/02-reproduction.md`, buildDemoReproduction());
		await this.createOrOverwriteFile(`${caseFolder}/03-impact.md`, buildDemoImpact());
		await this.createOrOverwriteFile(`${caseFolder}/04-evidence.md`, buildDemoEvidence());
		await this.createOrOverwriteFile(`${caseFolder}/05-remediation.md`, buildDemoRemediation());
		await this.createOrOverwriteFile(`${caseFolder}/06-timeline.md`, buildDemoTimeline());

		new Notice('Demo case created with sample content.');
		if (result.overviewFile) {
			await this.app.workspace.getLeaf(false).openFile(result.overviewFile);
		}
	}

	async runLocalHealthCheck() {
		const rootFolder = normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		const templatesRoot = this.getTemplatesFolder();
		await this.ensureFolder(rootFolder);
		const cases = await this.collectCases();
		const templates = await this.listTemplates();
		const content = buildHealthCheckReport({
			version: PLUGIN_VERSION,
			rootFolder,
			templatesRoot,
			cases,
			templates,
			settings: this.settings
		});
		const healthFile = await this.createOrOverwriteFile(`${rootFolder}/_vuln-report-kit-health-check.md`, content);
		new Notice('Local health check completed.');
		await this.app.workspace.getLeaf(false).openFile(healthFile);
	}

	async openVulnerabilityDashboard() {
		const rootFolder = normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		await this.ensureFolder(rootFolder);
		const cases = await this.collectCases();
		const content = buildDashboardContent(rootFolder, cases);
		const dashboardPath = `${rootFolder}/_vuln-report-dashboard.md`;
		const dashboardFile = await this.createOrOverwriteFile(dashboardPath, content);
		new Notice(`Dashboard updated: ${cases.length} case(s).`);
		await this.app.workspace.getLeaf(false).openFile(dashboardFile);
	}

	async collectCases() {
		const rootFolder = normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		const files = this.app.vault.getMarkdownFiles()
			.filter((file) => file.basename === '00-overview')
			.filter((file) => file.parent && file.parent.path.startsWith(rootFolder + '/'));

		const cases = [];
		for (const file of files) {
			const raw = await this.app.vault.read(file);
			const frontmatter = parseFrontmatter(raw);
			if (frontmatter.type && frontmatter.type !== 'vulnerability-case') continue;

			cases.push({
				title: frontmatter.title || file.parent.name,
				target: frontmatter.target || '',
				vendor: frontmatter.vendor || '',
				category: frontmatter.category || '',
				severity: frontmatter.severity || '',
				status: frontmatter.status || 'idea',
				language: frontmatter.language || '',
				cwe: frontmatter.cwe || '',
				cvss: frontmatter.cvss || '',
				disclosure: frontmatter.disclosure || '',
				created: frontmatter.created || '',
				lastUpdated: frontmatter.last_updated || frontmatter.lastUpdated || formatDateFromTimestamp(file.stat.mtime),
				folder: file.parent.path,
				overviewPath: file.path
			});
		}

		cases.sort((a, b) => String(b.lastUpdated).localeCompare(String(a.lastUpdated)) || a.title.localeCompare(b.title));
		return cases;
	}

	async openStatusModalForCurrentCase() {
		const caseFolder = this.getCurrentCaseFolder();
		if (!caseFolder) {
			new Notice('Open a note inside a vulnerability case folder first.');
			return;
		}

		const overviewFile = this.app.vault.getAbstractFileByPath(`${caseFolder}/00-overview.md`);
		let currentStatus = 'idea';
		if (overviewFile instanceof TFile) {
			const raw = await this.app.vault.read(overviewFile);
			currentStatus = parseFrontmatter(raw).status || currentStatus;
		}

		new StatusModal(this.app, currentStatus, async (status) => {
			await this.updateCurrentCaseStatus(status);
		}).open();
	}

	async updateCurrentCaseStatus(status) {
		const caseFolder = this.getCurrentCaseFolder();
		if (!caseFolder) {
			new Notice('Open a note inside a vulnerability case folder first.');
			return;
		}

		const overviewPath = `${caseFolder}/00-overview.md`;
		const overviewFile = this.app.vault.getAbstractFileByPath(overviewPath);
		if (!(overviewFile instanceof TFile)) {
			new Notice('Could not find 00-overview.md for the current case.');
			return;
		}

		const today = getToday();
		const label = CASE_STATUSES[status] || status;
		let content = await this.app.vault.read(overviewFile);
		content = setFrontmatterField(content, 'status', status);
		content = setFrontmatterField(content, 'last_updated', today);
		content = replaceCurrentStatusLine(content, status);
		await this.app.vault.modify(overviewFile, content);

		const timelinePath = `${caseFolder}/06-timeline.md`;
		const timelineFile = this.app.vault.getAbstractFileByPath(timelinePath);
		if (timelineFile instanceof TFile) {
			const timeline = await this.app.vault.read(timelineFile);
			const entry = `\n- ${today}: Status updated to ${label}.`;
			if (!timeline.includes(entry.trim())) {
				await this.app.vault.modify(timelineFile, timeline.trimEnd() + entry + '\n');
			}
		}

		new Notice(`Case status updated: ${label}`);
	}

	async openTemplatesFolder() {
		const templatesRoot = this.getTemplatesFolder();
		await this.ensureFolder(templatesRoot);
		const readmePath = `${templatesRoot}/README.md`;
		const readme = buildTemplatesReadme(templatesRoot, this.settings.defaultTemplatePackSource || DEFAULT_SETTINGS.defaultTemplatePackSource);
		const file = await this.createFileIfMissing(readmePath, readme);
		new Notice('Templates folder ready.');
		await this.app.workspace.getLeaf(false).openFile(file);
	}

	async installStarterTemplatePack() {
		const templatesRoot = this.getTemplatesFolder();
		const packFolder = `${templatesRoot}/starter`;
		await this.ensureFolder(packFolder);

		let created = 0;
		let skipped = 0;
		for (const [filename, content] of Object.entries(STARTER_TEMPLATE_PACK)) {
			const path = `${packFolder}/${filename}`;
			const existing = this.app.vault.getAbstractFileByPath(path);
			if (existing instanceof TFile) {
				skipped += 1;
				continue;
			}
			await this.app.vault.create(path, content);
			created += 1;
		}

		const indexPath = `${packFolder}/README.md`;
		const index = buildTemplatePackIndex('starter', Object.keys(STARTER_TEMPLATE_PACK));
		const indexFile = await this.createOrOverwriteFile(indexPath, index);
		new Notice(`Starter template pack installed. Created ${created}, skipped ${skipped}.`);
		await this.app.workspace.getLeaf(false).openFile(indexFile);
	}

	async importTemplatePackFromVaultFolder(data) {
		const sourceFolder = normalizePath((data.sourceFolder || '').trim());
		if (!sourceFolder) {
			new Notice('Source folder is required.');
			return;
		}

		const source = this.app.vault.getAbstractFileByPath(sourceFolder);
		if (!(source instanceof TFolder)) {
			new Notice(`Template pack source folder not found: ${sourceFolder}`);
			return;
		}

		const templatesRoot = this.getTemplatesFolder();
		if (sourceFolder === templatesRoot || sourceFolder.startsWith(templatesRoot + '/')) {
			new Notice('Choose a source folder outside the Vuln Report Kit templates folder.');
			return;
		}

		const packName = slugify(data.packName || source.name || 'imported-pack');
		const destinationFolder = `${templatesRoot}/${packName}`;
		await this.ensureFolder(destinationFolder);

		const sourceFiles = this.app.vault.getMarkdownFiles()
			.filter((file) => file.path.startsWith(sourceFolder + '/'))
			.sort((a, b) => a.path.localeCompare(b.path));

		if (!sourceFiles.length) {
			new Notice('No Markdown templates found in the selected source folder.');
			return;
		}

		let copied = 0;
		let overwritten = 0;
		let skipped = 0;
		for (const file of sourceFiles) {
			const relative = file.path.substring(sourceFolder.length + 1);
			const destinationPath = normalizePath(`${destinationFolder}/${relative}`);
			await this.ensureParentFolder(destinationPath);
			const content = await this.app.vault.read(file);
			const existing = this.app.vault.getAbstractFileByPath(destinationPath);
			if (existing instanceof TFile) {
				if (data.overwrite) {
					await this.app.vault.modify(existing, content);
					overwritten += 1;
				} else {
					skipped += 1;
				}
				continue;
			}
			await this.app.vault.create(destinationPath, content);
			copied += 1;
		}

		const summaryPath = `${destinationFolder}/_import-summary.md`;
		const summary = buildImportSummary(sourceFolder, destinationFolder, copied, overwritten, skipped);
		const summaryFile = await this.createOrOverwriteFile(summaryPath, summary);
		new Notice(`Template pack imported: ${copied} copied, ${overwritten} overwritten, ${skipped} skipped.`);
		await this.app.workspace.getLeaf(false).openFile(summaryFile);
	}

	async openCreateNoteFromTemplateModal() {
		const templates = await this.listTemplates();
		if (!templates.length) {
			new Notice('No templates found. Run "Install starter template pack" first or import a template pack.');
			return;
		}

		const caseFolder = this.getCurrentCaseFolder();
		new CreateNoteFromTemplateModal(this.app, templates, caseFolder || normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder), async (data) => {
			await this.createNoteFromTemplate(data);
		}).open();
	}

	async createNoteFromTemplate(data) {
		const templateFile = this.app.vault.getAbstractFileByPath(data.templatePath);
		if (!(templateFile instanceof TFile)) {
			new Notice('Selected template was not found.');
			return;
		}

		const outputFolder = normalizePath((data.outputFolder || '').trim() || this.getCurrentCaseFolder() || this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		await this.ensureFolder(outputFolder);

		const title = (data.outputTitle || templateFile.basename || 'new-note').trim();
		const filename = `${slugify(title)}.md`;
		const outputPath = await this.getAvailableFilePath(`${outputFolder}/${filename}`);
		const raw = await this.app.vault.read(templateFile);
		const context = await this.getCurrentCaseContext();
		const content = applyTemplateVariables(raw, context);
		const created = await this.app.vault.create(outputPath, content);
		new Notice(`Note created from template: ${created.name}`);
		await this.app.workspace.getLeaf(false).openFile(created);
	}

	async openInsertTemplateModal(editor) {
		const templates = await this.listTemplates();
		if (!templates.length) {
			new Notice('No templates found. Run "Install starter template pack" first or import a template pack.');
			return;
		}

		new InsertTemplateModal(this.app, templates, async (templatePath) => {
			const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
			if (!(templateFile instanceof TFile)) {
				new Notice('Selected template was not found.');
				return;
			}
			const raw = await this.app.vault.read(templateFile);
			const context = await this.getCurrentCaseContext();
			const content = applyTemplateVariables(raw, context);
			editor.replaceSelection(`\n${content}\n`);
			new Notice('Template inserted.');
		}).open();
	}

	async listTemplates() {
		const templatesRoot = this.getTemplatesFolder();
		const files = this.app.vault.getMarkdownFiles()
			.filter((file) => file.path.startsWith(templatesRoot + '/'))
			.filter((file) => !['_import-summary', 'README'].includes(file.basename))
			.sort((a, b) => a.path.localeCompare(b.path));

		return files.map((file) => {
			const relative = file.path.substring(templatesRoot.length + 1);
			const parts = relative.split('/');
			const pack = parts.length > 1 ? parts[0] : 'root';
			return {
				path: file.path,
				name: file.basename,
				pack,
				display: `${pack} / ${file.basename}`
			};
		});
	}

	async getCurrentCaseContext() {
		const today = getToday();
		const caseFolder = this.getCurrentCaseFolder();
		const defaults = {
			date: today,
			today,
			title: '',
			target: '',
			vendor: '',
			category: '',
			severity: '',
			status: '',
			cwe: '',
			cvss: '',
			disclosure: '',
			created: '',
			last_updated: ''
		};

		if (!caseFolder) return defaults;
		const overviewFile = this.app.vault.getAbstractFileByPath(`${caseFolder}/00-overview.md`);
		if (!(overviewFile instanceof TFile)) return defaults;
		const raw = await this.app.vault.read(overviewFile);
		return Object.assign({}, defaults, parseFrontmatter(raw), { date: today, today, case_folder: caseFolder });
	}

	getTemplatesFolder() {
		const rootFolder = normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		return normalizePath(`${rootFolder}/_templates`);
	}

	async ensureParentFolder(path) {
		const folderPath = getFolderPath(path);
		if (folderPath) await this.ensureFolder(folderPath);
	}

	async getAvailableFilePath(basePath) {
		let candidate = normalizePath(basePath);
		let counter = 2;
		const dot = candidate.lastIndexOf('.');
		const base = dot > -1 ? candidate.substring(0, dot) : candidate;
		const ext = dot > -1 ? candidate.substring(dot) : '';
		while (this.app.vault.getAbstractFileByPath(candidate)) {
			candidate = normalizePath(`${base}-${counter}${ext}`);
			counter += 1;
		}
		return candidate;
	}

	async generateFinalReport() {
		const caseFolder = this.getCurrentCaseFolder();
		if (!caseFolder) {
			new Notice('Open a note inside a vulnerability case folder first.');
			return;
		}

		const files = this.getCaseMarkdownFiles(caseFolder)
			.filter((file) => !isGeneratedFile(file.basename) && file.basename !== '08-article-draft')
			.sort((a, b) => a.path.localeCompare(b.path));

		if (files.length === 0) {
			new Notice('No Markdown files found in the current case folder.');
			return;
		}

		const chunks = [];
		chunks.push(`# Final Vulnerability Report\n`);
		chunks.push(`Generated: ${new Date().toISOString()}\n`);
		chunks.push(`Source folder: \`${caseFolder}\`\n`);

		for (const file of files) {
			const raw = await this.app.vault.read(file);
			const body = stripFrontmatter(raw).trim();
			if (!body) continue;
			chunks.push(`\n---\n\n<!-- Source: ${file.name} -->\n\n${body}\n`);
		}

		const outputPath = `${caseFolder}/99-final-report.md`;
		const outputFile = await this.createOrOverwriteFile(outputPath, chunks.join('\n'));
		new Notice('Final report generated.');
		await this.app.workspace.getLeaf(false).openFile(outputFile);
	}

	async scanCurrentCaseForSecrets() {
		const caseFolder = this.getCurrentCaseFolder();
		if (!caseFolder) {
			new Notice('Open a note inside a vulnerability case folder first.');
			return;
		}

		await this.runSecretScanForCase(caseFolder, { openReport: true, showNotice: true });
	}

	async runSecretScanForCase(caseFolder, options = {}) {
		const files = this.getCaseMarkdownFiles(caseFolder)
			.filter((file) => file.basename !== 'secret-scan-report')
			.sort((a, b) => a.path.localeCompare(b.path));

		const enabledPatterns = getEnabledSecretPatterns(this.settings);
		const findings = [];
		let ignoredLines = 0;

		for (const file of files) {
			const content = await this.app.vault.read(file);
			const lines = content.split(/\r?\n/);
			lines.forEach((line, idx) => {
				if (shouldIgnoreScanLine(line, this.settings)) {
					ignoredLines += 1;
					return;
				}

				for (const pattern of enabledPatterns) {
					pattern.regex.lastIndex = 0;
					if (pattern.regex.test(line)) {
						findings.push({
							file: file.name,
							path: file.path,
							line: idx + 1,
							name: pattern.name,
							severity: pattern.severity,
							recommendation: pattern.recommendation || 'Review and redact this value if needed.',
							excerpt: safeExcerpt(line)
						});
					}
				}
			});
		}

		const report = buildScanReport(caseFolder, findings, {
			ignoredLines,
			enabledPatterns: enabledPatterns.length
		});
		const outputFile = await this.createOrOverwriteFile(`${caseFolder}/secret-scan-report.md`, report);

		if (options.showNotice !== false) {
			new Notice(findings.length ? `Secret scan completed: ${findings.length} finding(s).` : 'Secret scan completed: no findings.');
		}
		if (options.openReport) {
			await this.app.workspace.getLeaf(false).openFile(outputFile);
		}

		return { findings, outputFile };
	}

	async createSanitizedPublicCopy() {
		const caseFolder = this.getCurrentCaseFolder();
		if (!caseFolder) {
			new Notice('Open a note inside a vulnerability case folder first.');
			return;
		}

		if (this.settings.autoScanBeforePublicCopy) {
			await this.runSecretScanForCase(caseFolder, { openReport: false, showNotice: false });
		}

		const finalReportPath = `${caseFolder}/99-final-report.md`;
		let sourceFile = this.app.vault.getAbstractFileByPath(finalReportPath);
		if (!(sourceFile instanceof TFile)) {
			sourceFile = this.app.workspace.getActiveFile();
		}

		if (!(sourceFile instanceof TFile)) {
			new Notice('No source report found. Generate a final report or open a note first.');
			return;
		}

		const raw = await this.app.vault.read(sourceFile);
		const sanitized = sanitizeContent(raw, this.settings);
		const outputFile = await this.createOrOverwriteFile(`${caseFolder}/99-public-report.md`, sanitized);
		new Notice(this.settings.autoScanBeforePublicCopy ? 'Sanitized public copy created. Secret scan report also updated.' : 'Sanitized public copy created.');
		await this.app.workspace.getLeaf(false).openFile(outputFile);
	}


	getExportsFolder() {
		const rootFolder = normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		const exportFolderName = normalizePath(this.settings.exportFolderName || DEFAULT_SETTINGS.exportFolderName || '_exports');
		return normalizePath(`${rootFolder}/${exportFolderName}`);
	}

	async openExportsFolder() {
		const exportsFolder = this.getExportsFolder();
		await this.ensureFolder(exportsFolder);
		const readmePath = `${exportsFolder}/README.md`;
		const readme = buildExportsReadme(exportsFolder);
		const file = await this.createFileIfMissing(readmePath, readme);
		new Notice('Exports folder ready.');
		await this.app.workspace.getLeaf(false).openFile(file);
	}

	async exportCurrentCaseBundle() {
		const caseFolder = this.getCurrentCaseFolder();
		if (!caseFolder) {
			new Notice('Open a note inside a vulnerability case folder first.');
			return;
		}

		const exportsFolder = this.getExportsFolder();
		await this.ensureFolder(exportsFolder);

		const caseName = caseFolder.split('/').pop() || 'case';
		const destinationFolder = await this.getAvailableFolderPath(`${exportsFolder}/${getToday()}-${slugify(caseName)}-bundle`);
		await this.ensureFolder(destinationFolder);

		const files = this.getFilesUnderFolder(caseFolder)
			.filter((file) => !file.path.startsWith(destinationFolder + '/'))
			.sort((a, b) => a.path.localeCompare(b.path));

		let copied = 0;
		let skipped = 0;
		for (const file of files) {
			const relative = file.path.substring(caseFolder.length + 1);
			const destinationPath = normalizePath(`${destinationFolder}/${relative}`);
			const ok = await this.copyVaultFile(file, destinationPath);
			if (ok) copied += 1;
			else skipped += 1;
		}

		const readme = buildCaseBundleReadme(caseFolder, destinationFolder, copied, skipped, false);
		const readmeFile = await this.createOrOverwriteFile(`${destinationFolder}/_bundle-readme.md`, readme);
		new Notice(`Case bundle exported: ${copied} file(s), ${skipped} skipped.`);
		await this.app.workspace.getLeaf(false).openFile(readmeFile);
	}

	async createShareableCaseArchive() {
		const caseFolder = this.getCurrentCaseFolder();
		if (!caseFolder) {
			new Notice('Open a note inside a vulnerability case folder first.');
			return;
		}

		const exportsFolder = this.getExportsFolder();
		await this.ensureFolder(exportsFolder);
		const caseName = caseFolder.split('/').pop() || 'case';
		const destinationFolder = await this.getAvailableFolderPath(`${exportsFolder}/${getToday()}-${slugify(caseName)}-shareable`);
		await this.ensureFolder(destinationFolder);

		await this.runSecretScanForCase(caseFolder, { openReport: false, showNotice: false });

		const finalReportFile = await this.ensureFinalReportForCase(caseFolder);
		let publicReportContent = '';
		if (finalReportFile instanceof TFile) {
			const raw = await this.app.vault.read(finalReportFile);
			publicReportContent = sanitizeContent(raw, this.settings);
			await this.createOrOverwriteFile(`${destinationFolder}/99-public-report.md`, publicReportContent);
		}

		const overviewFile = this.app.vault.getAbstractFileByPath(`${caseFolder}/00-overview.md`);
		if (overviewFile instanceof TFile) {
			const overviewRaw = await this.app.vault.read(overviewFile);
			await this.createOrOverwriteFile(`${destinationFolder}/00-overview.md`, sanitizeContent(overviewRaw, this.settings));
		}

		const scanReportFile = this.app.vault.getAbstractFileByPath(`${caseFolder}/secret-scan-report.md`);
		if (scanReportFile instanceof TFile) {
			const scanRaw = await this.app.vault.read(scanReportFile);
			await this.createOrOverwriteFile(`${destinationFolder}/secret-scan-report.md`, scanRaw);
		}

		const readme = buildCaseBundleReadme(caseFolder, destinationFolder, publicReportContent ? 3 : 2, 0, true);
		const readmeFile = await this.createOrOverwriteFile(`${destinationFolder}/_shareable-readme.md`, readme);
		new Notice('Shareable case archive created. Review it manually before sharing.');
		await this.app.workspace.getLeaf(false).openFile(readmeFile);
	}

	async exportAllCasesIndex() {
		const exportsFolder = this.getExportsFolder();
		await this.ensureFolder(exportsFolder);
		const cases = await this.collectCases();
		const content = buildAllCasesExportIndex(cases, this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		const indexFile = await this.createOrOverwriteFile(`${exportsFolder}/${getToday()}-all-cases-index.md`, content);
		new Notice(`All cases index exported: ${cases.length} case(s).`);
		await this.app.workspace.getLeaf(false).openFile(indexFile);
	}

	async backupTemplates() {
		const templatesRoot = this.getTemplatesFolder();
		const templatesFolder = this.app.vault.getAbstractFileByPath(templatesRoot);
		if (!(templatesFolder instanceof TFolder)) {
			new Notice('Templates folder not found. Install or import templates first.');
			return;
		}

		const exportsFolder = this.getExportsFolder();
		await this.ensureFolder(exportsFolder);
		const destinationFolder = await this.getAvailableFolderPath(`${exportsFolder}/${getToday()}-template-backup`);
		await this.ensureFolder(destinationFolder);

		const files = this.getFilesUnderFolder(templatesRoot).sort((a, b) => a.path.localeCompare(b.path));
		let copied = 0;
		let skipped = 0;
		for (const file of files) {
			const relative = file.path.substring(templatesRoot.length + 1);
			const destinationPath = normalizePath(`${destinationFolder}/_templates/${relative}`);
			const ok = await this.copyVaultFile(file, destinationPath);
			if (ok) copied += 1;
			else skipped += 1;
		}

		const readme = buildTemplateBackupReadme(templatesRoot, destinationFolder, copied, skipped);
		const readmeFile = await this.createOrOverwriteFile(`${destinationFolder}/_template-backup-readme.md`, readme);
		new Notice(`Template backup created: ${copied} file(s), ${skipped} skipped.`);
		await this.app.workspace.getLeaf(false).openFile(readmeFile);
	}

	async ensureFinalReportForCase(caseFolder) {
		const finalReportPath = `${caseFolder}/99-final-report.md`;
		const existing = this.app.vault.getAbstractFileByPath(finalReportPath);
		if (existing instanceof TFile) return existing;

		const files = this.getCaseMarkdownFiles(caseFolder)
			.filter((file) => !isGeneratedFile(file.basename) && file.basename !== '08-article-draft')
			.sort((a, b) => a.path.localeCompare(b.path));

		const chunks = [];
		chunks.push(`# Final Vulnerability Report\n`);
		chunks.push(`Generated: ${new Date().toISOString()}\n`);
		chunks.push(`Source folder: \`${caseFolder}\`\n`);

		for (const file of files) {
			const raw = await this.app.vault.read(file);
			const body = stripFrontmatter(raw).trim();
			if (!body) continue;
			chunks.push(`\n---\n\n<!-- Source: ${file.name} -->\n\n${body}\n`);
		}

		return await this.createOrOverwriteFile(finalReportPath, chunks.join('\n'));
	}

	getFilesUnderFolder(folderPath) {
		const normalized = normalizePath(folderPath || '');
		return this.app.vault.getFiles().filter((file) => file.path.startsWith(normalized + '/'));
	}

	async copyVaultFile(sourceFile, destinationPath) {
		try {
			await this.ensureParentFolder(destinationPath);
			const existing = this.app.vault.getAbstractFileByPath(destinationPath);
			if (isTextLikeFile(sourceFile)) {
				const content = await this.app.vault.read(sourceFile);
				if (existing instanceof TFile) await this.app.vault.modify(existing, content);
				else await this.app.vault.create(destinationPath, content);
				return true;
			}

			if (typeof this.app.vault.readBinary !== 'function' || typeof this.app.vault.createBinary !== 'function') {
				return false;
			}
			const binary = await this.app.vault.readBinary(sourceFile);
			if (existing instanceof TFile) {
				if (typeof this.app.vault.modifyBinary === 'function') await this.app.vault.modifyBinary(existing, binary);
				else return false;
			} else {
				await this.app.vault.createBinary(destinationPath, binary);
			}
			return true;
		} catch (error) {
			console.error('Vuln Report Kit copy failed', error);
			return false;
		}
	}

	getCurrentCaseFolder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return null;

		const rootFolder = normalizePath(this.settings.rootFolder || DEFAULT_SETTINGS.rootFolder);
		const parentPath = activeFile.parent ? activeFile.parent.path : '';

		if (!parentPath.startsWith(rootFolder + '/')) return null;

		const rest = parentPath.substring(rootFolder.length + 1);
		const firstSegment = rest.split('/')[0];
		if (!firstSegment) return null;

		return normalizePath(`${rootFolder}/${firstSegment}`);
	}

	getCaseMarkdownFiles(caseFolder) {
		return this.app.vault.getMarkdownFiles().filter((file) => {
			const parent = file.parent ? file.parent.path : '';
			return parent === caseFolder;
		});
	}

	async getAvailableFolderPath(basePath) {
		let candidate = normalizePath(basePath);
		let counter = 2;
		while (this.app.vault.getAbstractFileByPath(candidate)) {
			candidate = normalizePath(`${basePath}-${counter}`);
			counter += 1;
		}
		return candidate;
	}

	async ensureFolder(path) {
		const normalized = normalizePath(path);
		if (!normalized || normalized === '/') return;
		if (this.app.vault.getAbstractFileByPath(normalized)) return;

		const parts = normalized.split('/');
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			if (!this.app.vault.getAbstractFileByPath(current)) {
				await this.app.vault.createFolder(current);
			}
		}
	}

	async createFileIfMissing(path, content) {
		const normalized = normalizePath(path);
		const existing = this.app.vault.getAbstractFileByPath(normalized);
		if (existing instanceof TFile) return existing;
		return await this.app.vault.create(normalized, content);
	}

	async createOrOverwriteFile(path, content) {
		const normalized = normalizePath(path);
		const existing = this.app.vault.getAbstractFileByPath(normalized);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
			return existing;
		}
		return await this.app.vault.create(normalized, content);
	}
};

class CaseModal extends Modal {
	constructor(app, settings, onSubmit) {
		super(app);
		this.settings = settings;
		this.onSubmit = onSubmit;
		this.data = {
			title: '',
			target: '',
			vendor: '',
			category: 'auth-bypass',
			severity: settings.defaultSeverity || DEFAULT_SETTINGS.defaultSeverity,
			status: settings.defaultStatus || DEFAULT_SETTINGS.defaultStatus,
			language: settings.defaultLanguage || DEFAULT_SETTINGS.defaultLanguage,
			cwe: '',
			cvss: '',
			disclosure: 'private'
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Create vulnerability case' });

		new Setting(contentEl)
			.setName('Title')
			.setDesc('Example: IDOR in invoice download')
			.addText((text) => text
				.setPlaceholder('Vulnerability title')
				.onChange((value) => this.data.title = value));

		new Setting(contentEl)
			.setName('Target')
			.setDesc('Product, plugin, module, application, endpoint, or program.')
			.addText((text) => text
				.setPlaceholder('Target')
				.onChange((value) => this.data.target = value));

		new Setting(contentEl)
			.setName('Vendor')
			.addText((text) => text
				.setPlaceholder('Vendor or maintainer')
				.onChange((value) => this.data.vendor = value));

		new Setting(contentEl)
			.setName('Category')
			.addDropdown((dropdown) => dropdown
				.addOptions({
					'auth-bypass': 'Auth bypass',
					'idor': 'IDOR',
					'xss': 'XSS',
					'sqli': 'SQL injection',
					'rce': 'RCE',
					'path-traversal': 'Path traversal',
					'info-disclosure': 'Information disclosure',
					'csrf': 'CSRF',
					'business-logic': 'Business logic',
					'other': 'Other'
				})
				.setValue(this.data.category)
				.onChange((value) => this.data.category = value));

		new Setting(contentEl)
			.setName('Severity')
			.addDropdown((dropdown) => dropdown
				.addOptions({
					'Informational': 'Informational',
					'Low': 'Low',
					'Medium': 'Medium',
					'High': 'High',
					'Critical': 'Critical'
				})
				.setValue(this.data.severity)
				.onChange((value) => this.data.severity = value));

		new Setting(contentEl)
			.setName('Initial status')
			.addDropdown((dropdown) => dropdown
				.addOptions(CASE_STATUSES)
				.setValue(this.data.status)
				.onChange((value) => this.data.status = value));

		new Setting(contentEl)
			.setName('CWE')
			.setDesc('Optional. Example: CWE-639')
			.addText((text) => text
				.setPlaceholder('CWE-XXX')
				.onChange((value) => this.data.cwe = value));

		new Setting(contentEl)
			.setName('CVSS')
			.setDesc('Optional. Example: 6.5')
			.addText((text) => text
				.setPlaceholder('CVSS score or vector')
				.onChange((value) => this.data.cvss = value));

		new Setting(contentEl)
			.setName('Disclosure type')
			.addDropdown((dropdown) => dropdown
				.addOptions(DISCLOSURE_TYPES)
				.setValue(this.data.disclosure)
				.onChange((value) => this.data.disclosure = value));

		new Setting(contentEl)
			.setName('Report language')
			.addDropdown((dropdown) => dropdown
				.addOptions({
					'English': 'English',
					'Italian': 'Italian'
				})
				.setValue(this.data.language)
				.onChange((value) => this.data.language = value));

		new Setting(contentEl)
			.addButton((button) => button
				.setButtonText('Create case')
				.setCta()
				.onClick(async () => {
					this.close();
					await this.onSubmit(this.data);
				}));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class StatusModal extends Modal {
	constructor(app, currentStatus, onSubmit) {
		super(app);
		this.currentStatus = currentStatus || 'idea';
		this.nextStatus = this.currentStatus;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Update case status' });

		new Setting(contentEl)
			.setName('Status')
			.setDesc(`Current status: ${CASE_STATUSES[this.currentStatus] || this.currentStatus}`)
			.addDropdown((dropdown) => dropdown
				.addOptions(CASE_STATUSES)
				.setValue(this.nextStatus)
				.onChange((value) => this.nextStatus = value));

		new Setting(contentEl)
			.addButton((button) => button
				.setButtonText('Update status')
				.setCta()
				.onClick(async () => {
					this.close();
					await this.onSubmit(this.nextStatus);
				}));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class SectionModal extends Modal {
	constructor(app, onSubmit) {
		super(app);
		this.onSubmit = onSubmit;
		this.sectionName = Object.keys(REPORT_SECTIONS)[0];
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Insert report section' });

		const options = {};
		for (const key of Object.keys(REPORT_SECTIONS)) options[key] = key;

		new Setting(contentEl)
			.setName('Section')
			.addDropdown((dropdown) => dropdown
				.addOptions(options)
				.setValue(this.sectionName)
				.onChange((value) => this.sectionName = value));

		new Setting(contentEl)
			.addButton((button) => button
				.setButtonText('Insert')
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.sectionName);
				}));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class ImportTemplatePackModal extends Modal {
	constructor(app, settings, onSubmit) {
		super(app);
		this.settings = settings;
		this.onSubmit = onSubmit;
		this.data = {
			sourceFolder: settings.defaultTemplatePackSource || DEFAULT_SETTINGS.defaultTemplatePackSource,
			packName: '',
			overwrite: false
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Import template pack' });
		contentEl.createEl('p', { text: 'Extract or copy a template pack folder inside your vault, then import its Markdown files into the Vuln Report Kit templates folder.' });

		new Setting(contentEl)
			.setName('Source folder inside vault')
			.setDesc('Example: _vuln-template-pack')
			.addText((text) => text
				.setPlaceholder(DEFAULT_SETTINGS.defaultTemplatePackSource)
				.setValue(this.data.sourceFolder)
				.onChange((value) => this.data.sourceFolder = value));

		new Setting(contentEl)
			.setName('Pack name')
			.setDesc('Optional. If empty, the source folder name is used.')
			.addText((text) => text
				.setPlaceholder('my-template-pack')
				.onChange((value) => this.data.packName = value));

		new Setting(contentEl)
			.setName('Overwrite existing templates')
			.setDesc('If disabled, existing files are skipped.')
			.addToggle((toggle) => toggle
				.setValue(this.data.overwrite)
				.onChange((value) => this.data.overwrite = value));

		new Setting(contentEl)
			.addButton((button) => button
				.setButtonText('Import pack')
				.setCta()
				.onClick(async () => {
					this.close();
					await this.onSubmit(this.data);
				}));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class InsertTemplateModal extends Modal {
	constructor(app, templates, onSubmit) {
		super(app);
		this.templates = templates;
		this.onSubmit = onSubmit;
		this.templatePath = templates[0] ? templates[0].path : '';
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Insert template' });

		const options = {};
		for (const template of this.templates) options[template.path] = template.display;

		new Setting(contentEl)
			.setName('Template')
			.addDropdown((dropdown) => dropdown
				.addOptions(options)
				.setValue(this.templatePath)
				.onChange((value) => this.templatePath = value));

		new Setting(contentEl)
			.addButton((button) => button
				.setButtonText('Insert')
				.setCta()
				.onClick(async () => {
					this.close();
					await this.onSubmit(this.templatePath);
				}));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class CreateNoteFromTemplateModal extends Modal {
	constructor(app, templates, defaultOutputFolder, onSubmit) {
		super(app);
		this.templates = templates;
		this.defaultOutputFolder = defaultOutputFolder;
		this.onSubmit = onSubmit;
		this.data = {
			templatePath: templates[0] ? templates[0].path : '',
			outputTitle: templates[0] ? templates[0].name : 'new-note',
			outputFolder: defaultOutputFolder
		};
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: 'Create note from template' });

		const options = {};
		for (const template of this.templates) options[template.path] = template.display;

		new Setting(contentEl)
			.setName('Template')
			.addDropdown((dropdown) => dropdown
				.addOptions(options)
				.setValue(this.data.templatePath)
				.onChange((value) => {
					this.data.templatePath = value;
					const selected = this.templates.find((template) => template.path === value);
					if (selected && !this.data.outputTitle) this.data.outputTitle = selected.name;
				}));

		new Setting(contentEl)
			.setName('Output title')
			.setDesc('The note filename is generated from this title.')
			.addText((text) => text
				.setPlaceholder('new-note')
				.setValue(this.data.outputTitle)
				.onChange((value) => this.data.outputTitle = value));

		new Setting(contentEl)
			.setName('Output folder')
			.setDesc('Folder inside the current vault.')
			.addText((text) => text
				.setPlaceholder(this.defaultOutputFolder)
				.setValue(this.data.outputFolder)
				.onChange((value) => this.data.outputFolder = value));

		new Setting(contentEl)
			.addButton((button) => button
				.setButtonText('Create note')
				.setCta()
				.onClick(async () => {
					this.close();
					await this.onSubmit(this.data);
				}));
	}

	onClose() {
		this.contentEl.empty();
	}
}

class VulnReportKitSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Vuln Report Kit settings' });
		containerEl.createEl('p', { text: `Version ${PLUGIN_VERSION}` });

		containerEl.createEl('h3', { text: 'Quick actions' });
		new Setting(containerEl)
			.setName('Open quick start guide')
			.setDesc('Create or refresh a local guide in the root folder with the recommended workflow and commands.')
			.addButton((button) => button
				.setButtonText('Open guide')
				.onClick(async () => {
					await this.plugin.openQuickStartGuide();
				}));

		new Setting(containerEl)
			.setName('Create demo case')
			.setDesc('Generate a fake vulnerability case with sample content for screenshots, demos, and testing.')
			.addButton((button) => button
				.setButtonText('Create demo')
				.onClick(async () => {
					await this.plugin.createDemoCase();
				}));

		new Setting(containerEl)
			.setName('Run local health check')
			.setDesc('Generate a local diagnostic note with case count, template count, settings summary, and next actions.')
			.addButton((button) => button
				.setButtonText('Run check')
				.onClick(async () => {
					await this.plugin.runLocalHealthCheck();
				}));

		new Setting(containerEl)
			.setName('Open exports folder')
			.setDesc('Create or open the local folder used for case bundles, shareable archives, indexes, and template backups.')
			.addButton((button) => button
				.setButtonText('Open exports')
				.onClick(async () => {
					await this.plugin.openExportsFolder();
				}));

		new Setting(containerEl)
			.setName('Export all cases index')
			.setDesc('Create a portable Markdown index of all vulnerability cases.')
			.addButton((button) => button
				.setButtonText('Export index')
				.onClick(async () => {
					await this.plugin.exportAllCasesIndex();
				}));

		new Setting(containerEl)
			.setName('Backup templates')
			.setDesc('Copy the current template library to the local exports folder.')
			.addButton((button) => button
				.setButtonText('Backup templates')
				.onClick(async () => {
					await this.plugin.backupTemplates();
				}));

		containerEl.createEl('h3', { text: 'Core settings' });

		new Setting(containerEl)
			.setName('Root folder')
			.setDesc('Folder where vulnerability cases will be created.')
			.addText((text) => text
				.setPlaceholder(DEFAULT_SETTINGS.rootFolder)
				.setValue(this.plugin.settings.rootFolder)
				.onChange(async (value) => {
					this.plugin.settings.rootFolder = value.trim() || DEFAULT_SETTINGS.rootFolder;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Export folder name')
			.setDesc('Subfolder under the root folder used for local exports and backups.')
			.addText((text) => text
				.setPlaceholder(DEFAULT_SETTINGS.exportFolderName)
				.setValue(this.plugin.settings.exportFolderName || DEFAULT_SETTINGS.exportFolderName)
				.onChange(async (value) => {
					this.plugin.settings.exportFolderName = value.trim() || DEFAULT_SETTINGS.exportFolderName;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default language')
			.addDropdown((dropdown) => dropdown
				.addOptions({ English: 'English', Italian: 'Italian' })
				.setValue(this.plugin.settings.defaultLanguage)
				.onChange(async (value) => {
					this.plugin.settings.defaultLanguage = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default severity')
			.addDropdown((dropdown) => dropdown
				.addOptions({
					Informational: 'Informational',
					Low: 'Low',
					Medium: 'Medium',
					High: 'High',
					Critical: 'Critical'
				})
				.setValue(this.plugin.settings.defaultSeverity)
				.onChange(async (value) => {
					this.plugin.settings.defaultSeverity = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default status')
			.addDropdown((dropdown) => dropdown
				.addOptions(CASE_STATUSES)
				.setValue(this.plugin.settings.defaultStatus || DEFAULT_SETTINGS.defaultStatus)
				.onChange(async (value) => {
					this.plugin.settings.defaultStatus = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Template packs' });

		new Setting(containerEl)
			.setName('Default template pack source')
			.setDesc('Vault folder used by the import command. Extract paid or custom template packs here before importing.')
			.addText((text) => text
				.setPlaceholder(DEFAULT_SETTINGS.defaultTemplatePackSource)
				.setValue(this.plugin.settings.defaultTemplatePackSource || DEFAULT_SETTINGS.defaultTemplatePackSource)
				.onChange(async (value) => {
					this.plugin.settings.defaultTemplatePackSource = value.trim() || DEFAULT_SETTINGS.defaultTemplatePackSource;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('p', { text: 'Templates are stored locally inside the root folder under _templates.' });

		containerEl.createEl('h3', { text: 'Secret scanner' });
		containerEl.createEl('p', { text: 'The scanner is local and regex-based. Disable noisy categories here to reduce false positives.' });

		this.addToggle(containerEl, 'Auto-scan before public copy', 'Update secret-scan-report.md automatically before creating 99-public-report.md.', 'autoScanBeforePublicCopy');
		this.addToggle(containerEl, 'Ignore already redacted placeholders', 'Skip lines containing placeholders such as <REDACTED>, <EMAIL>, or <PRIVATE_IP>.', 'ignoreRedactedValues');
		this.addToggle(containerEl, 'Ignore marked lines', 'Skip lines containing vrk-ignore, secret-scan-ignore, or vuln-report-kit-ignore.', 'ignoreScanComments');

		this.addToggle(containerEl, 'Scan private keys', 'Detect PEM private key blocks.', 'scanPrivateKeys');
		this.addToggle(containerEl, 'Scan Authorization headers', 'Detect Authorization headers and standalone Bearer tokens.', 'scanAuthorizationHeaders');
		this.addToggle(containerEl, 'Scan JWT tokens', 'Detect JWT-like tokens.', 'scanJwtTokens');
		this.addToggle(containerEl, 'Scan AWS keys', 'Detect AWS access keys and likely secret assignments.', 'scanAwsKeys');
		this.addToggle(containerEl, 'Scan GitHub tokens', 'Detect ghp/gho/ghu/ghs/ghr and github_pat tokens.', 'scanGitHubTokens');
		this.addToggle(containerEl, 'Scan Google API keys', 'Detect AIza-style Google API keys.', 'scanGoogleApiKeys');
		this.addToggle(containerEl, 'Scan Slack tokens', 'Detect xox-style Slack tokens.', 'scanSlackTokens');
		this.addToggle(containerEl, 'Scan Stripe keys', 'Detect sk_live and sk_test keys.', 'scanStripeKeys');
		this.addToggle(containerEl, 'Scan generic secrets', 'Detect api_key, client_secret, access_token and similar assignments.', 'scanGenericSecrets');
		this.addToggle(containerEl, 'Scan cookies', 'Detect Cookie and Set-Cookie headers.', 'scanCookies');
		this.addToggle(containerEl, 'Scan session IDs', 'Detect PHPSESSID, JSESSIONID, sessionid and similar values.', 'scanSessionIds');
		this.addToggle(containerEl, 'Scan passwords', 'Detect password-like assignments.', 'scanPasswords');
		this.addToggle(containerEl, 'Scan emails', 'Detect email addresses.', 'scanEmails');
		this.addToggle(containerEl, 'Scan private IPs', 'Detect RFC1918 private IPv4 addresses.', 'scanPrivateIps');
		this.addToggle(containerEl, 'Scan localhost URLs', 'Detect localhost, 127.0.0.1 and 0.0.0.0 URLs.', 'scanLocalhostUrls');
		this.addToggle(containerEl, 'Scan basic-auth URLs', 'Detect URLs containing username:password@host credentials.', 'scanBasicAuthUrls');

		containerEl.createEl('h3', { text: 'Sanitization' });
		containerEl.createEl('p', { text: 'These options control replacements used by Create sanitized public copy and by safe excerpts in scan reports.' });

		this.addToggle(containerEl, 'Sanitize private keys', 'Replace private key blocks with <REDACTED_PRIVATE_KEY>.', 'sanitizePrivateKeys');
		this.addToggle(containerEl, 'Sanitize Authorization headers', 'Replace Authorization values with explicit placeholders.', 'sanitizeAuthorizationHeaders');
		this.addToggle(containerEl, 'Sanitize JWT tokens', 'Replace JWTs with <REDACTED_JWT>.', 'sanitizeJwtTokens');
		this.addToggle(containerEl, 'Sanitize AWS keys', 'Replace AWS key-like values.', 'sanitizeAwsKeys');
		this.addToggle(containerEl, 'Sanitize GitHub tokens', 'Replace GitHub token-like values.', 'sanitizeGitHubTokens');
		this.addToggle(containerEl, 'Sanitize Google API keys', 'Replace Google API key-like values.', 'sanitizeGoogleApiKeys');
		this.addToggle(containerEl, 'Sanitize Slack tokens', 'Replace Slack token-like values.', 'sanitizeSlackTokens');
		this.addToggle(containerEl, 'Sanitize Stripe keys', 'Replace Stripe secret key-like values.', 'sanitizeStripeKeys');
		this.addToggle(containerEl, 'Sanitize cookies', 'Replace Cookie and Set-Cookie headers.', 'sanitizeCookies');
		this.addToggle(containerEl, 'Sanitize passwords', 'Replace password-like assignments.', 'sanitizePasswords');
		this.addToggle(containerEl, 'Sanitize emails', 'Replace email addresses with <EMAIL>.', 'sanitizeEmails');
		this.addToggle(containerEl, 'Sanitize private IPs', 'Replace private IP addresses with <PRIVATE_IP>.', 'sanitizePrivateIps');
		this.addToggle(containerEl, 'Sanitize localhost URLs', 'Replace localhost URLs with <LOCAL_URL>.', 'sanitizeLocalhostUrls');
		this.addToggle(containerEl, 'Sanitize basic-auth URLs', 'Replace URL credentials with <USER>:<PASSWORD>.', 'sanitizeBasicAuthUrls');
	}

	addToggle(containerEl, name, desc, key) {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) => toggle
				.setValue(Boolean(this.plugin.settings[key]))
				.onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				}));
	}
}

function templateOverview(ctx) {
	const status = ctx.status || 'idea';
	return `---\ntype: vulnerability-case\ntitle: "${escapeYaml(ctx.title)}"\ntarget: "${escapeYaml(ctx.target)}"\nvendor: "${escapeYaml(ctx.vendor)}"\ncategory: "${escapeYaml(ctx.category)}"\nseverity: "${escapeYaml(ctx.severity)}"\nstatus: "${escapeYaml(status)}"\nlanguage: "${escapeYaml(ctx.language)}"\ncwe: "${escapeYaml(ctx.cwe)}"\ncvss: "${escapeYaml(ctx.cvss)}"\ndisclosure: "${escapeYaml(ctx.disclosure)}"\ncreated: ${ctx.created}\nlast_updated: ${ctx.lastUpdated}\ntags:\n  - vuln-research\n  - ${escapeYaml(ctx.category)}\n---\n\n# ${ctx.title}\n\n## Summary\n\nDescribe the vulnerability in a clear, concise way.\n\n## Current status\n\n- Status: ${status}\n- Severity: ${ctx.severity}\n- Category: ${ctx.category}\n- CWE: ${ctx.cwe || ''}\n- CVSS: ${ctx.cvss || ''}\n- Disclosure: ${DISCLOSURE_TYPES[ctx.disclosure] || ctx.disclosure}\n\n## Quick notes\n\n- \n`;
}

function templateTarget(ctx) {
	return `# Target\n\n## Product / system\n\n- Target: ${ctx.target || ''}\n- Vendor: ${ctx.vendor || ''}\n- Version tested:\n- Environment:\n- Tested role/account:\n\n## Scope notes\n\nDocument what is in scope, out of scope, and any authorization constraints.\n`;
}

function templateReproduction(ctx) {
	return `# Reproduction\n\n## Preconditions\n\n- \n\n## Steps to reproduce\n\n1. \n2. \n3. \n\n## Expected behavior\n\n\n## Actual behavior\n\n\n## Raw evidence\n\nPaste only sanitized requests, responses, screenshots references, or logs.\n`;
}

function templateImpact(ctx) {
	return `# Impact\n\n## Security impact\n\nExplain what an attacker could realistically do.\n\n## Affected users or data\n\n- \n\n## Severity rationale\n\nSeverity: ${ctx.severity}\n\nCWE: ${ctx.cwe || ''}\n\nCVSS: ${ctx.cvss || ''}\n\nRationale:\n`;
}

function templateEvidence(ctx) {
	return `# Evidence\n\n## Screenshots / recordings\n\nStore files in the attachments folder and link them here.\n\n## Logs / requests / responses\n\n\`\`\`http\n# Paste sanitized evidence here\n\`\`\`\n`;
}

function templateRemediation(ctx) {
	return `# Remediation\n\n## Suggested fix\n\nDescribe the recommended remediation.\n\n## Defense in depth\n\n- \n\n## Regression tests\n\n- \n`;
}


function buildQuickStartGuide(rootFolder, templatesRoot, version) {
	return `# Vuln Report Kit Quick Start

Version: ${version}

This guide is generated locally inside your vault. It is safe to edit or delete.

## What this plugin is for

Vuln Report Kit helps you keep vulnerability research notes, responsible disclosure reports, public write-ups, template packs, secret scans, and sanitized exports in one Markdown-first workflow.

It does not require a server, account, login, cloud API, remote license check, or external database.

## Recommended first run

1. Run \`Vuln Report Kit: Create vulnerability case\`.
2. Fill \`00-overview.md\`, \`02-reproduction.md\`, \`03-impact.md\`, and \`04-evidence.md\`.
3. Run \`Vuln Report Kit: Generate final Markdown report for current case\`.
4. Run \`Vuln Report Kit: Scan current case for secrets\`.
5. Review \`secret-scan-report.md\`.
6. Run \`Vuln Report Kit: Create sanitized public copy\`.
7. Run \`Vuln Report Kit: Open vulnerability dashboard\`.

## Folders

- Cases root: \`${rootFolder}\`
- Templates: \`${templatesRoot}\`

## Template workflow

Run:

\`\`\`text
Vuln Report Kit: Install starter template pack
\`\`\`

Then use:

\`\`\`text
Vuln Report Kit: Create note from template
Vuln Report Kit: Insert template into current note
\`\`\`

## Product/demo workflow

For screenshots or a quick demo, run:

\`\`\`text
Vuln Report Kit: Create demo vulnerability case
Vuln Report Kit: Open vulnerability dashboard
Vuln Report Kit: Run local health check
\`\`\`

## Suggested publication-safe workflow

Before sharing a report outside your private vault:

- run the secret scanner;
- inspect screenshots and attachments manually;
- generate a sanitized public copy;
- remove live tokens, cookies, private keys, passwords, real emails, and unnecessary internal IP addresses;
- keep exploit details appropriate to the disclosure context.

## Main commands

- Create vulnerability case
- Open quick start guide
- Create demo vulnerability case
- Open vulnerability dashboard
- Update current case status
- Insert report section
- Generate final Markdown report for current case
- Scan current case for secrets
- Create sanitized public copy
- Open templates folder
- Install starter template pack
- Import template pack from vault folder
- Create note from template
- Insert template into current note
- Run local health check
`;
}

function buildDemoReproduction() {
	return `# Reproduction

This is fake demo content for screenshots and workflow testing. Do not use it as a real vulnerability report.

## Preconditions

- Two demo accounts exist: \`alice@example.test\` and \`bob@example.test\`.
- Alice owns invoice \`INV-1001\`.
- Bob owns invoice \`INV-2002\`.

## Steps to reproduce

1. Log in as Alice.
2. Open the invoice download endpoint for Alice's invoice.
3. Change the invoice identifier in the URL from \`INV-1001\` to \`INV-2002\`.
4. Observe that the application returns another user's invoice without an ownership check.

## Expected behavior

The application should reject access to invoices not owned by the current user.

## Actual behavior

The application returns the invoice associated with the supplied identifier.

## Sanitized request

\`\`\`http
GET /api/invoices/INV-2002/download HTTP/1.1
Host: app.example.test
Authorization: Bearer <REDACTED_TOKEN>
Cookie: <REDACTED_COOKIE>
\`\`\`
`;
}

function buildDemoImpact() {
	return `# Impact

## Security impact

A user may be able to access invoice documents belonging to other users by changing an object identifier.

## Affected data

- Invoice number
- Billing information
- Customer name
- Invoice line items

## Severity rationale

Severity: Medium

CWE: CWE-639

Rationale: the issue exposes another user's business document when a predictable object identifier is supplied. The impact depends on invoice sensitivity, identifier predictability, and rate limiting.
`;
}

function buildDemoEvidence() {
	return `# Evidence

## Screenshots / recordings

Store screenshots in the \`attachments\` folder and link them here.

## Sanitized evidence notes

- Alice can request \`/api/invoices/INV-1001/download\`.
- Alice can also request \`/api/invoices/INV-2002/download\`.
- The response body contains Bob's demo invoice content.

## Manual review reminder

Review screenshots manually before sharing. Image files are not sanitized by the Markdown sanitizer.
`;
}

function buildDemoRemediation() {
	return `# Remediation

## Suggested fix

Verify invoice ownership server-side before returning the file. The authorization check should use the authenticated user's account and the invoice owner relationship, not only the invoice identifier supplied in the request.

## Defense in depth

- Use non-sequential identifiers where appropriate.
- Add audit logging for denied invoice access.
- Add regression tests for cross-account access attempts.
- Rate-limit repeated invoice access attempts.
`;
}

function buildDemoTimeline() {
	const today = getToday();
	return `# Disclosure Timeline

- ${today}: Demo case created.
- YYYY-MM-DD: Vulnerability confirmed.
- YYYY-MM-DD: Report submitted.
- YYYY-MM-DD: Vendor acknowledged.
- YYYY-MM-DD: Fix released.
- YYYY-MM-DD: Public disclosure.
`;
}

function buildHealthCheckReport(data) {
	const statusCounts = countBy(data.cases || [], (item) => item.status || 'idea');
	const lines = [];
	lines.push('# Vuln Report Kit Health Check');
	lines.push('');
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push(`Plugin version: ${data.version}`);
	lines.push('');
	lines.push('## Local paths');
	lines.push('');
	lines.push(`- Root folder: \`${data.rootFolder}\``);
	lines.push(`- Templates folder: \`${data.templatesRoot}\``);
	lines.push('');
	lines.push('## Content summary');
	lines.push('');
	lines.push(`- Vulnerability cases: ${(data.cases || []).length}`);
	lines.push(`- Templates available: ${(data.templates || []).length}`);
	lines.push('');
	lines.push('## Cases by status');
	lines.push('');
	if (!Object.keys(statusCounts).length) {
		lines.push('- No cases found yet.');
	} else {
		for (const status of Object.keys(CASE_STATUSES)) {
			if (statusCounts[status]) lines.push(`- ${CASE_STATUSES[status]}: ${statusCounts[status]}`);
		}
		for (const status of Object.keys(statusCounts).filter((key) => !CASE_STATUSES[key])) {
			lines.push(`- ${status}: ${statusCounts[status]}`);
		}
	}
	lines.push('');
	lines.push('## Scanner settings summary');
	lines.push('');
	lines.push(`- Auto-scan before public copy: ${data.settings.autoScanBeforePublicCopy ? 'enabled' : 'disabled'}`);
	lines.push(`- Scan emails: ${data.settings.scanEmails !== false ? 'enabled' : 'disabled'}`);
	lines.push(`- Scan private IPs: ${data.settings.scanPrivateIps !== false ? 'enabled' : 'disabled'}`);
	lines.push(`- Scan authorization headers: ${data.settings.scanAuthorizationHeaders !== false ? 'enabled' : 'disabled'}`);
	lines.push(`- Scan generic secrets: ${data.settings.scanGenericSecrets !== false ? 'enabled' : 'disabled'}`);
	lines.push('');
	lines.push('## Suggested next actions');
	lines.push('');
	if (!(data.cases || []).length) {
		lines.push('- Create a first case or generate a demo case.');
	}
	if (!(data.templates || []).length) {
		lines.push('- Install the starter template pack or import a professional template pack.');
	}
	lines.push('- Refresh the dashboard before taking screenshots or publishing a demo.');
	lines.push('- Run the secret scanner before sharing reports outside the vault.');
	lines.push('- Review attachments manually because the Markdown sanitizer does not edit images or binary files.');
	return lines.join('\n');
}

function templateTimeline(ctx) {
	return `# Disclosure Timeline\n\n- ${ctx.created}: Case created.\n- YYYY-MM-DD: Vulnerability confirmed.\n- YYYY-MM-DD: Report submitted.\n- YYYY-MM-DD: Vendor acknowledged.\n- YYYY-MM-DD: Fix released.\n- YYYY-MM-DD: Public disclosure.\n`;
}

function templateArticleDraft(ctx) {
	return `# Article Draft\n\n## Working title\n\n${ctx.title}\n\n## Abstract\n\nWrite a public, sanitized summary.\n\n## Technical write-up\n\nAvoid exposing live targets, secrets, personal data, or weaponized details.\n\n## Public references\n\n- \n`;
}

function buildDashboardContent(rootFolder, cases) {
	const lines = [];
	lines.push('# Vuln Report Kit Dashboard');
	lines.push('');
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push(`Root folder: \`${rootFolder}\``);
	lines.push('');
	lines.push('> Re-run the command `Vuln Report Kit: Open vulnerability dashboard` to refresh this page.');
	lines.push('');
	lines.push('## Summary');
	lines.push('');
	lines.push(`- Total cases: ${cases.length}`);

	const statusCounts = countBy(cases, (item) => item.status || 'idea');
	for (const status of Object.keys(CASE_STATUSES)) {
		if (statusCounts[status]) lines.push(`- ${CASE_STATUSES[status]}: ${statusCounts[status]}`);
	}
	const unknownStatuses = Object.keys(statusCounts).filter((status) => !CASE_STATUSES[status]);
	for (const status of unknownStatuses) lines.push(`- ${status}: ${statusCounts[status]}`);

	lines.push('');
	lines.push('## Cases');
	lines.push('');

	if (!cases.length) {
		lines.push('No vulnerability cases found yet. Use `Vuln Report Kit: Create vulnerability case` to create the first one.');
		return lines.join('\n');
	}

	lines.push('| Case | Target | Category | Severity | Status | CVSS | CWE | Updated |');
	lines.push('|---|---|---|---|---|---|---|---|');
	for (const item of cases) {
		const link = makeWikiLink(item.overviewPath, item.title);
		lines.push(`| ${link} | ${escapeTable(item.target)} | ${escapeTable(item.category)} | ${escapeTable(item.severity)} | ${escapeTable(CASE_STATUSES[item.status] || item.status)} | ${escapeTable(item.cvss)} | ${escapeTable(item.cwe)} | ${escapeTable(item.lastUpdated)} |`);
	}

	lines.push('');
	lines.push('## Status workflow');
	lines.push('');
	lines.push('`idea → testing → confirmed → reported → triaged → accepted → fixed → published → closed`');
	lines.push('');
	lines.push('Use `Vuln Report Kit: Update current case status` while a case note is open.');

	return lines.join('\n');
}

function buildTemplatesReadme(templatesRoot, defaultSource) {
	return `# Vuln Report Kit Templates

This folder stores local Markdown templates used by Vuln Report Kit.

## Quick start

Run:

\`\`\`text
Vuln Report Kit: Install starter template pack
\`\`\`

Then use:

\`\`\`text
Vuln Report Kit: Create note from template
Vuln Report Kit: Insert template into current note
\`\`\`

## Importing a custom or paid template pack

1. Extract the template pack folder inside your vault.
2. A simple default source folder is:

\`\`\`text
${defaultSource}
\`\`\`

3. Run:

\`\`\`text
Vuln Report Kit: Import template pack from vault folder
\`\`\`

Imported templates will be copied under:

\`\`\`text
${templatesRoot}/<pack-name>/
\`\`\`

Everything stays local inside your Obsidian vault.
`;
}

function buildTemplatePackIndex(packName, filenames) {
	const lines = [];
	lines.push(`# Template Pack: ${packName}`);
	lines.push('');
	lines.push(`Installed: ${new Date().toISOString()}`);
	lines.push('');
	lines.push('## Templates');
	lines.push('');
	for (const filename of filenames.sort()) {
		const name = filename.replace(/\.md$/i, '');
		lines.push(`- [[${name}]]`);
	}
	lines.push('');
	lines.push('Use `Vuln Report Kit: Create note from template` or `Vuln Report Kit: Insert template into current note`.');
	return lines.join('\n');
}

function buildImportSummary(sourceFolder, destinationFolder, copied, overwritten, skipped) {
	return `# Template Pack Import Summary

Imported: ${new Date().toISOString()}

Source folder: \`${sourceFolder}\`

Destination folder: \`${destinationFolder}\`

## Result

- Copied: ${copied}
- Overwritten: ${overwritten}
- Skipped: ${skipped}

Use \`Vuln Report Kit: Create note from template\` or \`Vuln Report Kit: Insert template into current note\` to use the imported templates.
`;
}

function applyTemplateVariables(content, context) {
	const data = Object.assign({}, context || {});
	return String(content || '').replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (match, key) => {
		if (Object.prototype.hasOwnProperty.call(data, key)) return String(data[key] || '');
		return match;
	});
}

function getFolderPath(path) {
	const normalized = normalizePath(path || '');
	const slash = normalized.lastIndexOf('/');
	if (slash === -1) return '';
	return normalized.substring(0, slash);
}


function buildExportsReadme(exportsFolder) {
	return `# Vuln Report Kit Exports

This folder is created locally by Vuln Report Kit.

Use it for:

- full local case bundles;
- sanitized shareable case folders;
- all-cases indexes;
- template backups.

Current exports folder:

${exportsFolder}

## Important

Shareable archives are sanitized with regex-based rules, but you should still review every file manually before sending it to a vendor, a bug bounty platform, a client, or publishing it online.
`;
}

function buildCaseBundleReadme(caseFolder, destinationFolder, copied, skipped, shareable) {
	const title = shareable ? 'Shareable Case Archive' : 'Full Case Bundle';
	const lines = [];
	lines.push(`# ${title}`);
	lines.push('');
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push(`Source case folder: \`${caseFolder}\``);
	lines.push(`Export folder: \`${destinationFolder}\``);
	lines.push('');
	lines.push('## Result');
	lines.push('');
	lines.push(`- Files written/copied: ${copied}`);
	lines.push(`- Files skipped: ${skipped}`);
	lines.push('');
	if (shareable) {
		lines.push('## What this contains');
		lines.push('');
		lines.push('- `99-public-report.md`: sanitized public report generated from the final report.');
		lines.push('- `00-overview.md`: sanitized overview metadata.');
		lines.push('- `secret-scan-report.md`: local regex scan report for manual review.');
		lines.push('');
		lines.push('Attachments are intentionally not copied into this shareable folder. Add only the evidence you have manually reviewed.');
	} else {
		lines.push('## What this contains');
		lines.push('');
		lines.push('This is a full local copy of the case folder, including generated reports and attachments when binary copying is supported by your Obsidian environment.');
	}
	lines.push('');
	lines.push('## Manual review checklist');
	lines.push('');
	lines.push('- Check tokens, cookies, private keys, hostnames, IPs, emails and customer/user data.');
	lines.push('- Review screenshots and attachments separately.');
	lines.push('- Confirm the report does not include unauthorized third-party data.');
	lines.push('- Keep the original case folder private.');
	return lines.join('\n');
}

function buildAllCasesExportIndex(cases, rootFolder) {
	const lines = [];
	lines.push('# Vuln Report Kit - All Cases Index');
	lines.push('');
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push(`Root folder: \`${rootFolder}\``);
	lines.push(`Total cases: ${cases.length}`);
	lines.push('');

	const byStatus = countBy(cases, (item) => item.status || 'unknown');
	const bySeverity = countBy(cases, (item) => item.severity || 'unknown');

	lines.push('## Summary by status');
	lines.push('');
	lines.push('| Status | Count |');
	lines.push('|---|---:|');
	for (const key of Object.keys(byStatus).sort()) {
		lines.push(`| ${escapeTable(CASE_STATUSES[key] || key)} | ${byStatus[key]} |`);
	}
	lines.push('');

	lines.push('## Summary by severity');
	lines.push('');
	lines.push('| Severity | Count |');
	lines.push('|---|---:|');
	for (const key of Object.keys(bySeverity).sort()) {
		lines.push(`| ${escapeTable(key)} | ${bySeverity[key]} |`);
	}
	lines.push('');

	lines.push('## Cases');
	lines.push('');
	lines.push('| Title | Target | Vendor | Category | Severity | Status | CWE | CVSS | Created | Last updated | Folder |');
	lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
	for (const item of cases) {
		lines.push(`| ${escapeTable(item.title)} | ${escapeTable(item.target)} | ${escapeTable(item.vendor)} | ${escapeTable(item.category)} | ${escapeTable(item.severity)} | ${escapeTable(CASE_STATUSES[item.status] || item.status)} | ${escapeTable(item.cwe)} | ${escapeTable(item.cvss)} | ${escapeTable(item.created)} | ${escapeTable(item.lastUpdated)} | \`${escapeTable(item.folder)}\` |`);
	}
	lines.push('');
	lines.push('This index is static. Re-run `Vuln Report Kit: Export all cases index` to refresh it.');
	return lines.join('\n');
}

function buildTemplateBackupReadme(templatesRoot, destinationFolder, copied, skipped) {
	return `# Template Backup

Generated: ${new Date().toISOString()}

Source templates folder: \`${templatesRoot}\`

Backup folder: \`${destinationFolder}\`

## Result

- Files copied: ${copied}
- Files skipped: ${skipped}

To restore manually, copy the files under \`_templates/\` back into your Vuln Report Kit templates folder.
`;
}

function isTextLikeFile(file) {
	const ext = String(file.extension || '').toLowerCase();
	return ['md', 'txt', 'json', 'csv', 'yaml', 'yml', 'xml', 'html', 'css', 'js', 'ts', 'log', 'http', 'burp'].includes(ext);
}

function buildScanReport(caseFolder, findings, meta = {}) {
	const lines = [];
	const generated = new Date().toISOString();
	lines.push('# Secret Scan Report');
	lines.push('');
	lines.push(`Generated: ${generated}`);
	lines.push(`Case folder: \`${caseFolder}\``);
	lines.push('');
	lines.push('> This is a local regex-based scan. Review findings manually before publishing or sharing reports.');
	lines.push('> To intentionally ignore a false positive line, add `vrk-ignore`, `secret-scan-ignore`, or `vuln-report-kit-ignore` to that line.');
	lines.push('');

	lines.push('## Summary');
	lines.push('');
	lines.push(`- Enabled patterns: ${meta.enabledPatterns || 0}`);
	lines.push(`- Ignored lines: ${meta.ignoredLines || 0}`);
	lines.push(`- Total findings: ${findings.length}`);
	lines.push('');

	const severityOrder = ['high', 'medium', 'low'];
	const severityCounts = countBy(findings, (finding) => finding.severity || 'low');
	lines.push('| Severity | Count |');
	lines.push('|---|---:|');
	for (const severity of severityOrder) {
		lines.push(`| ${capitalize(severity)} | ${severityCounts[severity] || 0} |`);
	}
	const otherSeverities = Object.keys(severityCounts).filter((severity) => !severityOrder.includes(severity));
	for (const severity of otherSeverities) {
		lines.push(`| ${capitalize(severity)} | ${severityCounts[severity] || 0} |`);
	}
	lines.push('');

	if (!findings.length) {
		lines.push('No potential secrets found.');
		return lines.join('\n');
	}

	lines.push('## Findings by severity');
	lines.push('');
	for (const severity of severityOrder.concat(otherSeverities)) {
		const group = findings.filter((finding) => finding.severity === severity);
		if (!group.length) continue;
		lines.push(`### ${capitalize(severity)}`);
		lines.push('');
		for (const finding of group) {
			const heading = `${finding.name} in ${finding.file}:${finding.line}`;
			lines.push(`#### ${heading}`);
			lines.push('');
			lines.push(`- File: \`${finding.file}\``);
			lines.push(`- Line: ${finding.line}`);
			lines.push(`- Pattern: ${finding.name}`);
			lines.push(`- Excerpt: \`${escapeTable(finding.excerpt)}\``);
			lines.push(`- Recommendation: ${finding.recommendation || 'Review and redact this value if needed.'}`);
			lines.push('');
		}
	}

	lines.push('## Compact table');
	lines.push('');
	lines.push('| Severity | File | Line | Pattern | Excerpt |');
	lines.push('|---|---|---:|---|---|');
	for (const finding of findings) {
		lines.push(`| ${capitalize(finding.severity)} | ${finding.file} | ${finding.line} | ${finding.name} | \`${escapeTable(finding.excerpt)}\` |`);
	}

	lines.push('');
	lines.push('## Recommended next steps');
	lines.push('');
	lines.push('1. Open each file and review the flagged line.');
	lines.push('2. Replace real secrets with specific placeholders such as `<REDACTED_TOKEN>`, `<REDACTED_COOKIE>`, or `<PRIVATE_IP>`.');
	lines.push('3. Add `vrk-ignore` to a line only when you are sure it is a false positive.');
	lines.push('4. Run the scan again before exporting, publishing, or sending the report.');

	return lines.join('\n');
}

function sanitizeContent(content, settings = DEFAULT_SETTINGS) {
	let output = String(content || '');

	const legacyTokenSanitizer = settings.sanitizeTokens !== false;

	if (legacyTokenSanitizer && settings.sanitizePrivateKeys !== false) {
		output = output.replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, '<REDACTED_PRIVATE_KEY>');
	}

	if (legacyTokenSanitizer && settings.sanitizeAuthorizationHeaders !== false) {
		output = output.replace(/\bAuthorization:\s*Bearer\s+[^\n\r`'"<>]{8,}/gi, 'Authorization: Bearer <REDACTED_TOKEN>');
		output = output.replace(/\bAuthorization:\s*Basic\s+[^\n\r`'"<>]{8,}/gi, 'Authorization: Basic <REDACTED_BASIC_AUTH>');
		output = output.replace(/\bAuthorization:\s*(Token|ApiKey|JWT)\s+[^\n\r`'"<>]{8,}/gi, 'Authorization: $1 <REDACTED_TOKEN>');
		output = output.replace(/\bBearer\s+[A-Za-z0-9._\-+/=]{20,}\b/gi, 'Bearer <REDACTED_TOKEN>');
	}

	if (legacyTokenSanitizer && settings.sanitizeJwtTokens !== false) {
		output = output.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '<REDACTED_JWT>');
	}

	if (legacyTokenSanitizer && settings.sanitizeAwsKeys !== false) {
		output = output.replace(/\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, '<REDACTED_AWS_ACCESS_KEY>');
		output = output.replace(/\baws(.{0,20})?(secret|secret_access_key|secretAccessKey).{0,10}[:=]\s*["']?[A-Za-z0-9/+=]{35,}["']?/gi, 'aws_secret_access_key=<REDACTED_AWS_SECRET>');
	}

	if (legacyTokenSanitizer && settings.sanitizeGitHubTokens !== false) {
		output = output.replace(/\b(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '<REDACTED_GITHUB_TOKEN>');
	}

	if (legacyTokenSanitizer && settings.sanitizeGoogleApiKeys !== false) {
		output = output.replace(/\bAIza[0-9A-Za-z\-_]{30,}\b/g, '<REDACTED_GOOGLE_API_KEY>');
	}

	if (legacyTokenSanitizer && settings.sanitizeSlackTokens !== false) {
		output = output.replace(/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g, '<REDACTED_SLACK_TOKEN>');
	}

	if (legacyTokenSanitizer && settings.sanitizeStripeKeys !== false) {
		output = output.replace(/\bsk_(live|test)_[A-Za-z0-9]{16,}\b/g, '<REDACTED_STRIPE_KEY>');
	}

	if (settings.sanitizeBasicAuthUrls !== false) {
		output = output.replace(/(https?:\/\/)[^\s/:@]+:[^\s/@]+@([^\s)\]'"`]+)/gi, '$1<USER>:<PASSWORD>@$2');
	}

	if (settings.sanitizeCookies) {
		output = output.replace(/\bCookie:\s*[^\n\r]+/gi, 'Cookie: <REDACTED_COOKIE>');
		output = output.replace(/\bSet-Cookie:\s*[^\n\r]+/gi, 'Set-Cookie: <REDACTED_COOKIE>');
		output = output.replace(/\b(PHPSESSID|JSESSIONID|sessionid|session_id|sid|sessid)\s*=\s*[A-Za-z0-9._\-]{10,}/gi, '$1=<REDACTED_SESSION>');
	}

	if (settings.sanitizePasswords) {
		output = output.replace(/\b(pass(word)?|pwd)\s*[:=]\s*["']?[^\s"']{8,}/gi, '$1=<REDACTED_PASSWORD>');
		output = output.replace(/\b(api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|secret|private[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{16,}["']?/gi, '$1=<REDACTED_SECRET>');
	}

	if (settings.sanitizeEmails) {
		output = output.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '<EMAIL>');
	}

	if (settings.sanitizePrivateIps) {
		output = output.replace(/\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})\b/g, '<PRIVATE_IP>');
	}

	if (settings.sanitizeLocalhostUrls) {
		output = output.replace(/https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?[^\s)\]'"`]*/gi, '<LOCAL_URL>');
	}

	return output;
}

function stripFrontmatter(content) {
	return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function parseFrontmatter(content) {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const result = {};
	const lines = match[1].split(/\r?\n/);
	for (const line of lines) {
		const simple = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!simple) continue;
		const key = simple[1];
		let value = simple[2].trim();
		if (value === '') {
			result[key] = '';
			continue;
		}
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.substring(1, value.length - 1);
		}
		result[key] = value.replace(/\\"/g, '"');
	}
	return result;
}

function setFrontmatterField(content, key, value) {
	const normalizedValue = quoteYamlValue(value);
	if (!content.startsWith('---\n')) {
		return `---\n${key}: ${normalizedValue}\n---\n\n${content}`;
	}
	const end = content.indexOf('\n---', 4);
	if (end === -1) return content;
	const frontmatter = content.substring(4, end);
	const body = content.substring(end);
	const regex = new RegExp(`^${escapeRegExp(key)}:\\s*.*$`, 'm');
	let newFrontmatter;
	if (regex.test(frontmatter)) {
		newFrontmatter = frontmatter.replace(regex, `${key}: ${normalizedValue}`);
	} else {
		newFrontmatter = frontmatter.trimEnd() + `\n${key}: ${normalizedValue}`;
	}
	return `---\n${newFrontmatter}\n${body}`;
}

function replaceCurrentStatusLine(content, status) {
	if (/^- Status:\s*.*$/m.test(content)) {
		return content.replace(/^- Status:\s*.*$/m, `- Status: ${status}`);
	}
	return content;
}

function quoteYamlValue(value) {
	return `"${escapeYaml(value)}"`;
}

function slugify(value) {
	return (value || 'untitled')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.substring(0, 80) || 'untitled';
}

function escapeYaml(value) {
	return String(value || '').replace(/"/g, '\\"');
}

function getEnabledSecretPatterns(settings = DEFAULT_SETTINGS) {
	return SECRET_PATTERNS.filter((pattern) => settings[pattern.settingKey] !== false);
}

function shouldIgnoreScanLine(line, settings = DEFAULT_SETTINGS) {
	const value = String(line || '');
	if (settings.ignoreScanComments !== false && /\b(vrk-ignore|secret-scan-ignore|vuln-report-kit-ignore)\b/i.test(value)) {
		return true;
	}
	if (settings.ignoreRedactedValues !== false && /<\s*(REDACTED|EMAIL|PRIVATE_IP|LOCAL_URL|PRIVATE_KEY_REDACTED|REDACTED_[A-Z0-9_]+)\s*>/i.test(value)) {
		return true;
	}
	return false;
}

function capitalize(value) {
	const text = String(value || '');
	if (!text) return '';
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function safeExcerpt(line) {
	let excerpt = line.trim();
	excerpt = sanitizeContent(excerpt, {
		sanitizeEmails: true,
		sanitizePrivateIps: true,
		sanitizeTokens: true,
		sanitizeCookies: true,
		sanitizePasswords: true
	});
	if (excerpt.length > 120) excerpt = excerpt.substring(0, 117) + '...';
	return excerpt;
}

function escapeTable(value) {
	return String(value || '').replace(/\|/g, '\\|').replace(/`/g, '\\`').replace(/\n/g, ' ');
}

function isGeneratedFile(basename) {
	return basename === '99-final-report'
		|| basename === '99-public-report'
		|| basename === 'secret-scan-report'
		|| basename === '_vuln-report-dashboard';
}

function getToday() {
	return new Date().toISOString().slice(0, 10);
}

function formatDateFromTimestamp(timestamp) {
	try {
		return new Date(timestamp).toISOString().slice(0, 10);
	} catch (error) {
		return '';
	}
}

function makeWikiLink(path, title) {
	const withoutExtension = path.replace(/\.md$/i, '');
	return `[[${withoutExtension}|${escapeTable(title)}]]`;
}

function countBy(items, getter) {
	const counts = {};
	for (const item of items) {
		const key = getter(item) || '';
		counts[key] = (counts[key] || 0) + 1;
	}
	return counts;
}

function escapeRegExp(value) {
	return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
