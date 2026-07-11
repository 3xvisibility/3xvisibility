<?php
/**
 * Plugin Name:       3xVisibility WordPress Connector
 * Plugin URI:        https://3xvisibility.com
 * Description:        Secure companion plugin that bridges your 3xVisibility account and WordPress — publishing native Elementor (Free) & Gutenberg pages, uploading media, regenerating Elementor CSS, clearing caches, and detecting builders/themes/global styles so programmatic pages behave exactly like pages built manually inside WordPress.
 * Version:           1.6.5
 * Author:            3xVisibility
 * Author URI:        https://3xvisibility.com
 * License:           GPL-2.0+
 * Text Domain:       3xvisibility-wordpress-connector
 *
 * @package ThreeXVisibilityWordPressConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

define( 'XXXV_CONNECTOR_VERSION', '1.6.5' );
define( 'XXXV_CONNECTOR_FILE', __FILE__ );
define( 'XXXV_CONNECTOR_DIR', plugin_dir_path( __FILE__ ) );
define( 'XXXV_CONNECTOR_NS', 'pgp/v1' );
define( 'XXXV_CONNECTOR_OPT_KEY', 'pgp_connector_api_key' );
// Theme-CSS neutralization behavior (per connector / per site).
define( 'XXXV_CONNECTOR_OPT_NEUTRALIZE', 'xxxv_neutralize_theme_css' );        // '1' | '0'
define( 'XXXV_CONNECTOR_OPT_NEUTRALIZE_EXCLUDES', 'xxxv_neutralize_excludes' ); // newline-separated style handles to keep
define( 'XXXV_CONNECTOR_OPT_NEUTRALIZE_REMOVALS', 'xxxv_neutralize_removals' ); // newline-separated handles/patterns to force-remove
define( 'XXXV_CONNECTOR_UPDATE_URL', 'https://3xvisibility.com/wp-plugin/3xvisibility-wordpress-connector-update.json' );

require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-auth.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-rest.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-elementor.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-gutenberg.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-media.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-detect.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-validator.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-site-actions.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-updater.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-admin.php';

/**
 * Generate a secure API key on activation if one does not already exist.
 */
function xxxv_connector_activate() {
	if ( ! get_option( XXXV_CONNECTOR_OPT_KEY ) ) {
		update_option( XXXV_CONNECTOR_OPT_KEY, wp_generate_password( 48, false, false ) );
	}
}
register_activation_hook( __FILE__, 'xxxv_connector_activate' );

/**
 * Boot the plugin.
 */
function xxxv_connector_boot() {
	new XXXV_Admin();
	new XXXV_REST();
	new XXXV_Updater();
	// Enqueue as late as possible so our inline stylesheet is registered AFTER
	// Elementor's per-post CSS in the queue and therefore wins equal-specificity
	// cascade conflicts (e.g. template grid vs. Elementor container flex).
	// Neutralize active theme + WP global/block/duotone styles on connector pages
	// (runs before our template CSS enqueue) so imported design can't be overridden.
	add_action( 'wp_enqueue_scripts', array( 'XXXV_Elementor', 'disable_global_styles' ), 9 );
	add_action( 'wp_enqueue_scripts', array( 'XXXV_Elementor', 'neutralize_theme_css' ), PHP_INT_MAX - 5 );
	add_action( 'init', array( 'XXXV_Elementor', 'disable_global_styles' ) );
	add_action( 'wp_enqueue_scripts', array( 'XXXV_Elementor', 'enqueue_template_css' ), PHP_INT_MAX );
	// Run absolutely last so theme styles are gone and Elementor/connector CSS wins.
	add_action( 'wp_enqueue_scripts', array( 'XXXV_Elementor', 'prevent_theme_css_override' ), PHP_INT_MAX );
	// Auto-register the template's Google Fonts (correct weights/subsets +
	// display=swap) with preconnect/preload hints on connector pages so imported
	// typography renders exactly and fast.
	add_action( 'wp_enqueue_scripts', array( 'XXXV_Elementor', 'enqueue_google_fonts' ), 8 );
	add_action( 'wp_head', array( 'XXXV_Elementor', 'preconnect_google_fonts' ), 1 );
	// Make the detected Google Fonts known to Elementor's font manager (editor + frontend).
	add_filter( 'elementor/fonts/additional_fonts', array( 'XXXV_Elementor', 'register_elementor_fonts' ) );
	// Print inside <head> after every other style tag.
	add_action( 'wp_head', array( 'XXXV_Elementor', 'print_template_css' ), PHP_INT_MAX );
	// Last-resort guarantee: re-emit the template CSS just before </body>. At equal
	// specificity, a rule declared later in document order wins — a footer <style>
	// beats any head style Elementor or the active theme injected, so the published
	// page renders 1:1 with the template even when caching plugins reorder head CSS.
	add_action( 'wp_footer', array( 'XXXV_Elementor', 'print_template_css' ), PHP_INT_MAX );
	// Drive the counter count-up with the source easing curve (Elementor has a
	// native duration control but no easing control).
	add_action( 'wp_footer', array( 'XXXV_Elementor', 'print_counter_easing_script' ), PHP_INT_MAX );
	add_action( 'xxxv_deferred_exact_media_sync', array( 'XXXV_Elementor', 'deferred_exact_media_sync' ), 10, 1 );

	// ---- Zero-intervention CSS self-healing --------------------------------
	// Rebuild per-page CSS + connector critical CSS and purge caches whenever a
	// connector-imported page is saved (WP admin, Elementor "Update", revision
	// restore, etc.) so the live layout never drifts from the template.
	add_action( 'save_post_page', array( 'XXXV_Elementor', 'auto_regenerate_on_save' ), 20, 3 );
	// Elementor saves documents through its own ajax pipeline; hook that too.
	add_action( 'elementor/document/after_save', function ( $document ) {
		if ( is_object( $document ) && method_exists( $document, 'get_main_id' ) ) {
			XXXV_Elementor::auto_regenerate_on_save( (int) $document->get_main_id() );
		}
	}, 20, 1 );
	// Full cache purge the moment a connector page goes live.
	add_action( 'transition_post_status', array( 'XXXV_Elementor', 'auto_clear_caches_on_publish' ), 20, 3 );
	// Cache-busting: no-cache headers on connector pages + versioned asset URLs so
	// browsers/proxies/CDNs always re-fetch the freshest styled markup after a publish.
	add_action( 'send_headers', array( 'XXXV_Elementor', 'send_no_cache_headers' ) );
	add_filter( 'style_loader_src', array( 'XXXV_Elementor', 'version_bust_asset_src' ), 20, 2 );
	add_filter( 'script_loader_src', array( 'XXXV_Elementor', 'version_bust_asset_src' ), 20, 2 );
}
add_action( 'plugins_loaded', 'xxxv_connector_boot' );
