=== 3xVisibility WordPress Connector ===
Contributors: pagegeneratorpro
Tags: elementor, gutenberg, rest-api, programmatic-seo, page-builder
Requires at least: 5.8
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Secure companion plugin that lets the 3xVisibility publish native Elementor & Gutenberg pages, upload media, regenerate CSS, clear caches, and detect builders/themes.

== Description ==

The 3xVisibility WordPress Connector exposes a small set of secure REST endpoints (namespace `pgp/v1`) used by the 3xVisibility backend to publish pages that behave exactly like pages built manually inside WordPress.

Endpoints:
* GET  `/wp-json/pgp/v1/ping` — connectivity + version
* GET  `/wp-json/pgp/v1/site-info` — site information
* GET  `/wp-json/pgp/v1/detect` — builder + theme detection
* POST `/wp-json/pgp/v1/media` — media upload (URL or base64)
* POST `/wp-json/pgp/v1/publish/elementor` — native Elementor page
* POST `/wp-json/pgp/v1/publish/gutenberg` — native Gutenberg page
* POST `/wp-json/pgp/v1/regenerate-css` — rebuild Elementor CSS
* POST `/wp-json/pgp/v1/clear-cache` — clear common caches

All endpoints require the `X-PGP-Key` header. The key is generated on activation and shown under Settings → 3xVisibility WordPress Connector.

Works with Elementor (free) and the core Gutenberg block editor. Auto-updates from the 3xVisibility manifest.

== Installation ==

1. Download the plugin zip from your 3xVisibility dashboard / landing page.
2. In WordPress go to Plugins → Add New → Upload Plugin, choose the zip, and Install.
3. Activate the plugin.
4. Open Settings → 3xVisibility WordPress Connector and copy the Site URL + API Key into your 3xVisibility account.

== Changelog ==

= 1.0.0 =
* Initial release: Elementor + Gutenberg publishing, media upload, CSS regeneration, cache clearing, builder/theme detection, site info, secure key auth, self-updater.
