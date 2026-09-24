# Vuln Report Kit 1.1.0

Vuln Report Kit 1.1.0 introduces a simpler two-mode interface while keeping the full local-first feature set.

## Highlights

- Added **Light mode** as the default interface.
- Added **Advanced mode** for template management, exports, backups, demo utilities, and extra helpers.
- Preserved the complete secret scanner and sanitizer feature set from 1.0.x.
- Removed professional/paid wording from plugin messaging.
- Renamed the optional template collection to **Advanced Template Pack**.
- Aligned `manifest.json`, `package.json`, `package-lock.json`, and `versions.json` to 1.1.0.
- No server, account, telemetry, external API, AI service, or license server is required.

## Light mode commands

- Create vulnerability case
- Open quick start guide
- Run local health check
- Open vulnerability dashboard
- Update current case status
- Generate final Markdown report for current case
- Scan current case for secrets
- Create sanitized public copy

## Advanced mode additions

- Demo case generation
- Template folder management
- Starter/custom/advanced template-pack import
- Create/insert notes from templates
- Insert report sections
- Local exports and backups
- Shareable case archives
- All-cases index export

## Upgrade note

After switching between Light and Advanced mode, reload the plugin so the command palette is rebuilt with the selected command set.
