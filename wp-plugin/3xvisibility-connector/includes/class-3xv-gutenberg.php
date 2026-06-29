<?php
/**
 * Native Gutenberg (block editor) publishing.
 *
 * Accepts block-markup content (serialized Gutenberg blocks) and creates a
 * real WordPress page that opens cleanly in the block editor — identical to a
 * page authored manually with Gutenberg.
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Gutenberg {

	/**
	 * Publish or update a Gutenberg page.
	 *
	 * Expected JSON body:
	 * {
	 *   "title": "Page title",
	 *   "slug": "page-slug",
	 *   "status": "publish" | "draft",
	 *   "post_id": 123,            // optional update
	 *   "content": "<!-- wp:paragraph -->...<!-- /wp:paragraph -->",
	 *   "meta": { ... }
	 * }
	 *
	 * @param WP_REST_Request $request The request.
	 */
	public static function publish( WP_REST_Request $request ) {
		$body = $request->get_json_params();
		if ( empty( $body ) || ! is_array( $body ) ) {
			return new WP_Error( 'xxxv_bad_body', 'Missing or invalid JSON body.', array( 'status' => 400 ) );
		}

		$title   = isset( $body['title'] ) ? sanitize_text_field( $body['title'] ) : 'Untitled';
		$slug    = isset( $body['slug'] ) ? sanitize_title( $body['slug'] ) : sanitize_title( $title );
		$status  = ( isset( $body['status'] ) && 'draft' === $body['status'] ) ? 'draft' : 'publish';
		$post_id = isset( $body['post_id'] ) ? absint( $body['post_id'] ) : 0;
		$content = isset( $body['content'] ) ? (string) $body['content'] : '';

		// Allow Gutenberg block markup through (wp_kses would strip block comments).
		$content = wp_kses_post( $content );

		$postarr = array(
			'post_title'   => $title,
			'post_name'    => $slug,
			'post_status'  => $status,
			'post_type'    => 'page',
			'post_content' => $content,
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

		// Ensure this page is treated as a block-editor page, not Elementor.
		delete_post_meta( $post_id, '_elementor_edit_mode' );

		if ( ! empty( $body['meta'] ) && is_array( $body['meta'] ) ) {
			foreach ( $body['meta'] as $key => $value ) {
				update_post_meta( $post_id, sanitize_key( $key ), sanitize_text_field( is_scalar( $value ) ? $value : wp_json_encode( $value ) ) );
			}
		}

		return rest_ensure_response(
			array(
				'ok'      => true,
				'post_id' => $post_id,
				'url'     => get_permalink( $post_id ),
				'edit'    => admin_url( 'post.php?post=' . $post_id . '&action=edit' ),
				'status'  => get_post_status( $post_id ),
			)
		);
	}
}
