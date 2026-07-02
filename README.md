# Vuln Report Kit

**Vuln Report Kit** is a local-first Obsidian plugin for vulnerability research notes, disclosure reports, secret review, sanitization, templates, dashboards, timelines, and portable exports.

Version: **1.0.1**

## What it is

Vuln Report Kit turns an Obsidian vault into a structured workspace for vulnerability research documentation. It is designed for responsible disclosure notes, bug bounty writeups, CVE research notes, public article drafts, and sanitized report preparation.

The plugin is intentionally simple: it works with Markdown files inside your vault and does not require any server, account, cloud database, API key, external AI service, or license server.

## Core workflow

1. Create a vulnerability case.
2. Document target, reproduction, impact, evidence, remediation, and timeline.
3. Track cases with a local dashboard.
4. Use starter or professional templates.
5. Generate a final Markdown report.
6. Scan locally for possible secrets.
7. Create a sanitized public copy.
8. Export bundles, shareable folders, indexes, and template backups.

## Main commands

```text
Vuln Report Kit: Create vulnerability case
Vuln Report Kit: Open quick start guide
Vuln Report Kit: Create demo vulnerability case
Vuln Report Kit: Run local health check
Vuln Report Kit: Open vulnerability dashboard
Vuln Report Kit: Update current case status
Vuln Report Kit: Open templates folder
Vuln Report Kit: Install starter template pack
Vuln Report Kit: Import template pack from vault folder
Vuln Report Kit: Create note from template
Vuln Report Kit: Insert template into current note
Vuln Report Kit: Insert report section
Vuln Report Kit: Generate final Markdown report for current case
Vuln Report Kit: Scan current case for secrets
Vuln Report Kit: Create sanitized public copy
Vuln Report Kit: Open exports folder
Vuln Report Kit: Export current case bundle
Vuln Report Kit: Create shareable case archive
Vuln Report Kit: Export all cases index
Vuln Report Kit: Backup templates
```

## Generated case structure

A new case is created under the configured root folder, by default:

```text
Vulnerability Research/
└── 2026-07-02-example-vulnerability/
    ├── 00-overview.md
    ├── 01-target.md
    ├── 02-reproduction.md
    ├── 03-impact.md
    ├── 04-evidence.md
    ├── 05-remediation.md
    ├── 06-timeline.md
    ├── 08-article-draft.md
    └── attachments/
```

Generated outputs include:

```text
99-final-report.md
99-public-report.md
secret-scan-report.md
```

## Template packs

The plugin includes a starter template pack and supports importing local template packs into:

```text
Vulnerability Research/_templates/
```

Supported template variables include:

```text
{{title}}
{{target}}
{{vendor}}
{{category}}
{{severity}}
{{status}}
{{cwe}}
{{cvss}}
{{disclosure}}
{{created}}
{{last_updated}}
{{today}}
{{case_folder}}
```

## Secret scanner and sanitizer

The scanner is local and regex-based. It can flag possible:

```text
private keys
Authorization headers
Bearer tokens
JWTs
AWS keys
GitHub tokens
Google API keys
Slack tokens
Stripe secret keys
generic API keys / client secrets / access tokens
cookies
session IDs
password-like assignments
emails
private IPs
localhost URLs
basic-auth URLs
```

The sanitizer creates a public copy with placeholders such as:

```text
<REDACTED_TOKEN>
<REDACTED_COOKIE>
<REDACTED_JWT>
<REDACTED_GITHUB_TOKEN>
<REDACTED_AWS_ACCESS_KEY>
<EMAIL>
<PRIVATE_IP>
<LOCAL_URL>
```

## Local-only design

The plugin does not require:

- server;
- account;
- login;
- cloud database;
- API key;
- external AI service;
- license server.

Everything is stored as local files inside the Obsidian vault.

## Important security note

Secret scanning and sanitization are helper features, not a guarantee that a report is safe to publish. Always manually review public reports and shareable archives before sending or publishing them.

## Recommended first test

Use a clean test vault and run:

```text
Vuln Report Kit: Create demo vulnerability case
Vuln Report Kit: Open vulnerability dashboard
Vuln Report Kit: Generate final Markdown report for current case
Vuln Report Kit: Scan current case for secrets
Vuln Report Kit: Create sanitized public copy
Vuln Report Kit: Export all cases index
```

