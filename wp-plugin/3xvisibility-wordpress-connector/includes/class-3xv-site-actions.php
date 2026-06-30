<?php
/**
 * AI Action endpoints for site-level control.
 *
 * These endpoints let the 3xVisibility SaaS backend control WordPress
 * structure the same way a site admin would inside wp-admin:
 *
 *   GET  /site-actions/menus            - list nav menus + menu locations
 *   POST /site-actions/assign-menu      - assign a menu to a theme location
 *   GET  /site-actions/themes           - list installed themes (+ active)
 *   POST /site-actions/activate-theme   - switch the active theme
 *   GET  /site-actions/page-templates   - list available page templates
 *   POST /site-actions/set-page-template- set the template of a single page
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Site_Actions {

	/* ------------------------------------------------------------------ */
	/* Menus                                                              */
	/* ------------------------------------------------------------------ */

	public static function list_menus() {
		$menus = wp_get_nav_menus();
		$out_menus = array();
		foreach ( $menus as $menu ) {
			$out_menus[] = array(
				'id'    => (int) $menu->term_id,
				'name'  => $menu->name,
				'slug'  => $menu->slug,
				'count' => (int) $menu->count,
			);
		}

		$registered = get_registered_nav_menus();
		$assigned   = get_nav_menu_locations();
		$locations  = array();
		foreach ( $registered as $loc_slug => $loc_label ) {
			$locations[] = array(
				'slug'        => $loc_slug,
				'label'       => $loc_label,
				'assigned_id' => isset( $assigned[ $loc_slug ] ) ? (int) $assigned[ $loc_slug ] : 0,
			);
		}

		return rest_ensure_response(
			array(
				'ok'        => true,
				'menus'     => $out_menus,
				'locations' => $locations,
			)
		);
	}

	public static function assign_menu( WP_REST_Request $request ) {
		$body     = $request->get_json_params();
		$location = isset( $body['location'] ) ? sanitize_text_field( $body['location'] ) : '';
		$menu_id  = isset( $body['menu_id'] ) ? absint( $body['menu_id'] ) : 0;

		if ( '' === $location ) {
			return new WP_Error( 'xxxv_bad_location', 'A menu location slug is required.', array( 'status' => 400 ) );
		}
		$registered = get_registered_nav_menus();
		if ( ! isset( $registered[ $location ] ) ) {
			return new WP_Error( 'xxxv_unknown_location', 'Unknown menu location: ' . $location, array( 'status' => 400 ) );
		}
		if ( $menu_id && ! wp_get_nav_menu_object( $menu_id ) ) {
			return new WP_Error( 'xxxv_unknown_menu', 'Unknown menu id: ' . $menu_id, array( 'status' => 400 ) );
		}

		$locations = get_nav_menu_locations();
		if ( $menu_id ) {
			$locations[ $location ] = $menu_id;
		} else {
			unset( $locations[ $location ] );
		}
		set_theme_mod( 'nav_menu_locations', $locations );

		return rest_ensure_response(
			array(
				'ok'       => true,
				'location' => $location,
				'menu_id'  => $menu_id,
			)
		);
	}

	/* ------------------------------------------------------------------ */
	/* Themes                                                             */
	/* ------------------------------------------------------------------ */

	public static function list_themes() {
		$themes  = wp_get_themes();
		$current = wp_get_theme();
		$out     = array();
		foreach ( $themes as $stylesheet => $theme ) {
			$out[] = array(
				'stylesheet' => $stylesheet,
				'name'       => $theme->get( 'Name' ),
				'version'    => $theme->get( 'Version' ),
				'is_block'   => function_exists( 'wp_is_block_theme' ) && method_exists( $theme, 'is_block_theme' ) ? (bool) $theme->is_block_theme() : false,
				'active'     => ( $stylesheet === $current->get_stylesheet() ),
			);
		}

		return rest_ensure_response(
			array(
				'ok'     => true,
				'active' => $current->get_stylesheet(),
				'themes' => $out,
			)
		);
	}

	public static function activate_theme( WP_REST_Request $request ) {
		$body       = $request->get_json_params();
		$stylesheet = isset( $body['stylesheet'] ) ? sanitize_text_field( $body['stylesheet'] ) : '';

		if ( '' === $stylesheet ) {
			return new WP_Error( 'xxxv_bad_theme', 'A theme stylesheet is required.', array( 'status' => 400 ) );
		}
		$theme = wp_get_theme( $stylesheet );
		if ( ! $theme->exists() ) {
			return new WP_Error( 'xxxv_unknown_theme', 'Theme not installed: ' . $stylesheet, array( 'status' => 400 ) );
		}

		switch_theme( $stylesheet );

		return rest_ensure_response(
			array(
				'ok'     => true,
				'active' => $stylesheet,
			)
		);
	}

	/* ------------------------------------------------------------------ */
	/* Page templates                                                     */
	/* ------------------------------------------------------------------ */

	public static function list_page_templates() {
		$templates = array(
			array( 'slug' => 'default', 'name' => 'Default Template' ),
			array( 'slug' => 'elementor_header_footer', 'name' => 'Elementor Full Width' ),
			array( 'slug' => 'elementor_canvas', 'name' => 'Elementor Canvas' ),
			array( 'slug' => 'elementor_theme', 'name' => 'Elementor Theme' ),
		);

		// Theme-provided page templates.
		$theme_templates = wp_get_theme()->get_page_templates( null, 'page' );
		foreach ( $theme_templates as $file => $label ) {
			$templates[] = array( 'slug' => $file, 'name' => $label );
		}

		return rest_ensure_response(
			array(
				'ok'        => true,
				'templates' => $templates,
			)
		);
	}

	public static function set_page_template( WP_REST_Request $request ) {
		$body     = $request->get_json_params();
		$post_id  = isset( $body['post_id'] ) ? absint( $body['post_id'] ) : 0;
		$template = isset( $body['template'] ) ? sanitize_text_field( $body['template'] ) : '';

		if ( ! $post_id || ! get_post( $post_id ) ) {
			return new WP_Error( 'xxxv_bad_post', 'A valid post_id is required.', array( 'status' => 400 ) );
		}
		if ( '' === $template ) {
			return new WP_Error( 'xxxv_bad_template', 'A template slug is required.', array( 'status' => 400 ) );
		}

		if ( 'default' === $template ) {
			delete_post_meta( $post_id, '_wp_page_template' );
		} else {
			update_post_meta( $post_id, '_wp_page_template', $template );
		}

		// Flush Elementor cache so the new layout takes effect immediately.
		if ( did_action( 'elementor/loaded' ) && class_exists( '\\Elementor\\Plugin' ) ) {
			try {
				\Elementor\Plugin::$instance->files_manager->clear_cache();
			} catch ( \Throwable $e ) {
				// non-fatal
			}
		}

		return rest_ensure_response(
			array(
				'ok'       => true,
				'post_id'  => $post_id,
				'template' => $template,
			)
		);
	}
}
