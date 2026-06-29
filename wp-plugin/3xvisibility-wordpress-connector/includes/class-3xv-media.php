<?php
/**
 * Media uploads into the WordPress Media Library.
 *
 * Supports two modes:
 *   1. { "url": "https://...", "filename": "hero.jpg", "alt": "..." }
 *   2. { "data": "<base64>", "filename": "hero.jpg", "alt": "..." }
 *
 * Returns the attachment id + the local Media Library URL so the SaaS can
 * reference site-hosted images (never hot-linking external URLs).
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Media {

	public static function upload( WP_REST_Request $request ) {
		$body = $request->get_json_params();
		if ( empty( $body ) || ! is_array( $body ) ) {
			return new WP_Error( 'xxxv_bad_body', 'Missing or invalid JSON body.', array( 'status' => 400 ) );
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$filename = isset( $body['filename'] ) ? sanitize_file_name( $body['filename'] ) : 'upload-' . time();
		$alt      = isset( $body['alt'] ) ? sanitize_text_field( $body['alt'] ) : '';

		// De-duplicate: if we already imported this source, reuse it.
		$source = isset( $body['url'] ) ? esc_url_raw( $body['url'] ) : '';
		if ( $source ) {
			$existing = self::find_existing( $source );
			if ( $existing ) {
				return rest_ensure_response(
					array(
						'ok'         => true,
						'id'         => $existing,
						'url'        => wp_get_attachment_url( $existing ),
						'duplicate'  => true,
					)
				);
			}
		}

		$tmp = wp_tempnam( $filename );
		if ( ! $tmp ) {
			return new WP_Error( 'xxxv_tmp', 'Could not create temp file.', array( 'status' => 500 ) );
		}

		if ( ! empty( $body['data'] ) ) {
			$decoded = base64_decode( preg_replace( '#^data:[^;]+;base64,#', '', $body['data'] ), true );
			if ( false === $decoded ) {
				@unlink( $tmp );
				return new WP_Error( 'xxxv_b64', 'Invalid base64 data.', array( 'status' => 400 ) );
			}
			file_put_contents( $tmp, $decoded );
		} elseif ( $source ) {
			$response = wp_remote_get( $source, array( 'timeout' => 30 ) );
			if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
				@unlink( $tmp );
				return new WP_Error( 'xxxv_fetch', 'Could not download source URL.', array( 'status' => 400 ) );
			}
			file_put_contents( $tmp, wp_remote_retrieve_body( $response ) );
		} else {
			@unlink( $tmp );
			return new WP_Error( 'xxxv_no_src', 'Provide either "url" or "data".', array( 'status' => 400 ) );
		}

		$file_array = array(
			'name'     => $filename,
			'tmp_name' => $tmp,
		);

		$attachment_id = media_handle_sideload( $file_array, 0 );
		if ( is_wp_error( $attachment_id ) ) {
			@unlink( $tmp );
			return $attachment_id;
		}

		if ( $alt ) {
			update_post_meta( $attachment_id, '_wp_attachment_image_alt', $alt );
		}
		if ( $source ) {
			update_post_meta( $attachment_id, '_xxxv_source_url', $source );
		}

		return rest_ensure_response(
			array(
				'ok'  => true,
				'id'  => $attachment_id,
				'url' => wp_get_attachment_url( $attachment_id ),
			)
		);
	}

	/**
	 * Look up a previously imported attachment by its remote source URL.
	 */
	protected static function find_existing( $source ) {
		$q = new WP_Query(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'meta_key'       => '_xxxv_source_url',
				'meta_value'     => $source,
			)
		);
		return $q->have_posts() ? (int) $q->posts[0] : 0;
	}
}
