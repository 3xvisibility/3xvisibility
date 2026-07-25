<?php
/**
 * Plugin Name:       3xVisibility HTML Assets
 * Plugin URI:        https://3xvisibility.com
 * Description:       Makes 3xVisibility generated pages render 1:1 on WordPress. WordPress removes &lt;style&gt;, &lt;link&gt; and &lt;script&gt; tags from page content (wp_kses_post), which strips the design of a generated page. This plugin allows those tags for 3xVisibility pages and re-prints the page CSS/JS from post meta on the live page.
 * Version:           1.0.0
 * Author:            3xVisibility
 * Author URI:        https://3xvisibility.com
 * License:           GPL-2.0+
 *
 * @package ThreeXVisibilityHtmlAssets
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'XXXV_HTML_ASSETS_VERSION', '1.0.0' );

/**
 * 1) Allow design tags inside post content.
 *
 * WordPress runs wp_kses_post() on REST content for any user without the
 * `unfiltered_html` capability (always the case on multisite and on hosts that
 * define DISALLOW_UNFILTERED_HTML). That silently deletes <style>, <link> and
 * <script>, so a generated page keeps its markup but loses all styling.
 */
function xxxv_html_assets_allow_design_tags( $tags, $context ) {
	if ( 'post' !== $context ) {
		return $tags;
	}

	$tags['style'] = array(
		'type'                 => true,
		'media'                => true,
		'id'                   => true,
		'class'                => true,
		'data-xxxv-asset'      => true,
	);

	$tags['link'] = array(
		'rel'             => true,
		'href'            => true,
		'type'            => true,
		'media'           => true,
		'as'              => true,
		'crossorigin'     => true,
		'id'              => true,
		'data-xxxv-asset' => true,
	);

	$tags['script'] = array(
		'src'             => true,
		'type'            => true,
		'defer'           => true,
		'async'           => true,
		'id'              => true,
		'data-xxxv-asset' => true,
	);

	$tags['noscript'] = array();
	$tags['svg']      = array_merge(
		isset( $tags['svg'] ) ? $tags['svg'] : array(),
		array(
			'xmlns'        => true,
			'viewbox'      => true,
			'viewBox'      => true,
			'fill'         => true,
			'stroke'       => true,
			'width'        => true,
			'height'       => true,
			'class'        => true,
			'aria-hidden'  => true,
		)
	);
	foreach ( array( 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'defs', 'lineargradient', 'stop', 'use' ) as $svg_tag ) {
		$tags[ $svg_tag ] = array(
			'd'                 => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
			'stroke-linecap'    => true,
			'stroke-linejoin'   => true,
			'cx'                => true,
			'cy'                => true,
			'r'                 => true,
			'x'                 => true,
			'y'                 => true,
			'x1'                => true,
			'y1'                => true,
			'x2'                => true,
			'y2'                => true,
			'rx'                => true,
			'ry'                => true,
			'width'             => true,
			'height'            => true,
			'points'            => true,
			'offset'            => true,
			'stop-color'        => true,
			'id'                => true,
			'class'             => true,
			'transform'         => true,
			'gradientunits'     => true,
			'xlink:href'        => true,
			'href'              => true,
		);
	}

	return $tags;
}
add_filter( 'wp_kses_allowed_html', 'xxxv_html_assets_allow_design_tags', 10, 2 );

/**
 * Keep every CSS declaration the template needs (CSS custom properties,
 * transforms, filters, gradients…) inside inline style="" attributes.
 */
function xxxv_html_assets_allow_style_props( $attr ) {
	return array_merge(
		is_array( $attr ) ? $attr : array(),
		array(
			'transform',
			'transition',
			'animation',
			'animation-delay',
			'animation-duration',
			'animation-name',
			'filter',
			'backdrop-filter',
			'background-image',
			'background',
			'background-clip',
			'-webkit-background-clip',
			'-webkit-text-fill-color',
			'mask',
			'mask-image',
			'aspect-ratio',
			'gap',
			'row-gap',
			'column-gap',
			'grid-template-columns',
			'grid-template-rows',
			'grid-column',
			'grid-row',
			'object-fit',
			'object-position',
			'inset',
			'translate',
			'rotate',
			'scale',
			'will-change',
			'pointer-events',
			'mix-blend-mode',
		)
	);
}
add_filter( 'safe_style_css', 'xxxv_html_assets_allow_style_props' );

/**
 * Allow CSS custom properties (--token: value) inside inline styles.
 */
function xxxv_html_assets_allow_css_vars( $allow_css, $css_test_string ) {
	if ( ! $allow_css && is_string( $css_test_string ) && 0 === strpos( ltrim( $css_test_string ), '--' ) ) {
		return true;
	}
	return $allow_css;
}
add_filter( 'safecss_filter_attr_allow_css', 'xxxv_html_assets_allow_css_vars', 10, 2 );

/**
 * 2) Register the meta keys 3xVisibility ships alongside the page so the CSS/JS
 *    can also travel outside post content and be enqueued on the live page.
 */
function xxxv_html_assets_register_meta() {
	$keys = array(
		'_xxxv_template_css'     => 'string',
		'_xxxv_template_js'      => 'string',
		'_xxxv_template_css_url' => 'string',
		'_xxxv_template_js_url'  => 'string',
	);

	foreach ( array( 'page', 'post' ) as $post_type ) {
		foreach ( $keys as $key => $type ) {
			register_post_meta(
				$post_type,
				$key,
				array(
					'type'              => $type,
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'xxxv_html_assets_sanitize_meta',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}
}
add_action( 'init', 'xxxv_html_assets_register_meta' );

/**
 * Keep CSS/JS payloads intact (no kses) but never allow a closing tag that could
 * break out of the <style>/<script> element we print them in.
 */
function xxxv_html_assets_sanitize_meta( $value ) {
	if ( ! is_string( $value ) ) {
		return '';
	}
	$value = str_ireplace( array( '</style', '</script' ), array( '<\/style', '<\/script' ), $value );
	return $value;
}

/**
 * 3) Front-end delivery: enqueue the external bundle URLs and print the inline
 *    CSS/JS from meta. Runs as late as possible so template CSS wins the cascade.
 */
function xxxv_html_assets_enqueue() {
	if ( ! is_singular() ) {
		return;
	}
	$post_id = get_queried_object_id();
	if ( ! $post_id ) {
		return;
	}

	$css_url = get_post_meta( $post_id, '_xxxv_template_css_url', true );
	$js_url  = get_post_meta( $post_id, '_xxxv_template_js_url', true );

	if ( is_string( $css_url ) && '' !== trim( $css_url ) ) {
		wp_enqueue_style( 'xxxv-page-css', esc_url_raw( $css_url ), array(), null );
	}
	if ( is_string( $js_url ) && '' !== trim( $js_url ) ) {
		wp_enqueue_script( 'xxxv-page-js', esc_url_raw( $js_url ), array(), null, true );
	}
}
add_action( 'wp_enqueue_scripts', 'xxxv_html_assets_enqueue', PHP_INT_MAX );

/**
 * Inline CSS fallback, printed in the footer so it wins equal-specificity
 * conflicts against theme/builder CSS injected in <head>.
 */
function xxxv_html_assets_print_inline_css() {
	if ( ! is_singular() ) {
		return;
	}
	$css = get_post_meta( get_queried_object_id(), '_xxxv_template_css', true );
	if ( is_string( $css ) && '' !== trim( $css ) ) {
		echo "\n<style id=\"xxxv-page-inline-css\">\n" . $css . "\n</style>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
add_action( 'wp_head', 'xxxv_html_assets_print_inline_css', PHP_INT_MAX );
add_action( 'wp_footer', 'xxxv_html_assets_print_inline_css', 1 );

/**
 * Inline JS fallback (template reveal/animation logic).
 */
function xxxv_html_assets_print_inline_js() {
	if ( ! is_singular() ) {
		return;
	}
	$js = get_post_meta( get_queried_object_id(), '_xxxv_template_js', true );
	if ( is_string( $js ) && '' !== trim( $js ) ) {
		echo "\n<script id=\"xxxv-page-inline-js\">\n" . $js . "\n</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
add_action( 'wp_footer', 'xxxv_html_assets_print_inline_js', PHP_INT_MAX );

/**
 * 4) Status endpoint so 3xVisibility can verify the delivery path is healthy
 *    before/after publishing.
 */
function xxxv_html_assets_register_rest() {
	register_rest_route(
		'xxxv/v1',
		'/assets-status',
		array(
			'methods'             => 'GET',
			'permission_callback' => function () {
				return current_user_can( 'edit_posts' );
			},
			'callback'            => function () {
				return array(
					'plugin'          => '3xvisibility-html-assets',
					'version'         => XXXV_HTML_ASSETS_VERSION,
					'design_tags_ok'  => true,
					'meta_registered' => true,
					'unfiltered_html' => current_user_can( 'unfiltered_html' ),
				);
			},
		)
	);
}
add_action( 'rest_api_init', 'xxxv_html_assets_register_rest' );

/**
 * Do not let WordPress wrap generated markup in stray <p>/<br> tags — that is
 * what turns a flex/grid layout into a broken stack of paragraphs.
 */
function xxxv_html_assets_disable_wpautop( $content ) {
	if ( is_singular() && ( false !== strpos( (string) $content, 'data-xxxv' ) || false !== strpos( (string) $content, 'pgp-page' ) || false !== strpos( (string) $content, 'tpl-root' ) ) ) {
		remove_filter( 'the_content', 'wpautop' );
	}
	return $content;
}
add_filter( 'the_content', 'xxxv_html_assets_disable_wpautop', 1 );
