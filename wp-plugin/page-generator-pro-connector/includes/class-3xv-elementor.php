<?php
/**
 * Native Elementor publishing.
 *
 * Accepts the Elementor data model (array of sections/containers) from the
 * SaaS backend, creates/updates a real WordPress page, stores the Elementor
 * meta exactly like the editor does, marks the page as built with Elementor,
 * and regenerates the per-page CSS so the published page looks identical to
 * one saved manually inside the Elementor editor.
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Elementor {

	/**
	 * Publish or update an Elementor page.
	 *
	 * Expected JSON body:
	 * {
	 *   "title": "Page title",
	 *   "slug": "page-slug",
	 *   "status": "publish" | "draft",
	 *   "post_id": 123,                 // optional, update instead of create
	 *   "elementor_data": [ ... ],      // Elementor element model (array)
	 *   "page_template": "elementor_canvas" | "elementor_header_footer" | "default",
	 *   "meta": { "_yoast_wpseo_title": "...", ... }
	 * }
	 *
	 * @param WP_REST_Request $request The request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function publish( WP_REST_Request $request ) {
		if ( ! did_action( 'elementor/loaded' ) ) {
			return new WP_Error(
				'xxxv_no_elementor',
				'Elementor is not active on this site. Install and activate Elementor (free) first.',
				array( 'status' => 400 )
			);
		}

		$body = $request->get_json_params();
		if ( empty( $body ) || ! is_array( $body ) ) {
			return new WP_Error( 'xxxv_bad_body', 'Missing or invalid JSON body.', array( 'status' => 400 ) );
		}

		$title          = isset( $body['title'] ) ? sanitize_text_field( $body['title'] ) : 'Untitled';
		$slug           = isset( $body['slug'] ) ? sanitize_title( $body['slug'] ) : sanitize_title( $title );
		$status         = ( isset( $body['status'] ) && 'draft' === $body['status'] ) ? 'draft' : 'publish';
		$post_id        = isset( $body['post_id'] ) ? absint( $body['post_id'] ) : 0;
		$elementor_data = isset( $body['elementor_data'] ) ? $body['elementor_data'] : array();
		$page_template  = isset( $body['page_template'] ) ? sanitize_text_field( $body['page_template'] ) : 'elementor_canvas';

		// Elementor data may arrive as a JSON string; normalize to array.
		if ( is_string( $elementor_data ) ) {
			$decoded = json_decode( $elementor_data, true );
			$elementor_data = is_array( $decoded ) ? $decoded : array();
		}
		if ( ! is_array( $elementor_data ) ) {
			$elementor_data = array();
		}

		$postarr = array(
			'post_title'   => $title,
			'post_name'    => $slug,
			'post_status'  => $status,
			'post_type'    => 'page',
			'post_content' => '', // Elementor renders from meta, not the classic body.
		);

		if ( $post_id > 0 && get_post( $post_id ) ) {
			$postarr['ID'] = $post_id;
			$result        = wp_update_post( $postarr, true );
		} else {
			$result = wp_insert_post( $postarr, true );
		}

		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$post_id = (int) $result;

		// Store the Elementor model. Elementor expects slashed JSON in meta.
		$json = wp_json_encode( $elementor_data );
		update_post_meta( $post_id, '_elementor_data', wp_slash( $json ) );
		update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
		update_post_meta( $post_id, '_elementor_template_type', 'wp-page' );
		update_post_meta( $post_id, '_elementor_version', defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : XXXV_CONNECTOR_VERSION );
		update_post_meta( $post_id, '_wp_page_template', $page_template );

		// Optional SEO / custom meta.
		if ( ! empty( $body['meta'] ) && is_array( $body['meta'] ) ) {
			foreach ( $body['meta'] as $key => $value ) {
				update_post_meta( $post_id, sanitize_key( $key ), sanitize_text_field( is_scalar( $value ) ? $value : wp_json_encode( $value ) ) );
			}
		}

		// Regenerate this page's CSS so it renders exactly like a manual save.
		self::regenerate_page_css( $post_id );

		return rest_ensure_response(
			array(
				'ok'      => true,
				'post_id' => $post_id,
				'url'     => get_permalink( $post_id ),
				'edit'    => admin_url( 'post.php?post=' . $post_id . '&action=elementor' ),
				'status'  => get_post_status( $post_id ),
			)
		);
	}

	/**
	 * Regenerate the CSS for a single Elementor page.
	 */
	public static function regenerate_page_css( $post_id ) {
		if ( ! did_action( 'elementor/loaded' ) || ! class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
			return false;
		}
		try {
			$css = new \Elementor\Core\Files\CSS\Post( $post_id );
			$css->update();
			return true;
		} catch ( \Throwable $e ) {
			return false;
		}
	}

	/**
	 * REST: regenerate CSS for a given page, or rebuild all Elementor CSS.
	 *
	 * @param WP_REST_Request $request The request.
	 */
	public static function regenerate_css( WP_REST_Request $request ) {
		if ( ! did_action( 'elementor/loaded' ) ) {
			return new WP_Error( 'xxxv_no_elementor', 'Elementor is not active.', array( 'status' => 400 ) );
		}

		$post_id = absint( $request->get_param( 'post_id' ) );

		if ( $post_id > 0 ) {
			$ok = self::regenerate_page_css( $post_id );
			return rest_ensure_response( array( 'ok' => $ok, 'post_id' => $post_id ) );
		}

		// No id supplied: clear the whole CSS cache so it rebuilds on demand.
		if ( class_exists( '\Elementor\Plugin' ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
		}
		return rest_ensure_response( array( 'ok' => true, 'scope' => 'all' ) );
	}
}
