<?php
/**
 * Registers all REST endpoints exposed to the 3xVisibility SaaS backend.
 *
 * Base namespace: 3xv/v1  ->  /wp-json/3xv/v1/...
 *
 * Endpoints:
 *   GET  /ping              - connectivity + version check
 *   GET  /site-info         - site information
 *   GET  /detect            - builder + theme detection
 *   POST /media             - upload a media file (by URL or base64)
 *   POST /publish/elementor - create/update a native Elementor page
 *   POST /publish/gutenberg - create/update a native Gutenberg page
 *   POST /regenerate-css    - regenerate Elementor CSS
 *   POST /clear-cache       - clear common caches
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_REST {

	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		// HTML/CSS v1 publishing: the SaaS ships the template CSS/JS as post meta
		// because wp_kses_post() strips <style>/<script> from REST content for
		// users without `unfiltered_html`. Registering the meta lets the core
		// /wp/v2/pages endpoint accept it, and the plugin re-prints it live.
		add_action( 'init', array( $this, 'register_design_meta' ) );
		add_action( 'wp_footer', array( $this, 'print_template_js' ), PHP_INT_MAX );
		// Preferred delivery: the SaaS bundles the page CSS/JS into external files
		// and sends their URLs, which we enqueue as real <link>/<script src> tags.
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_bundled_assets' ) );
	}

	/**
	 * Expose the connector design meta to the REST API.
	 */
	public function register_design_meta() {
		$can_edit = function () {
			return current_user_can( 'edit_posts' );
		};
		foreach ( array( '_xxxv_template_css', '_xxxv_template_js', '_xxxv_template_css_url', '_xxxv_template_js_url' ) as $key ) {
			register_post_meta(
				'page',
				$key,
				array(
					'type'              => 'string',
					'single'            => true,
					'show_in_rest'      => true,
					'default'           => '',
					'sanitize_callback' => null,
					'auth_callback'     => $can_edit,
				)
			);
		}
	}

	/**
	 * Enqueue the externally bundled template CSS/JS for the current page.
	 *
	 * These are real files served from a stable URL, so the published page keeps
	 * the exact design even though wp_kses_post() removes inline <style>/<script>.
	 */
	public function enqueue_bundled_assets() {
		if ( ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id ) {
			return;
		}

		$css_url = get_post_meta( $post_id, '_xxxv_template_css_url', true );
		if ( is_string( $css_url ) && '' !== trim( $css_url ) && wp_http_validate_url( $css_url ) ) {
			wp_enqueue_style( 'xxxv-template-' . $post_id, esc_url_raw( $css_url ), array(), null );
		}

		$js_url = get_post_meta( $post_id, '_xxxv_template_js_url', true );
		if ( is_string( $js_url ) && '' !== trim( $js_url ) && wp_http_validate_url( $js_url ) ) {
			wp_enqueue_script( 'xxxv-template-' . $post_id, esc_url_raw( $js_url ), array(), null, true );
		}
	}

	/**
	 * Print the template's inline JS on the live page (footer), so animations and
	 * reveal states behave exactly like the SaaS preview.
	 */
	public function print_template_js() {
		if ( ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id ) {
			return;
		}
		$js = get_post_meta( $post_id, '_xxxv_template_js', true );
		if ( ! is_string( $js ) || '' === trim( $js ) ) {
			return;
		}
		echo "\n<script id=\"xxxv-template-js-" . esc_attr( (string) $post_id ) . "\">\n" . $js . "\n</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- template JS must stay raw inside <script>.
	}


	public function register_routes() {
		$auth = array( 'XXXV_Auth', 'check' );

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/ping',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'ping' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/site-info',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'site_info' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/detect',
			array(
				'methods'             => 'GET',
				'callback'            => array( 'XXXV_Detect', 'detect' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/media',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Media', 'upload' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/publish/elementor',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Elementor', 'publish' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/publish/gutenberg',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Gutenberg', 'publish' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/regenerate-css',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Elementor', 'regenerate_css' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/validate-editor',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Elementor', 'validate_editor' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/validate-render',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Validator', 'validate_render' ),
				'permission_callback' => $auth,
			)
		);

		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/clear-cache',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'clear_cache' ),
				'permission_callback' => $auth,
			)
		);

		// AI Action endpoints: menus, themes, page templates.
		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/site-actions/menus',
			array(
				'methods'             => 'GET',
				'callback'            => array( 'XXXV_Site_Actions', 'list_menus' ),
				'permission_callback' => $auth,
			)
		);
		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/site-actions/assign-menu',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Site_Actions', 'assign_menu' ),
				'permission_callback' => $auth,
			)
		);
		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/site-actions/themes',
			array(
				'methods'             => 'GET',
				'callback'            => array( 'XXXV_Site_Actions', 'list_themes' ),
				'permission_callback' => $auth,
			)
		);
		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/site-actions/activate-theme',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Site_Actions', 'activate_theme' ),
				'permission_callback' => $auth,
			)
		);
		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/site-actions/page-templates',
			array(
				'methods'             => 'GET',
				'callback'            => array( 'XXXV_Site_Actions', 'list_page_templates' ),
				'permission_callback' => $auth,
			)
		);
		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/site-actions/set-page-template',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Site_Actions', 'set_page_template' ),
				'permission_callback' => $auth,
			)
		);
		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/site-actions/apply-globals',
			array(
				'methods'             => 'POST',
				'callback'            => array( 'XXXV_Elementor', 'apply_globals_endpoint' ),
				'permission_callback' => $auth,
			)
		);


		register_rest_route(
			XXXV_CONNECTOR_NS,
			'/debug-log',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'debug_log' ),
				'permission_callback' => $auth,
			)
		);
	}

	public function ping() {
		$capabilities = array(
			'native_elementor_publish' => true,
			'elementor_data_verify'     => true,
			'elementor_document_lifecycle' => true,
			'elementor_native_only'      => true,
			'elementor_media_mapping'    => true,
			'elementor_css_validation'   => true,
			'render_css_validation'      => true,
			'template_css_meta'         => true,
			'template_css_enqueue'      => true,
			'cache_clear'               => true,
			'compressed_payloads'       => true,
			'template_library_import'   => true,
			'html_css_js_meta_delivery' => true,
			'bundled_asset_urls'        => true,
		);

		return rest_ensure_response(
			array(
				'ok'               => true,
				'plugin'           => '3xVisibility WordPress Connector',
				'version'          => XXXV_CONNECTOR_VERSION,
				'time'             => current_time( 'mysql' ),
				'wp'               => get_bloginfo( 'version' ),
				'elementor_active' => did_action( 'elementor/loaded' ) > 0,
				'elementor_version'=> defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : null,
				'capabilities'     => $capabilities,
			)
		);
	}

	/**
	 * Return the connector's recent debug/error log ring-buffer.
	 */
	public function debug_log() {
		$log = get_option( 'xxxv_debug_log', array() );
		return rest_ensure_response(
			array(
				'ok'      => true,
				'entries' => is_array( $log ) ? array_reverse( $log ) : array(),
			)
		);
	}

	public function site_info() {
		$theme = wp_get_theme();
		return rest_ensure_response(
			array(
				'name'         => get_bloginfo( 'name' ),
				'description'  => get_bloginfo( 'description' ),
				'url'          => home_url(),
				'admin_email'  => get_bloginfo( 'admin_email' ),
				'language'     => get_bloginfo( 'language' ),
				'wp_version'   => get_bloginfo( 'version' ),
				'php_version'  => phpversion(),
				'timezone'     => wp_timezone_string(),
				'theme'        => array(
					'name'        => $theme->get( 'Name' ),
					'version'     => $theme->get( 'Version' ),
					'template'    => $theme->get_template(),
					'is_block'    => function_exists( 'wp_is_block_theme' ) ? wp_is_block_theme() : false,
				),
				'connector'    => XXXV_CONNECTOR_VERSION,
			)
		);
	}

	/**
	 * Clear common caches (Elementor, WP object cache, and popular plugins).
	 */
	public function clear_cache() {
		$cleared = array();

		// Do not clear Elementor's generated CSS files here; publish/regenerate-css
		// writes fresh page CSS and clearing immediately after can make live pages
		// appear unstyled until Elementor lazily rebuilds assets.

		// WordPress object cache.
		wp_cache_flush();
		$cleared[] = 'wp_object_cache';

		// Popular caching plugins.
		if ( function_exists( 'w3tc_flush_all' ) ) {
			w3tc_flush_all();
			$cleared[] = 'w3tc';
		}
		if ( function_exists( 'wp_cache_clear_cache' ) ) {
			wp_cache_clear_cache();
			$cleared[] = 'wp_super_cache';
		}
		if ( function_exists( 'rocket_clean_domain' ) ) {
			rocket_clean_domain();
			$cleared[] = 'wp_rocket';
		}
		if ( class_exists( 'LiteSpeed\Purge' ) ) {
			do_action( 'litespeed_purge_all' );
			$cleared[] = 'litespeed';
		}

		return rest_ensure_response(
			array(
				'ok'      => true,
				'cleared' => $cleared,
			)
		);
	}
}
