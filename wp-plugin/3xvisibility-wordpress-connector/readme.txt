=== 3xVisibility WordPress Connector ===
Contributors: pagegeneratorpro
Tags: elementor, gutenberg, rest-api, programmatic-seo, page-builder
Requires at least: 5.8
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.4.8
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

= 1.4.8 =
* Reliable CSS storage in Elementor data: new fix_elementor_data() walks the full element tree on publish and preserves everything design-related — raw class strings (css_classes/class/className) are merged into Elementor's native _css_classes advanced setting (de-duplicated), and inline style="" declarations are promoted into per-element custom CSS (scoped selector{...}) so the editor never drops them. Common declarations (color, background-color, text-align, font-size, padding, margin) are also mapped to real Elementor settings when unset, keeping the imported design fully editable.

= 1.4.7 =

* Complete CSS extraction: new extract_all_css_from_html() helper gathers and combines every stylesheet source for a page into one sanitized stylesheet — inline <style> blocks, local/relative <link rel="stylesheet"> hrefs resolved from the template ZIP, inline style="" attributes promoted to scoped rules, and every remaining *.css file bundled inside the ZIP — in proper cascade order with de-duplication so no design CSS is lost on import.

= 1.4.6 =

* Automatic Google Fonts detection & registration: on publish the connector scans the template's CSS @import rules, HTML <link> tags, and font-family declarations (matched against a curated Google Fonts list) and stores a normalized spec per page. On connector pages it then loads the fonts via the Google Fonts CSS2 API with the correct weights, subsets (latin, latin-ext, cyrillic, etc.), and font-display: swap, adds preconnect (fonts.googleapis.com + fonts.gstatic.com) and preload hints for performance, keeps system-font fallbacks, handles multiple families, and registers the families with Elementor's font manager so they resolve correctly in both the editor and frontend.

= 1.4.5 =
* Full CSS image localization: every image referenced inside template CSS via url() — background-image, list-style-image, border-image, cursor, content, and @font-face src — is now downloaded into the WordPress Media Library and the CSS rewritten to the local URLs on publish. URLs are normalized first (localhost/127.* → source host, protocol-relative // → https, http → https, relative/site-relative paths resolved against the template base URL). data:/base64 URIs are decoded into real files, SVG/WebP/AVIF/ICO/BMP/TIFF formats are whitelisted and preserved, @2x/@3x retina filenames are kept, and original bytes are uploaded verbatim so dimensions, quality, and EXIF are preserved while WordPress auto-generates thumbnails + responsive srcset for rasters.

= 1.4.4 =
* Theme CSS isolation on connector pages: the active theme's stylesheets are now dequeued (generic slug handles + per-theme handles for Astra, GeneratePress, Kadence, Twenty Twenty-Five/Four/Three/Two, OceanWP, Blocksy, Neve, Divi, Flatsome, Avada, Storefront, Bricks; Hello Elementor kept as blank canvas), and WordPress block-library/global(theme.json)/duotone styles plus theme editor-styles & block-styles support are disabled on the frontend. The imported template CSS loads last (PHP_INT_MAX) so it always wins the cascade — theme colors, fonts, and custom CSS can no longer override the imported design.

= 1.4.3 =
* Full-stack automatic cache purge on publish: clears Elementor CSS, WP object cache, connector transients, options cache, and every supported page-cache plugin (WP Rocket, W3TC, WP Super Cache, LiteSpeed, WP Fastest Cache, Autoptimize, SG Optimizer, Comet, Cache Enabler, Cachify, Swift), managed hosts (WP Engine, Kinsta, Servebolt, Pantheon), and CDNs (Cloudflare, BunnyCDN). Added cache-busting: no-cache/Pragma/Expires/Surrogate-Control + dynamic ETag & Last-Modified headers on connector pages and versioned CSS/JS URLs so browsers/proxies always load the freshest styled markup.

= 1.4.2 =
* Zero-intervention CSS self-healing: connector pages now automatically rebuild per-page + critical CSS, refresh Elementor assets, and purge caches on every save (WP admin, Elementor "Update", revision restore) and on publish, so live layouts never drift from the imported template. No manual "regenerate CSS" step needed.

= 1.4.1 =
* Hardened CSS box remapping (margin/padding/border-radius): strict numeric validation, unit whitelisting, and safe "0" coercion of empty/malformed sides, so invalid output like `margin:0px px 0px px` can never be generated again. Also improved image sizing so hero/content images no longer collapse to a tiny extracted width (e.g. 72px) and stay fluid.

= 1.4.0 =
* Fixed design-fidelity bugs in the on-page critical CSS compiler: grid containers now emit real `grid-template-columns` (exact source tracks, e.g. two-column heroes no longer collapse to a single column), and box values (margin/padding) with empty sides no longer produce invalid CSS like `0px px 0px px` that dropped the whole rule. Honors the automatic native re-import retry flag.

= 1.3.9 =
* Template-library-first publishing: every published page is now first saved as a native Elementor "Saved Template" and then re-imported into the page through Elementor's own import pipeline (element IDs regenerated, per-widget on_import handlers run). This makes every element a fully-native, editable widget so the published design matches the source 1:1. Falls back to direct publishing automatically if the library import is unavailable.

= 1.3.8 =
* Reliable one-click & automatic self-updates: no more manual download & re-import. Adds "Check for updates" link, keeps plugin active after update, and enables background auto-updates.

= 1.3.7 =
* Fixed LiteSpeed/shared-host 503 publish failures by compressing large Elementor REST payloads, reducing exact-render CSS duplication, and deferring exact HTML media syncing until after the Elementor page is saved.
* Added safer user-facing error messages for WordPress HTML/503/504 responses.

= 1.3.6 =
* Added exact-render Elementor fallback for complex marketplace/AI templates: original HTML/CSS can be preserved inside Elementor while still saving through the Elementor document lifecycle, importing media, forcing full width, regenerating CSS, and validating editor readiness.

= 1.3.5 =
* Fixed overlapping / collapsed text lines on published pages caused by legacy line-height values baked as tiny pixel sizes (a unitless CSS 1.5 stored as 1.5px). Line-heights are now normalized to em multipliers, and existing pages self-heal on republish.

= 1.3.4 =
* Fixed slow-host publish timeouts by removing the duplicate post-publish CSS refresh, shortening blocked image-download waits, and making cache purges page-scoped instead of full-site.

= 1.3.3 =
* Added connector critical CSS compiled directly from Elementor JSON so pages remain styled even when the host deletes or 404s Elementor's generated post CSS file.

= 1.3.2 =
* Fixed AI Site Builder pages publishing as unstyled native Elementor skeletons by preserving generated inline CSS through deterministic native Elementor classes and forcing full-width/full-container output so grid/flex/gradient spacing survives on WordPress.

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
