=== 3xVisibility HTML Assets ===
Contributors: 3xvisibility
Requires at least: 5.8
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Makes 3xVisibility generated pages render exactly like the preview.

WordPress removes <style>, <link> and <script> tags from page content
(wp_kses_post) for any user without the `unfiltered_html` capability. The markup
of a generated page survives, but all of its CSS/JS is deleted, so the live page
looks unstyled.

This plugin:
1. Allows those design tags inside post content.
2. Registers the `_xxxv_template_css(_url)` / `_xxxv_template_js(_url)` post meta
   so 3xVisibility can ship the page CSS/JS outside the content.
3. Enqueues / prints those assets on the live page (footer-last, so template CSS
   wins the cascade).
4. Skips wpautop on generated pages so layouts are not broken by stray <p> tags.

Install: Plugins > Add New > Upload Plugin > choose this ZIP > Activate.
