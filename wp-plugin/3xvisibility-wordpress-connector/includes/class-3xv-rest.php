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
			'/clear-cache',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'clear_cache' ),
				'permission_callback' => $auth,
			)
		);
	}

	public function ping() {
		return rest_ensure_response(
			array(
				'ok'        => true,
				'plugin'    => '3xVisibility WordPress Connector',
				'version'   => XXXV_CONNECTOR_VERSION,
				'time'      => current_time( 'mysql' ),
				'wp'        => get_bloginfo( 'version' ),
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

		// Elementor file cache.
		if ( did_action( 'elementor/loaded' ) && class_exists( '\Elementor\Plugin' ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
			$cleared[] = 'elementor';
		}

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
