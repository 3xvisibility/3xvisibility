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

	/**
	 * Temporarily whitelist SVG/WebP/AVIF (and common raster) mime types so
	 * template images in these formats import successfully and keep their format.
	 * Wrap upload/sideload calls with allow_extra_mimes()/restore_extra_mimes().
	 */
	private static $mime_filter_active = false;

	public static function allow_extra_mimes() {
		if ( self::$mime_filter_active ) {
			return;
		}
		self::$mime_filter_active = true;
		add_filter( 'upload_mimes', array( __CLASS__, 'filter_upload_mimes' ), 999 );
		// Bypass real-content sniffing for SVG (text/xml) so it isn't rejected.
		add_filter( 'wp_check_filetype_and_ext', array( __CLASS__, 'filter_check_filetype' ), 999, 4 );
	}

	public static function restore_extra_mimes() {
		if ( ! self::$mime_filter_active ) {
			return;
		}
		remove_filter( 'upload_mimes', array( __CLASS__, 'filter_upload_mimes' ), 999 );
		remove_filter( 'wp_check_filetype_and_ext', array( __CLASS__, 'filter_check_filetype' ), 999 );
		self::$mime_filter_active = false;
	}

	public static function filter_upload_mimes( $mimes ) {
		$mimes['svg']  = 'image/svg+xml';
		$mimes['svgz'] = 'image/svg+xml';
		$mimes['webp'] = 'image/webp';
		$mimes['avif'] = 'image/avif';
		$mimes['ico']  = 'image/x-icon';
		$mimes['bmp']  = 'image/bmp';
		$mimes['tiff'] = 'image/tiff';
		$mimes['tif']  = 'image/tiff';
		return $mimes;
	}

	public static function filter_check_filetype( $data, $file, $filename, $mimes ) {
		if ( preg_match( '/\.svgz?$/i', (string) $filename ) ) {
			$data['ext']  = 'svg';
			$data['type'] = 'image/svg+xml';
		} elseif ( preg_match( '/\.webp$/i', (string) $filename ) ) {
			$data['ext']  = 'webp';
			$data['type'] = 'image/webp';
		} elseif ( preg_match( '/\.avif$/i', (string) $filename ) ) {
			$data['ext']  = 'avif';
			$data['type'] = 'image/avif';
		}
		return $data;
	}



	public static function upload( WP_REST_Request $request ) {
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 90 );
		}

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
			$response = self::remote_get_image( $source );
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
	 * Import a remote template image into the Media Library and return attachment
	 * metadata. Used by the Elementor publisher before saving `_elementor_data` so
	 * widgets/backgrounds reference local attachment IDs, not remote URLs.
	 *
	 * @param string $source Remote image URL.
	 * @param string $alt    Optional alt text.
	 * @return array|WP_Error { id, url, duplicate }
	 */
	public static function import_from_url( $source, $alt = '' ) {
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 90 );
		}

		$source = esc_url_raw( $source );
		if ( ! $source || ! preg_match( '#^https?://#i', $source ) ) {
			return new WP_Error( 'xxxv_no_src', 'Invalid media source URL.', array( 'status' => 400 ) );
		}

		$existing = self::find_existing( $source );
		if ( $existing ) {
			return array(
				'id'        => $existing,
				'url'       => wp_get_attachment_url( $existing ),
				'duplicate' => true,
			);
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$filename = sanitize_file_name( basename( strtok( $source, '?' ) ) );
		if ( ! $filename || false === strpos( $filename, '.' ) ) {
			$filename = 'template-image-' . time() . '-' . substr( md5( $source ), 0, 8 ) . '.jpg';
		}
		$tmp = wp_tempnam( $filename );
		if ( ! $tmp ) {
			return new WP_Error( 'xxxv_tmp', 'Could not create temp file.', array( 'status' => 500 ) );
		}

		$response = self::remote_get_image( $source );
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			@unlink( $tmp );
			return new WP_Error( 'xxxv_fetch', 'Could not download source URL.', array( 'status' => 400 ) );
		}
		file_put_contents( $tmp, wp_remote_retrieve_body( $response ) );

		$attachment_id = media_handle_sideload(
			array(
				'name'     => $filename,
				'tmp_name' => $tmp,
			),
			0
		);
		if ( is_wp_error( $attachment_id ) ) {
			@unlink( $tmp );
			return $attachment_id;
		}

		if ( $alt ) {
			update_post_meta( $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $alt ) );
		}
		update_post_meta( $attachment_id, '_xxxv_source_url', $source );

		return array(
			'id'        => (int) $attachment_id,
			'url'       => wp_get_attachment_url( $attachment_id ),
			'duplicate' => false,
		);
	}

	/**
	 * Download a remote image with a real browser User-Agent + Referer.
	 *
	 * Many image CDNs (e.g. framerusercontent.com, some Cloudflare configs) return
	 * 403/HTML for the default "WordPress/x.x" agent. Sending a browser UA and
	 * following redirects makes these downloads succeed so template images import
	 * instead of failing and aborting the publish. Falls back to the source host
	 * as Referer for hotlink-protected CDNs.
	 */
	private static function remote_get_image( $source ) {
		$host    = wp_parse_url( $source, PHP_URL_HOST );
		$scheme  = wp_parse_url( $source, PHP_URL_SCHEME );
		$referer = ( $host && $scheme ) ? $scheme . '://' . $host . '/' : '';
		$args    = array(
			'timeout'     => 8,
			'redirection' => 5,
			'sslverify'   => true,
			'headers'     => array(
				'User-Agent'      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept'          => 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
				'Accept-Language' => 'en-US,en;q=0.9',
				'Referer'         => $referer,
			),
		);
		$response = wp_remote_get( $source, $args );
		// Some hosts reject the Referer; retry once without it.
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			unset( $args['headers']['Referer'] );
			$response = wp_remote_get( $source, $args );
		}
		return $response;
	}

	public static function find_existing( $source ) {
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

	/**
	 * Import a data:/base64 image (data URI) into the Media Library as a real file
	 * so it stops bloating CSS/HTML and gets a stable, cacheable WP URL.
	 * SVG/WebP/AVIF/PNG/JPEG/GIF are all preserved in their original format.
	 *
	 * @param string $data_uri Full `data:<mime>;base64,....` (or URL-encoded) string.
	 * @return array|WP_Error { id, url, duplicate }
	 */
	public static function import_from_data_uri( $data_uri ) {
		if ( ! is_string( $data_uri ) || ! preg_match( '#^data:([^;,]+)?(;charset=[^;,]+)?(;base64)?,(.*)$#is', $data_uri, $m ) ) {
			return new WP_Error( 'xxxv_bad_data_uri', 'Not a valid data URI.', array( 'status' => 400 ) );
		}
		$mime      = strtolower( trim( $m[1] ? $m[1] : 'image/png' ) );
		$is_base64 = ! empty( $m[3] );
		$payload   = $m[4];

		$binary = $is_base64 ? base64_decode( $payload, true ) : rawurldecode( $payload );
		if ( false === $binary || '' === $binary ) {
			return new WP_Error( 'xxxv_bad_data_uri', 'Could not decode data URI payload.', array( 'status' => 400 ) );
		}

		// De-duplicate identical payloads by content hash.
		$hash     = md5( $binary );
		$existing = self::find_existing( 'data-uri:' . $hash );
		if ( $existing ) {
			return array(
				'id'        => $existing,
				'url'       => wp_get_attachment_url( $existing ),
				'duplicate' => true,
			);
		}

		$ext_map = array(
			'image/svg+xml' => 'svg',
			'image/svg'     => 'svg',
			'image/png'     => 'png',
			'image/jpeg'    => 'jpg',
			'image/jpg'     => 'jpg',
			'image/gif'     => 'gif',
			'image/webp'    => 'webp',
			'image/avif'    => 'avif',
			'image/x-icon'  => 'ico',
			'image/vnd.microsoft.icon' => 'ico',
			'image/bmp'     => 'bmp',
			'image/tiff'    => 'tiff',
		);
		$ext      = isset( $ext_map[ $mime ] ) ? $ext_map[ $mime ] : 'png';
		$filename = 'xxxv-inline-' . substr( $hash, 0, 12 ) . '.' . $ext;

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$upload = wp_upload_bits( $filename, null, $binary );
		if ( ! empty( $upload['error'] ) ) {
			return new WP_Error( 'xxxv_upload_bits', $upload['error'], array( 'status' => 500 ) );
		}

		$filetype   = wp_check_filetype( $upload['file'], null );
		$attachment = array(
			'post_mime_type' => $filetype['type'] ? $filetype['type'] : $mime,
			'post_title'     => sanitize_file_name( $filename ),
			'post_content'   => '',
			'post_status'    => 'inherit',
		);
		$attachment_id = wp_insert_attachment( $attachment, $upload['file'] );
		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}
		// SVGs have no raster metadata; skip generate for them to avoid warnings.
		if ( 'svg' !== $ext ) {
			$meta = wp_generate_attachment_metadata( $attachment_id, $upload['file'] );
			wp_update_attachment_metadata( $attachment_id, $meta );
		}
		update_post_meta( $attachment_id, '_xxxv_source_url', 'data-uri:' . $hash );

		return array(
			'id'        => (int) $attachment_id,
			'url'       => wp_get_attachment_url( $attachment_id ),
			'duplicate' => false,
		);
	}
}
