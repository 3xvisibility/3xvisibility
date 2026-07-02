<?php
/**
 * Plugin Name:       3xVisibility WordPress Connector
 * Plugin URI:        https://3xvisibility.com
 * Description:        Secure companion plugin that bridges your 3xVisibility account and WordPress — publishing native Elementor (Free) & Gutenberg pages, uploading media, regenerating Elementor CSS, clearing caches, and detecting builders/themes/global styles so programmatic pages behave exactly like pages built manually inside WordPress.
 * Version:           1.3.8
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

define( 'XXXV_CONNECTOR_VERSION', '1.3.8' );
define( 'XXXV_CONNECTOR_FILE', __FILE__ );
define( 'XXXV_CONNECTOR_DIR', plugin_dir_path( __FILE__ ) );
define( 'XXXV_CONNECTOR_NS', 'pgp/v1' );
define( 'XXXV_CONNECTOR_OPT_KEY', 'pgp_connector_api_key' );
define( 'XXXV_CONNECTOR_UPDATE_URL', 'https://3xvisibility.com/wp-plugin/3xvisibility-wordpress-connector-update.json' );

require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-auth.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-rest.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-elementor.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-gutenberg.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-media.php';
require_once XXXV_CONNECTOR_DIR . 'includes/class-3xv-detect.php';
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
	add_action( 'wp_enqueue_scripts', array( 'XXXV_Elementor', 'enqueue_template_css' ), PHP_INT_MAX );
	// Print inside <head> after every other style tag.
	add_action( 'wp_head', array( 'XXXV_Elementor', 'print_template_css' ), PHP_INT_MAX );
	// Last-resort guarantee: re-emit the template CSS just before </body>. At equal
	// specificity, a rule declared later in document order wins — a footer <style>
	// beats any head style Elementor or the active theme injected, so the published
	// page renders 1:1 with the template even when caching plugins reorder head CSS.
	add_action( 'wp_footer', array( 'XXXV_Elementor', 'print_template_css' ), PHP_INT_MAX );
	add_action( 'xxxv_deferred_exact_media_sync', array( 'XXXV_Elementor', 'deferred_exact_media_sync' ), 10, 1 );
}
add_action( 'plugins_loaded', 'xxxv_connector_boot' );
