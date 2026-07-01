=== 3xVisibility WordPress Connector ===
Contributors: pagegeneratorpro
Tags: elementor, gutenberg, rest-api, programmatic-seo, page-builder
Requires at least: 5.8
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.3.1
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

= 1.3.1 =
* Fixed native Elementor pages rendering with broken layout/CSS: the stored template stylesheet is now emitted after every Elementor and theme stylesheet (wp_head + wp_footer at max priority) so equal-specificity rules (template grid/flex vs. Elementor container defaults) win the cascade and the published page matches the design 1:1.

= 1.2.0 =
* Added a `/validate-editor` endpoint so the app can re-run the "Edit with Elementor" readiness check for any already-published page on demand, without republishing.

= 1.1.9 =
* If the post-publish editor-readiness check fails, automatically purge WordPress caches and force an Elementor CSS/asset regeneration, then retry the check up to 3 times before rolling back.

= 1.1.8 =
* Add automatic post-publish editor-readiness check: confirm the page opens in "Edit with Elementor" mode (builder edit mode + Elementor document built) and that editable widgets are present before returning success; roll back otherwise.


= 1.1.7 =
* Enforce native Elementor-only publishing: reject HTML widgets/raw HTML injection, save through Elementor's document lifecycle, import/map all template images and CSS backgrounds to Media Library attachment IDs/URLs, regenerate and validate Elementor CSS before returning success.

= 1.1.4 =
* Preserve live Elementor styling after REST publish by keeping regenerated CSS files, enqueueing stored template CSS, and injecting CSS with native Elementor data.

= 1.1.3 =
* Add publishing pre-flight capability reporting and strict post-save `_elementor_data` verification.

= 1.1.2 =
* Harden connector authentication so API keys with whitespace are handled reliably and the SaaS can send both 3xVisibility and legacy PGP headers.

= 1.1.1 =
* Preserve and print marketplace template CSS on native Elementor pages so published designs keep exact spacing, colors, backgrounds, and layout.

= 1.0.0 =
* Initial release: Elementor + Gutenberg publishing, media upload, CSS regeneration, cache clearing, builder/theme detection, site info, secure key auth, self-updater.
