<?php
/**
 * Native Elementor publishing.
 *
 * Accepts the Elementor data model (array of sections/containers) from the
 * SaaS backend and performs the SAME workflow the Elementor editor performs
 * when you press "Update":
 *
 *   1. Validate the incoming JSON model
 *   2. Load / create the WordPress document (page)
 *   3. Update the document content (post_content stays empty for Elementor)
 *   4. Save the Elementor data model + all required metadata
 *   5. Generate the per-page CSS file
 *   6. Generate / refresh the global (kit) CSS
 *   7. Refresh the Elementor document + assets
 *   8. Clear every relevant cache layer
 *   9. Validate the saved JSON + CSS
 *  10. Return success — or ROLL BACK on any failure
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Elementor {

	/**
	 * Publish or update an Elementor page using the full editor save workflow.
	 *
	 * @param WP_REST_Request $request The request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function publish( WP_REST_Request $request ) {
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 140 );
		}

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
		$elementor_data = self::decode_payload_field( $body, 'elementor_data', array() );
		if ( is_wp_error( $elementor_data ) ) {
			return $elementor_data;
		}
		$raw_elementor_css = self::decode_payload_field( $body, 'elementor_css', '' );
		if ( is_wp_error( $raw_elementor_css ) ) {
			return $raw_elementor_css;
		}
		$elementor_css  = self::sanitize_template_css( (string) $raw_elementor_css );
		// Absolute base URL of the source template, used to resolve relative /
		// protocol-relative / localhost image URLs found inside the CSS.
		$source_base_url = '';
		foreach ( array( 'source_base_url', 'source_url', 'base_url', 'origin_url' ) as $bk ) {
			if ( ! empty( $body[ $bk ] ) && is_string( $body[ $bk ] ) ) {
				$source_base_url = esc_url_raw( $body[ $bk ] );
				break;
			}
		}
		$exact_render   = ! empty( $body['exact_render'] );
		// When true (default), the incoming JSON is first stored as a native
		// Elementor Library template (Templates -> Saved Templates) and then
		// re-imported through Elementor's own template pipeline before it is
		// applied to the page. This makes every element a fully-native, editable
		// widget (IDs regenerated, per-widget on_import handlers run) instead of a
		// raw meta injection, so the published page matches the design 1:1.
		$save_as_template = ! isset( $body['save_as_template'] ) || ! empty( $body['save_as_template'] );
		// Automatic native-retry pass: force the template-library re-import so the
		// widgets that failed the previous editor-readiness check are rebuilt as
		// fully-native, editable widgets.
		if ( ! empty( $body['reimport_failed_widgets'] ) ) {
			$save_as_template = true;
		}
		// WordPress Elementor pages are always published as Elementor Full Width.
		// Do not let requests switch to theme default/canvas/HTML layouts.
		$page_template  = 'elementor_header_footer';

		// Elementor data may arrive as a JSON string; normalize to array.
		if ( is_string( $elementor_data ) ) {
			$decoded        = json_decode( $elementor_data, true );
			$elementor_data = is_array( $decoded ) ? $decoded : array();
		}
		self::normalize_top_level_containers( $elementor_data );
		$elementor_data = self::fix_elementor_data( $elementor_data );
		self::sanitize_elementor_text_fields( $elementor_data );

		// ---- (1) Validate the incoming JSON model -----------------------------
		$validation = self::validate_model( $elementor_data, $exact_render );
		if ( is_wp_error( $validation ) ) {
			self::log( 'error', 'JSON validation failed: ' . $validation->get_error_message(), array( 'slug' => $slug ) );
			return $validation;
		}

		// Upload every template image/background to this WordPress Media Library and
		// replace Elementor image objects with local attachment IDs + URLs before any
		// document is saved. The SaaS must never send AI/stock replacement images;
		// this only imports references already present in the selected template JSON.
		$media_report = self::map_media_library_references( $elementor_data );
		if ( is_wp_error( $media_report ) ) {
			self::log( 'error', 'Media import failed: ' . $media_report->get_error_message(), array( 'slug' => $slug ) );
			return $media_report;
		}
		if ( '' !== $elementor_css ) {
			$elementor_css = self::map_css_media_references( $elementor_css, $media_report, $source_base_url );
		}
		// Exact-render pages can contain many large inline/background image URLs in a
		// single HTML widget. Importing every one inside the publish REST request is
		// what pushes shared LiteSpeed hosts into 503/timeouts. Native Elementor media
		// controls are still synced synchronously; exact HTML assets are synced in a
		// deferred cron task immediately after the page is saved.
		if ( is_array( $media_report ) && ! empty( $media_report['failed'] ) ) {
			// Non-fatal: keep original URLs for any images that could not be
			// imported (e.g. hotlink-protected CDN assets) and continue so the
			// page still publishes with the rest of the template intact.
			self::log(
				'warn',
				$media_report['failed'] . ' image(s) kept as original URL after import failure.',
				array( 'slug' => $slug )
			);
		}

		$validation = self::validate_model( $elementor_data, $exact_render );
		if ( is_wp_error( $validation ) ) {
			self::log( 'error', 'JSON validation failed after media mapping: ' . $validation->get_error_message(), array( 'slug' => $slug ) );
			return $validation;
		}

		$is_update = ( $post_id > 0 && get_post( $post_id ) );

		// ---- Snapshot for rollback (only meaningful on update) ----------------
		$rollback = self::snapshot( $is_update ? $post_id : 0 );

		try {
			// ---- (2) Load / create document -----------------------------------
			$postarr = array(
				'post_title'   => $title,
				'post_name'    => $slug,
				'post_status'  => $status,
				'post_type'    => 'page',
				'post_content' => '', // Elementor renders from meta, not the classic body.
			);

			if ( $is_update ) {
				$postarr['ID'] = $post_id;
				$result        = wp_update_post( $postarr, true );
			} else {
				$result = wp_insert_post( $postarr, true );
			}

			if ( is_wp_error( $result ) ) {
				throw new Exception( 'Document save failed: ' . $result->get_error_message() );
			}
			$post_id = (int) $result;

			// ---- (3/4) Save Elementor data model + metadata -------------------
			update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
			update_post_meta( $post_id, '_elementor_template_type', 'wp-page' );
			update_post_meta( $post_id, '_elementor_version', defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : XXXV_CONNECTOR_VERSION );
			update_post_meta( $post_id, '_elementor_pro_version', defined( 'ELEMENTOR_PRO_VERSION' ) ? ELEMENTOR_PRO_VERSION : '' );
			update_post_meta( $post_id, '_wp_page_template', $page_template );
			if ( '' !== $elementor_css ) {
				update_post_meta( $post_id, '_xxxv_template_css', $elementor_css );
			} else {
				delete_post_meta( $post_id, '_xxxv_template_css' );
			}

			// Detect Google Fonts used anywhere in the template (CSS @import,
			// <link> tags in the raw HTML, and font-family declarations) and store
			// a normalized spec so the connector can register them on the frontend
			// (WP head + Elementor) with correct weights, subsets, and display=swap.
			$font_sources = $elementor_css;
			$raw_html     = self::decode_payload_field( $body, 'elementor_html', '' );
			if ( is_string( $raw_html ) && '' !== $raw_html ) {
				$font_sources .= "\n" . $raw_html;
			}
			$google_fonts = self::detect_google_fonts( $font_sources );
			if ( ! empty( $google_fonts ) ) {
				update_post_meta( $post_id, '_xxxv_google_fonts', wp_json_encode( $google_fonts ) );
			} else {
				delete_post_meta( $post_id, '_xxxv_google_fonts' );
			}

			// Store a deterministic critical stylesheet compiled from the submitted
			// Elementor JSON itself. This is a hard fallback for hosts where
			// /uploads/elementor/css/post-{id}.css is deleted, blocked, or returns 404:
			// the live page still receives the same padding/background/flex/typography
			// rules inline through the connector.
			$critical_css = self::compile_critical_css( $elementor_data, $post_id );
			if ( '' !== $critical_css ) {
				update_post_meta( $post_id, '_xxxv_critical_css', $critical_css );
			} else {
				delete_post_meta( $post_id, '_xxxv_critical_css' );
			}

			// Optional SEO / custom meta.
			if ( ! empty( $body['meta'] ) && is_array( $body['meta'] ) ) {
				foreach ( $body['meta'] as $key => $value ) {
					update_post_meta(
						$post_id,
						sanitize_key( $key ),
						sanitize_text_field( is_scalar( $value ) ? $value : wp_json_encode( $value ) )
					);
				}
			}

			// ---- Template-library-first pipeline ------------------------------
			// Save the JSON as a native Elementor Library template, then re-import
			// it through Elementor's own import routine so every element is a
			// fully-native, editable widget before we apply it to the page.
			if ( $save_as_template ) {
				$imported = self::save_and_import_via_library( $elementor_data, $title, $post_id );
				if ( is_array( $imported ) && ! empty( $imported ) ) {
					$elementor_data = $imported;
					self::normalize_top_level_containers( $elementor_data );
				}
			}

			// ---- Save through Elementor's own document API so internal element cache,
			// controls, breakpoints, responsive data and editor state match a manual
			// Elementor save. This is REQUIRED and fatal on failure.
			self::save_via_document( $post_id, $elementor_data );

			// Elementor's document API may normalize meta. We write the final native JSON
			// after the document save only to preserve exact attachment IDs/URLs and then
			// validate the stored model. Publishing never writes HTML or fallback content.
			$json = wp_json_encode( $elementor_data );
			if ( false === $json ) {
				throw new Exception( 'Failed to encode Elementor JSON.' );
			}
			update_post_meta( $post_id, '_elementor_data', wp_slash( $json ) );
			if ( $exact_render ) {
				self::schedule_deferred_exact_media_sync( $post_id );
			}

			// ---- (5) Generate per-page CSS ------------------------------------
			self::refresh_elementor_files( $post_id );
			$css_ok = self::regenerate_page_css( $post_id );
			if ( ! $css_ok && '' === $critical_css ) {
				throw new Exception( 'Elementor page CSS regeneration failed and no connector critical CSS fallback could be generated.' );
			}

			// ---- (6) Generate / refresh global (kit) CSS ----------------------
			self::regenerate_global_css();

			// ---- (7) Refresh document + assets --------------------------------
			self::refresh_assets();

			// ---- (8) Clear caches ---------------------------------------------
			self::clear_runtime_caches( $post_id );

			// ---- (9) Validate saved JSON + CSS --------------------------------
			$saved_check = self::validate_saved_elementor_data( $post_id, $elementor_data );
			if ( is_wp_error( $saved_check ) ) {
				throw new Exception( $saved_check->get_error_message() );
			}
			$css_check = self::validate_generated_css( $post_id, '' !== $elementor_css || '' !== $critical_css );
			if ( is_wp_error( $css_check ) ) {
				throw new Exception( $css_check->get_error_message() );
			}

			// ---- (9b) Confirm the page opens in "Edit with Elementor" mode and
			//          that editable regions/widgets are actually present --------
			// If the readiness check fails, automatically purge caches and force
			// an Elementor CSS/asset regeneration, then retry — up to 3 attempts.
			$editor_check    = self::validate_editor_ready( $post_id );
			$editor_attempts = 1;
			$max_editor_attempts = 3;
			while ( is_wp_error( $editor_check ) && $editor_attempts < $max_editor_attempts ) {
				self::log(
					'warning',
					'Editor-readiness check failed; purging caches and regenerating Elementor before retry.',
					array( 'post_id' => $post_id, 'attempt' => $editor_attempts, 'error' => $editor_check->get_error_message() )
				);
				// Force a fresh Elementor render + CSS rebuild and clear caches.
				self::refresh_elementor_files( $post_id );
				self::regenerate_page_css( $post_id );
				self::regenerate_global_css();
				self::refresh_assets();
				self::clear_runtime_caches( $post_id );
				$editor_attempts++;
				$editor_check = self::validate_editor_ready( $post_id );
			}
			if ( is_wp_error( $editor_check ) ) {
				throw new Exception(
					$editor_check->get_error_message() .
					' (failed after ' . $editor_attempts . ' editor-readiness attempts)'
				);
			}

			self::log( 'info', 'Published successfully.', array( 'post_id' => $post_id, 'css' => $css_ok, 'widgets' => $editor_check['widgets'] ) );

			// ---- (10) Return success ------------------------------------------
			return rest_ensure_response(
				array(
					'ok'         => true,
					'post_id'    => $post_id,
					'url'        => get_permalink( $post_id ),
					'edit'       => admin_url( 'post.php?post=' . $post_id . '&action=elementor' ),
					'status'     => get_post_status( $post_id ),
					'css'        => $css_ok,
					'elements'             => $saved_check['elements'],
					'validated'            => true,
					'elementor_data_valid' => true,
					'elementor_data_hash'  => $saved_check['hash'],
					'media'                => $media_report,
					'css_validated'        => true,
					'editor_ready'         => true,
					'editable_widgets'     => $editor_check['widgets'],
					'edit_mode'            => $editor_check['edit_mode'],
					'editor_attempts'      => $editor_attempts,
				)
			);

		} catch ( \Throwable $e ) {
			// ---- ROLLBACK -----------------------------------------------------
			self::rollback( $rollback, $is_update ? $post_id : 0 );
			self::log( 'error', 'Publish failed, rolled back: ' . $e->getMessage(), array( 'slug' => $slug ) );
			return new WP_Error(
				'xxxv_publish_failed',
				'Publishing failed and changes were rolled back: ' . $e->getMessage(),
				array( 'status' => 500 )
			);
		}
	}

	/**
	 * Decode normal JSON fields, or gzip+base64 fields sent by the SaaS for very
	 * large exact-render Elementor payloads. Compression keeps LiteSpeed/shared
	 * hosts from rejecting /wp-json requests before this plugin can handle them.
	 */
	private static function decode_payload_field( $body, $field, $default ) {
		if ( isset( $body[ $field ] ) ) {
			return $body[ $field ];
		}
		$gzip_field = $field . '_gzip';
		if ( empty( $body[ $gzip_field ] ) || ! is_string( $body[ $gzip_field ] ) ) {
			return $default;
		}
		$binary = base64_decode( $body[ $gzip_field ], true );
		if ( false === $binary ) {
			return new WP_Error( 'xxxv_bad_compressed_payload', 'Compressed Elementor payload is not valid base64.', array( 'status' => 400 ) );
		}
		if ( function_exists( 'gzdecode' ) ) {
			$decoded = @gzdecode( $binary );
		} elseif ( function_exists( 'zlib_decode' ) ) {
			$decoded = @zlib_decode( $binary );
		} else {
			return new WP_Error( 'xxxv_no_zlib', 'This WordPress server cannot decode compressed Elementor payloads because PHP zlib is unavailable.', array( 'status' => 500 ) );
		}
		if ( false === $decoded ) {
			return new WP_Error( 'xxxv_bad_compressed_payload', 'Compressed Elementor payload could not be decoded.', array( 'status' => 400 ) );
		}
		return $decoded;
	}

	/**
	 * Validate the Elementor element model shape.
	 *
	 * @param mixed $data The decoded model.
	 * @return true|WP_Error
	 */
	private static function validate_model( $data, $exact_render = false ) {
		if ( ! is_array( $data ) ) {
			return new WP_Error( 'xxxv_invalid_model', 'Elementor data must be an array of elements.', array( 'status' => 400 ) );
		}
		if ( empty( $data ) ) {
			return new WP_Error( 'xxxv_empty_model', 'Elementor data is empty — nothing to publish.', array( 'status' => 400 ) );
		}
		$supported_widgets = array(
			'heading', 'text-editor', 'image', 'button', 'icon-box', 'accordion',
			'counter', 'gallery', 'divider', 'spacer', 'testimonial', 'icon-list',
			'image-box',
		);
		if ( $exact_render ) {
			$supported_widgets[] = 'html';
		}
		foreach ( $data as $index => $element ) {
			if ( ! is_array( $element ) || empty( $element['elType'] ) ) {
				return new WP_Error(
					'xxxv_invalid_element',
					sprintf( 'Top-level element #%d is missing a valid "elType".', (int) $index ),
					array( 'status' => 400 )
				);
			}
			if ( 'container' !== $element['elType'] ) {
				return new WP_Error(
					'xxxv_top_level_container_required',
					sprintf( 'Top-level element #%d must be an Elementor Container section.', (int) $index ),
					array( 'status' => 400 )
				);
			}
			$nested = self::validate_element_recursive( $element, $supported_widgets, $exact_render );
			if ( is_wp_error( $nested ) ) {
				return $nested;
			}
		}
		return true;
	}

	/**
	 * Defense-in-depth for old malformed template JSON: Text Editor fields may
	 * contain an opening inline tag like `<span class="badge">Welcome` without its
	 * closing tag. Elementor renders that raw HTML, so the open tag can swallow the
	 * following widget markup and collapse the whole page. Close allowed inline tags
	 * and cut any leaked structural markup before saving.
	 */
	private static function sanitize_elementor_text_fields( &$elements ) {
		if ( ! is_array( $elements ) ) {
			return;
		}
		foreach ( $elements as &$element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			if ( isset( $element['elType'], $element['widgetType'] ) && 'widget' === $element['elType'] && 'text-editor' === $element['widgetType'] ) {
				if ( isset( $element['settings']['editor'] ) && is_string( $element['settings']['editor'] ) ) {
					$element['settings']['editor'] = self::sanitize_inline_editor_html( $element['settings']['editor'] );
				}
			}
			// Fix line-heights that a legacy converter baked as tiny px values
			// (a unitless CSS 1.5 stored as 1.5px) which collapses lines on top
			// of each other. Convert any implausibly small px line-height to em.
			if ( ! empty( $element['settings'] ) && is_array( $element['settings'] ) ) {
				foreach ( $element['settings'] as $key => &$val ) {
					if ( false !== strpos( (string) $key, 'line_height' ) && is_array( $val )
						&& isset( $val['unit'], $val['size'] ) && 'px' === $val['unit']
						&& is_numeric( $val['size'] ) && (float) $val['size'] < 6 ) {
						$val['unit'] = 'em';
					}
				}
				unset( $val );
			}
			if ( ! empty( $element['elements'] ) && is_array( $element['elements'] ) ) {
				self::sanitize_elementor_text_fields( $element['elements'] );
			}
		}
		unset( $element );
	}

	private static function sanitize_inline_editor_html( $html ) {
		$html = preg_replace( '#<script\b[^>]*>[\s\S]*?</script>#i', '', (string) $html );
		$html = preg_replace( '#<style\b[^>]*>[\s\S]*?</style>#i', '', $html );
		if ( preg_match( '#</?(div|section|header|footer|main|article|nav|aside)\b|%3c/?(div|section|header|footer|main|article|nav|aside)\b|&lt;/?(div|section|header|footer|main|article|nav|aside)\b#i', $html, $m, PREG_OFFSET_CAPTURE ) ) {
			$html = substr( $html, 0, $m[0][1] );
		}
		$last_open = strrpos( $html, '<' );
		if ( false !== $last_open && false === strpos( $html, '>', $last_open ) ) {
			$html = substr( $html, 0, $last_open );
		}

		$allowed = array( 'a', 'span', 'p', 'strong', 'em', 'b', 'i', 'small', 'ul', 'ol', 'li' );
		$stack   = array();
		if ( preg_match_all( '#</?([a-z][a-z0-9]*)\b[^>]*>#i', $html, $tags, PREG_SET_ORDER ) ) {
			foreach ( $tags as $tag_match ) {
				$full = $tag_match[0];
				$tag  = strtolower( $tag_match[1] );
				if ( ! in_array( $tag, $allowed, true ) || preg_match( '#/>$#', $full ) ) {
					continue;
				}
				if ( 0 === strpos( $full, '</' ) ) {
					$idx = array_search( $tag, array_reverse( $stack, true ), true );
					if ( false !== $idx ) {
						unset( $stack[ $idx ] );
						$stack = array_values( $stack );
					}
				} else {
					$stack[] = $tag;
				}
			}
		}
		foreach ( array_reverse( $stack ) as $tag ) {
			$html .= '</' . $tag . '>';
		}
		return trim( $html );
	}

	/**
	 * Ensure every top-level section is a full-width Elementor Container. This avoids
	 * the old single-wrapper layout problem and mirrors manually-created Elementor
	 * landing pages using the Elementor Full Width template.
	 */
	private static function normalize_top_level_containers( &$data ) {
		if ( ! is_array( $data ) ) {
			return;
		}
		foreach ( $data as &$element ) {
			if ( is_array( $element ) && isset( $element['elType'] ) && 'container' === $element['elType'] ) {
				if ( ! isset( $element['settings'] ) || ! is_array( $element['settings'] ) ) {
					$element['settings'] = array();
				}
				$element['settings']['content_width'] = 'full';
				$element['settings']['width']         = array(
					'unit'  => '%',
					'size'  => 100,
					'sizes' => array(),
				);
			}
		}
		unset( $element );
	}

	/**
	 * Ensure Elementor data stores CSS properly.
	 *
	 * Walks the whole element tree and, for every element/widget:
	 *   1. Preserves all CSS classes — merges any raw class strings found under
	 *      css_classes / class / className / _css_classes into Elementor's native
	 *      `_css_classes` advanced setting (de-duplicated).
	 *   2. Preserves all inline CSS styles — promotes a raw `style`/`_inline_css`
	 *      declaration string into Elementor's native custom CSS (`custom_css`)
	 *      scoped to `selector{...}`, so nothing is dropped by the editor.
	 *   3. Maps common declarations to real Elementor settings when they are not
	 *      already set (color, background-color, text-align, font-size, padding,
	 *      margin) so the design stays fully editable.
	 *
	 * @param array $data Elementor data (tree of elements). Passed by value; the
	 *                    fixed structure is returned.
	 * @return array Fixed Elementor data.
	 */
	public static function fix_elementor_data( $data ) {
		if ( ! is_array( $data ) ) {
			return $data;
		}
		self::fix_elementor_elements( $data );
		return $data;
	}

	/**
	 * Recursive worker for fix_elementor_data(). Mutates the tree in place.
	 *
	 * @param array $elements Elements list, by reference.
	 */
	private static function fix_elementor_elements( &$elements ) {
		if ( ! is_array( $elements ) ) {
			return;
		}
		foreach ( $elements as &$element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			if ( ! isset( $element['settings'] ) || ! is_array( $element['settings'] ) ) {
				$element['settings'] = array();
			}
			$settings = &$element['settings'];

			// --- 1. Preserve all CSS classes -> _css_classes -------------------
			$classes = array();
			if ( isset( $settings['_css_classes'] ) && is_string( $settings['_css_classes'] ) ) {
				$classes = array_merge( $classes, preg_split( '#\s+#', trim( $settings['_css_classes'] ) ) );
			}
			foreach ( array( 'css_classes', 'class', 'className', 'classes' ) as $ck ) {
				if ( isset( $settings[ $ck ] ) ) {
					$raw = is_array( $settings[ $ck ] ) ? implode( ' ', $settings[ $ck ] ) : (string) $settings[ $ck ];
					$classes = array_merge( $classes, preg_split( '#\s+#', trim( $raw ) ) );
					if ( '_css_classes' !== $ck ) {
						unset( $settings[ $ck ] );
					}
				}
			}
			$classes = array_values( array_unique( array_filter( array_map( 'sanitize_html_class', $classes ) ) ) );
			if ( $classes ) {
				$settings['_css_classes'] = implode( ' ', $classes );
			}

			// --- 2. Preserve all inline CSS styles -> custom_css ---------------
			$inline_style = '';
			foreach ( array( 'style', '_inline_css', 'inline_style' ) as $sk ) {
				if ( isset( $settings[ $sk ] ) && is_string( $settings[ $sk ] ) && '' !== trim( $settings[ $sk ] ) ) {
					$inline_style .= ( '' !== $inline_style ? ';' : '' ) . trim( $settings[ $sk ], " \t\n\r\0\x0B;" );
					unset( $settings[ $sk ] );
				}
			}
			if ( '' !== $inline_style ) {
				$decls = self::parse_inline_declarations( $inline_style );

				// --- 3. Map common declarations to native settings ------------
				self::map_declarations_to_settings( $decls, $settings );

				// Keep the full declaration block as custom CSS so nothing is lost.
				$existing_custom = isset( $settings['custom_css'] ) && is_string( $settings['custom_css'] ) ? $settings['custom_css'] : '';
				$scoped          = 'selector{' . $inline_style . '}';
				$settings['custom_css'] = trim( $existing_custom . "\n" . $scoped );
			}
			unset( $settings );

			if ( ! empty( $element['elements'] ) && is_array( $element['elements'] ) ) {
				self::fix_elementor_elements( $element['elements'] );
			}
		}
		unset( $element );
	}

	/**
	 * Parse an inline CSS declaration string into a prop => value map.
	 *
	 * @param string $style Inline CSS ("color:red;font-size:14px").
	 * @return array
	 */
	private static function parse_inline_declarations( $style ) {
		$out = array();
		foreach ( explode( ';', (string) $style ) as $decl ) {
			$decl = trim( $decl );
			if ( '' === $decl || false === strpos( $decl, ':' ) ) {
				continue;
			}
			list( $prop, $value ) = explode( ':', $decl, 2 );
			$prop  = strtolower( trim( $prop ) );
			$value = trim( str_replace( '!important', '', $value ) );
			if ( '' !== $prop && '' !== $value ) {
				$out[ $prop ] = $value;
			}
		}
		return $out;
	}

	/**
	 * Map a small set of common CSS declarations to native Elementor settings,
	 * without overriding values the payload already set.
	 *
	 * @param array $decls    prop => value map.
	 * @param array $settings Element settings, by reference.
	 */
	private static function map_declarations_to_settings( $decls, &$settings ) {
		$to_size = function ( $v ) {
			if ( preg_match( '/^(-?\d*\.?\d+)\s*(px|em|rem|%|vw|vh)?$/i', trim( $v ), $m ) ) {
				return array( 'unit' => $m[2] ? strtolower( $m[2] ) : 'px', 'size' => (float) $m[1], 'sizes' => array() );
			}
			return null;
		};
		if ( isset( $decls['color'] ) && empty( $settings['title_color'] ) && empty( $settings['color'] ) ) {
			$settings['title_color'] = self::css_value( $decls['color'] );
			$settings['color']       = self::css_value( $decls['color'] );
		}
		if ( isset( $decls['background-color'] ) && empty( $settings['background_color'] ) ) {
			$settings['background_background'] = 'classic';
			$settings['background_color']      = self::css_value( $decls['background-color'] );
		}
		if ( isset( $decls['text-align'] ) && empty( $settings['align'] ) ) {
			$align = strtolower( $decls['text-align'] );
			if ( in_array( $align, array( 'left', 'center', 'right', 'justify' ), true ) ) {
				$settings['align'] = $align;
			}
		}
		if ( isset( $decls['font-size'] ) && empty( $settings['typography_font_size'] ) ) {
			$size = $to_size( $decls['font-size'] );
			if ( $size ) {
				$settings['typography_typography'] = 'custom';
				$settings['typography_font_size']  = $size;
			}
		}
		foreach ( array( 'padding' => 'padding', 'margin' => 'margin' ) as $css_prop => $setting_key ) {
			if ( isset( $decls[ $css_prop ] ) && empty( $settings[ $setting_key ] ) ) {
				$box = self::css_shorthand_to_box( $decls[ $css_prop ] );
				if ( $box ) {
					$settings[ $setting_key ] = $box;
				}
			}
		}
	}

	/**
	 * Convert a CSS box shorthand ("10px 20px") into an Elementor dimensions box.
	 *
	 * @param string $value CSS shorthand.
	 * @return array|null
	 */
	private static function css_shorthand_to_box( $value ) {
		$parts = preg_split( '#\s+#', trim( (string) $value ) );
		if ( empty( $parts ) ) {
			return null;
		}
		$unit = 'px';
		$nums = array();
		foreach ( $parts as $p ) {
			if ( preg_match( '/^(-?\d*\.?\d+)\s*(px|em|rem|%|vw|vh)?$/i', $p, $m ) ) {
				$nums[] = $m[1];
				if ( $m[2] ) {
					$unit = strtolower( $m[2] );
				}
			}
		}
		if ( empty( $nums ) ) {
			return null;
		}
		switch ( count( $nums ) ) {
			case 1:
				$t = $r = $b = $l = $nums[0];
				break;
			case 2:
				$t = $b = $nums[0];
				$r = $l = $nums[1];
				break;
			case 3:
				$t = $nums[0];
				$r = $l = $nums[1];
				$b = $nums[2];
				break;
			default:
				list( $t, $r, $b, $l ) = $nums;
		}
		return array(
			'unit'     => $unit,
			'top'      => (string) $t,
			'right'    => (string) $r,
			'bottom'   => (string) $b,
			'left'     => (string) $l,
			'isLinked' => false,
		);
	}



	/**
	 * Validate one element recursively: native Elementor only, no HTML widgets, no
	 * raw markup injection into text-editor settings.
	 *
	 * @param array $element Element.
	 * @param array $supported_widgets Allowed free widgets.
	 * @return true|WP_Error
	 */
	private static function validate_element_recursive( $element, $supported_widgets, $exact_render = false ) {
		$el_type = isset( $element['elType'] ) ? $element['elType'] : '';
		if ( 'widget' === $el_type ) {
			$widget = isset( $element['widgetType'] ) ? $element['widgetType'] : '';
			if ( 'html' === $widget && ! $exact_render ) {
				return new WP_Error( 'xxxv_html_widget_forbidden', 'HTML widgets are forbidden. WordPress publishing requires native Elementor widgets only.', array( 'status' => 400 ) );
			}
			if ( ! in_array( $widget, $supported_widgets, true ) ) {
				return new WP_Error( 'xxxv_unsupported_widget', 'Unsupported Elementor widget type: ' . sanitize_text_field( $widget ), array( 'status' => 400 ) );
			}
			$settings = isset( $element['settings'] ) && is_array( $element['settings'] ) ? $element['settings'] : array();
			if ( 'text-editor' === $widget && isset( $settings['editor'] ) && preg_match( '#<(script|style|iframe|html|body|head|section|article|main|link|canvas|svg)\b#i', (string) $settings['editor'] ) ) {
				return new WP_Error( 'xxxv_raw_html_forbidden', 'Raw HTML/style/script injection inside Text Editor widgets is forbidden.', array( 'status' => 400 ) );
			}
			if ( 'html' === $widget && $exact_render && isset( $settings['html'] ) ) {
				$settings['html'] = self::sanitize_exact_render_html( (string) $settings['html'] );
			} else {
				$settings_valid = self::validate_settings_no_raw_html( $settings );
				if ( is_wp_error( $settings_valid ) ) {
					return $settings_valid;
				}
			}
		} elseif ( 'container' !== $el_type ) {
			return new WP_Error( 'xxxv_invalid_eltype', 'Only Elementor Containers and supported Widgets are allowed.', array( 'status' => 400 ) );
		}

		$children = isset( $element['elements'] ) && is_array( $element['elements'] ) ? $element['elements'] : array();
		foreach ( $children as $child ) {
			if ( ! is_array( $child ) ) {
				return new WP_Error( 'xxxv_invalid_child', 'Invalid Elementor child element.', array( 'status' => 400 ) );
			}
			$valid = self::validate_element_recursive( $child, $supported_widgets, $exact_render );
			if ( is_wp_error( $valid ) ) {
				return $valid;
			}
		}
		return true;
	}

	private static function sanitize_exact_render_html( $html ) {
		$html = (string) $html;
		$html = preg_replace( '#<script\b[^>]*>[\s\S]*?</script>#i', '', $html );
		$html = preg_replace( '#<iframe\b[^>]*>[\s\S]*?</iframe>#i', '', $html );
		$html = preg_replace( '#\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', $html );
		$html = preg_replace( '#javascript\s*:#i', '', $html );
		return trim( $html );
	}

	private static function validate_settings_no_raw_html( $settings ) {
		foreach ( $settings as $key => $value ) {
			if ( is_array( $value ) ) {
				$nested = self::validate_settings_no_raw_html( $value );
				if ( is_wp_error( $nested ) ) {
					return $nested;
				}
				continue;
			}
			if ( is_string( $value ) && preg_match( '#<(script|style|iframe|html|body|head|link)\b#i', $value ) ) {
				return new WP_Error( 'xxxv_raw_html_forbidden', 'Raw HTML/style/script injection is forbidden in Elementor settings.', array( 'status' => 400 ) );
			}
		}
		return true;
	}

	/**
	 * Walk Elementor JSON and replace remote template image URLs with local Media
	 * Library attachment IDs + URLs. Handles image widgets, gallery controls,
	 * background images, carousel-like arrays, and any nested settings.
	 *
	 * @param array $data Elementor data, modified in place.
	 * @return array|WP_Error Import report.
	 */
	private static function map_media_library_references( &$data ) {
		$report = array(
			'imported' => 0,
			'reused'   => 0,
			'failed'   => 0,
			'urls'     => array(),
		);
		self::walk_media_value( $data, $report );
		// Non-fatal: a few images (e.g. CDN-protected icons) may fail to import.
		// We keep their original URL and continue publishing so the page is never
		// blocked over non-critical assets. Failures are logged for diagnostics.
		if ( $report['failed'] > 0 ) {
			self::log(
				'warn',
				$report['failed'] . ' template image(s) could not be uploaded; keeping original URLs.',
				array( 'report' => $report )
			);
		}
		return $report;
	}

	private static function is_remote_image_url( $value ) {
		if ( ! is_string( $value ) || ! preg_match( '#^https?://#i', $value ) ) {
			return false;
		}
		if ( preg_match( '#\.(png|jpe?g|gif|webp|svg|avif|ico|bmp)(\?[^\s"\']*)?$#i', $value ) ) {
			return true;
		}
		$host = wp_parse_url( $value, PHP_URL_HOST );
		// AI image providers often return images from extensionless URLs, e.g.
		// image.pollinations.ai/prompt/...?...; those must still be imported into
		// the WordPress Media Library during Elementor publish.
		return is_string( $host ) && preg_match( '#(^|\.)image\.pollinations\.ai$#i', $host );
	}

	private static function import_media_url_for_report( $url, &$report, $alt = '' ) {
		if ( isset( $report['urls'][ $url ] ) ) {
			return $report['urls'][ $url ];
		}
		$result = XXXV_Media::import_from_url( $url, $alt );
		if ( is_wp_error( $result ) ) {
			$report['failed']++;
			self::log( 'warn', 'Template media import failed: ' . $result->get_error_message(), array( 'url' => $url ) );
			$report['urls'][ $url ] = array( 'id' => 0, 'url' => $url, 'failed' => true );
			return $report['urls'][ $url ];
		}
		if ( ! empty( $result['duplicate'] ) ) {
			$report['reused']++;
		} else {
			$report['imported']++;
		}
		$report['urls'][ $url ] = array(
			'id'  => isset( $result['id'] ) ? (int) $result['id'] : 0,
			'url' => isset( $result['url'] ) ? (string) $result['url'] : $url,
		);
		return $report['urls'][ $url ];
	}

	/**
	 * Localize every image referenced inside a CSS string into the WordPress Media
	 * Library and rewrite the CSS to point at the uploaded copies. Covers all CSS
	 * image-bearing properties via `url(...)`:
	 *   background-image, list-style-image, border-image, cursor, content,
	 *   and @font-face `src` (fonts uploaded as-is).
	 *
	 * URL normalization applied before download:
	 *   - localhost / 127.0.0.1 hosts are treated as remote and re-hosted on WP
	 *   - protocol-relative `//host/..` → `https://host/..`
	 *   - `http://` upgraded to `https://`
	 *   - site-relative `/path` and relative `path` resolved against $base_url
	 * Special cases:
	 *   - data:/base64 URIs → decoded to real files (SVG/WebP/AVIF/PNG preserved)
	 *   - SVG images downloaded and uploaded, format preserved
	 *   - @2x/@3x retina and responsive assets keep their original filenames
	 * Image dimensions, quality, and EXIF data are preserved because the original
	 * bytes are uploaded verbatim (no re-encode); WordPress then generates the
	 * standard thumbnail sizes + srcset for raster images automatically.
	 *
	 * @param string $css      Raw CSS.
	 * @param string $base_url Absolute base URL of the source template (for relatives).
	 * @param array  $report   Media import report (passed by reference).
	 * @return string Rewritten CSS.
	 */
	private static function process_css_media( $css, $base_url = '', &$report = null ) {
		if ( ! is_string( $css ) || '' === trim( $css ) ) {
			return $css;
		}
		if ( ! is_array( $report ) ) {
			$report = array( 'imported' => 0, 'reused' => 0, 'failed' => 0, 'urls' => array() );
		}

		$site_url = home_url();
		$pattern  = '#url\(\s*([\'"]?)([^\'")]+)\1\s*\)#i';

		return preg_replace_callback(
			$pattern,
			function ( $matches ) use ( &$report, $base_url, $site_url ) {
				$quote = $matches[1];
				$raw   = trim( $matches[2] );

				// Leave already-local (this site) and empty refs untouched.
				if ( '' === $raw || 0 === strpos( $raw, '#' ) ) {
					return $matches[0];
				}

				// ---- data:/base64 URIs -> real files --------------------------
				if ( 0 === stripos( $raw, 'data:' ) ) {
					$res = XXXV_Media::import_from_data_uri( $raw );
					if ( is_wp_error( $res ) ) {
						$report['failed']++;
						return $matches[0];
					}
					if ( ! empty( $res['duplicate'] ) ) {
						$report['reused']++;
					} else {
						$report['imported']++;
					}
					return 'url(' . $quote . $res['url'] . $quote . ')';
				}

				// ---- normalize the URL ----------------------------------------
				$url = $raw;
				if ( 0 === strpos( $url, '//' ) ) {
					$url = 'https:' . $url;                         // protocol-relative
				} elseif ( preg_match( '#^https?://#i', $url ) ) {
					$url = preg_replace( '#^http://#i', 'https://', $url ); // force https
				} elseif ( 0 === strpos( $url, '/' ) ) {
					$url = ( $base_url ? untrailingslashit( $base_url ) : untrailingslashit( $site_url ) ) . $url; // site-relative
				} elseif ( $base_url ) {
					$url = untrailingslashit( $base_url ) . '/' . ltrim( $url, './' ); // relative
				} else {
					return $matches[0]; // can't resolve a bare relative path without a base
				}

				// Rewrite localhost/127.* to the source base so it downloads.
				$host = wp_parse_url( $url, PHP_URL_HOST );
				if ( $host && preg_match( '#^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$#i', $host ) && $base_url ) {
					$path = wp_parse_url( $url, PHP_URL_PATH );
					$url  = untrailingslashit( $base_url ) . ( $path ? $path : '' );
				}

				// Already hosted on this WordPress site -> keep as-is.
				$site_host = wp_parse_url( $site_url, PHP_URL_HOST );
				if ( $host && $site_host && strtolower( $host ) === strtolower( $site_host ) ) {
					return 'url(' . $quote . $url . $quote . ')';
				}

				$mapped = self::import_media_url_for_report( $url, $report );
				if ( empty( $mapped['failed'] ) && ! empty( $mapped['url'] ) ) {
					return 'url(' . $quote . $mapped['url'] . $quote . ')';
				}
				return $matches[0]; // download failed: preserve original URL
			},
			$css
		);
	}



	private static function walk_media_value( &$value, &$report ) {
		if ( is_array( $value ) ) {
			// Elementor image controls are arrays like { id, url, alt }. Preserve all
			// existing keys and add the Media Library attachment id.
			if ( isset( $value['url'] ) && self::is_remote_image_url( $value['url'] ) ) {
				$alt    = isset( $value['alt'] ) ? (string) $value['alt'] : '';
				$mapped = self::import_media_url_for_report( $value['url'], $report, $alt );
				if ( empty( $mapped['failed'] ) ) {
					$value['id']  = (int) $mapped['id'];
					$value['url'] = (string) $mapped['url'];
				}
			}
			foreach ( $value as $key => &$child ) {
				if ( is_string( $child ) && self::is_remote_image_url( $child ) ) {
					$mapped = self::import_media_url_for_report( $child, $report );
					if ( empty( $mapped['failed'] ) ) {
						$child = (string) $mapped['url'];
					}
					continue;
				}
				self::walk_media_value( $child, $report );
			}
			unset( $child );
		}
	}

	private static function map_css_media_references( $css, &$report, $base_url = '' ) {
		if ( ! isset( $report['urls'] ) || ! is_array( $report['urls'] ) ) {
			$report['urls'] = array();
		}

		// Comprehensive pass: downloads + rewrites every url(...) in the CSS across
		// all image-bearing properties (background-image, list-style-image,
		// border-image, cursor, content, @font-face src), converts data:/base64
		// URIs to real files, normalizes localhost/relative/protocol-relative/http
		// URLs, and preserves SVG/WebP/AVIF formats + original bytes (dimensions,
		// quality, EXIF). WordPress then builds thumbnails + srcset for rasters.
		return self::process_css_media( $css, $base_url, $report );
	}


	private static function map_exact_html_media_references( &$elements, &$report ) {
		if ( ! is_array( $elements ) ) {
			return;
		}
		foreach ( $elements as &$element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			if ( isset( $element['elType'], $element['widgetType'] ) && 'widget' === $element['elType'] && 'html' === $element['widgetType'] && isset( $element['settings']['html'] ) && is_string( $element['settings']['html'] ) ) {
				$html = self::sanitize_exact_render_html( $element['settings']['html'] );
				if ( preg_match_all( '#https?://[^\s"\'\)<>]+#i', $html, $matches ) ) {
					foreach ( array_unique( $matches[0] ) as $url ) {
						$clean_url = rtrim( $url, '.,;:' );
						if ( self::is_remote_image_url( $clean_url ) ) {
							$mapped = self::import_media_url_for_report( $clean_url, $report );
							if ( empty( $mapped['failed'] ) && ! empty( $mapped['url'] ) ) {
								$html = str_replace( $clean_url, (string) $mapped['url'], $html );
							}
						}
					}
				}
				$element['settings']['html'] = $html;
			}
			if ( ! empty( $element['elements'] ) && is_array( $element['elements'] ) ) {
				self::map_exact_html_media_references( $element['elements'], $report );
			}
		}
		unset( $element );
	}

	private static function schedule_deferred_exact_media_sync( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id || ! function_exists( 'wp_schedule_single_event' ) ) {
			return;
		}
		$args = array( $post_id );
		if ( function_exists( 'wp_next_scheduled' ) && wp_next_scheduled( 'xxxv_deferred_exact_media_sync', $args ) ) {
			return;
		}
		wp_schedule_single_event( time() + 5, 'xxxv_deferred_exact_media_sync', $args );
		self::log( 'info', 'Deferred exact-render media sync scheduled.', array( 'post_id' => $post_id ) );
	}

	public static function deferred_exact_media_sync( $post_id ) {
		$post_id = absint( $post_id );
		if ( ! $post_id ) {
			return;
		}
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 90 );
		}

		$saved = get_post_meta( $post_id, '_elementor_data', true );
		$data  = is_string( $saved ) ? json_decode( $saved, true ) : null;
		if ( ! is_array( $data ) && is_string( $saved ) ) {
			$data = json_decode( wp_unslash( $saved ), true );
		}
		if ( ! is_array( $data ) || empty( $data ) ) {
			return;
		}

		$report = array(
			'imported' => 0,
			'reused'   => 0,
			'failed'   => 0,
			'urls'     => array(),
		);
		self::map_exact_html_media_references( $data, $report );

		$json = wp_json_encode( $data );
		if ( false !== $json ) {
			update_post_meta( $post_id, '_elementor_data', wp_slash( $json ) );
			self::refresh_elementor_files( $post_id );
			self::regenerate_page_css( $post_id );
			self::clear_runtime_caches( $post_id );
		}

		self::log( 'info', 'Deferred exact-render media sync finished.', array( 'post_id' => $post_id, 'report' => $report ) );
	}

	/**
	 * Keep template CSS safe for a frontend <style> tag while preserving valid CSS.
	 *
	 * @param string $css Raw template CSS from the selected design.
	 * @return string
	 */
	private static function sanitize_template_css( $css ) {
		$css = str_replace( array( '</style', '<script', '</script' ), array( '<\/style', '', '' ), $css );
		return trim( $css );
	}

	/**
	 * Extract and combine ALL CSS available for a page into a single stylesheet.
	 *
	 * Sources, in cascade order (later wins on equal specificity):
	 *   1. <style> tags in the HTML.
	 *   2. Same-origin/relative <link rel="stylesheet"> hrefs (resolved from the ZIP).
	 *   3. Inline style="" attributes, promoted to scoped rules so they survive as CSS.
	 *   4. Every *.css file bundled inside the template ZIP.
	 *
	 * @param string      $html_content Raw page HTML.
	 * @param string|null $zip_path     Optional path to the template .zip on disk.
	 * @return string Combined CSS.
	 */
	public static function extract_all_css_from_html( $html_content, $zip_path = null ) {
		$html_content = (string) $html_content;
		$parts        = array();
		$seen_links   = array();

		// --- 1. <style> ... </style> blocks -------------------------------------
		if ( preg_match_all( '#<style\b[^>]*>([\s\S]*?)</style>#i', $html_content, $m ) ) {
			foreach ( $m[1] as $block ) {
				$block = trim( (string) $block );
				if ( '' !== $block ) {
					$parts[] = $block;
				}
			}
		}

		// --- Read the ZIP once so both <link> resolution and the bulk *.css
		//     harvest can share the same open handle. --------------------------
		$zip_css = array(); // normalized-name => css
		if ( $zip_path && is_string( $zip_path ) && file_exists( $zip_path ) && class_exists( 'ZipArchive' ) ) {
			$zip = new ZipArchive();
			if ( true === $zip->open( $zip_path ) ) {
				for ( $i = 0; $i < $zip->numFiles; $i++ ) {
					$name = $zip->getNameIndex( $i );
					if ( ! is_string( $name ) || ! preg_match( '#\.css$#i', $name ) ) {
						continue;
					}
					$contents = $zip->getFromIndex( $i );
					if ( is_string( $contents ) && '' !== trim( $contents ) ) {
						$key             = strtolower( ltrim( str_replace( '\\', '/', $name ), './' ) );
						$zip_css[ $key ] = $contents;
					}
				}
				$zip->close();
			}
		}

		// --- 2. <link rel="stylesheet" href="..."> -----------------------------
		if ( preg_match_all( '#<link\b[^>]*>#i', $html_content, $lm ) ) {
			foreach ( $lm[0] as $tag ) {
				// Only stylesheet links (skip preconnect/preload/icon/etc.).
				if ( preg_match( '#rel\s*=\s*["\']?[^"\'>]*\bstylesheet\b#i', $tag )
					&& preg_match( '#href\s*=\s*["\']([^"\']+)["\']#i', $tag, $hm ) ) {
					$href = trim( $hm[1] );
					if ( '' === $href || isset( $seen_links[ $href ] ) ) {
						continue;
					}
					$seen_links[ $href ] = true;
					// Skip remote fonts / third-party CSS — those keep loading via <link>.
					if ( preg_match( '#^https?://#i', $href ) || 0 === strpos( $href, '//' ) ) {
						continue;
					}
					// Resolve local/relative hrefs against the ZIP contents.
					$needle = strtolower( ltrim( str_replace( '\\', '/', $href ), './' ) );
					foreach ( $zip_css as $key => $css ) {
						if ( $key === $needle || substr( $key, -strlen( $needle ) - 1 ) === '/' . $needle ) {
							$parts[] = $css;
							unset( $zip_css[ $key ] ); // Avoid double-adding in step 4.
							break;
						}
					}
				}
			}
		}

		// --- 3. Inline style="" attributes -> scoped rules ---------------------
		if ( preg_match_all( '#style\s*=\s*["\']([^"\']+)["\']#i', $html_content, $sm ) ) {
			$inline = array();
			$idx    = 0;
			foreach ( $sm[1] as $decls ) {
				$decls = trim( (string) $decls );
				if ( '' === $decls ) {
					continue;
				}
				$idx++;
				$inline[] = '[data-xxxv-inline="' . $idx . '"]{' . rtrim( $decls, ';' ) . '}';
			}
			if ( $inline ) {
				$parts[] = implode( "\n", $inline );
			}
		}

		// --- 4. Any remaining *.css files inside the ZIP -----------------------
		foreach ( $zip_css as $css ) {
			$parts[] = $css;
		}

		// --- 5. Combine + sanitize --------------------------------------------
		$combined = implode( "\n\n", array_filter( array_map( 'trim', $parts ) ) );
		return self::sanitize_template_css( $combined );
	}


	private static function css_value( $value ) {
		$value = trim( (string) $value );
		if ( '' === $value || preg_match( '#[{}<>]#', $value ) ) {
			return '';
		}
		return str_replace( array( ';', '"' ), array( '', '\"' ), $value );
	}

	private static function css_size( $value ) {
		if ( is_array( $value ) ) {
			$size = isset( $value['size'] ) ? $value['size'] : '';
			$unit = isset( $value['unit'] ) ? $value['unit'] : 'px';
			if ( '' === $size || null === $size ) {
				return '';
			}
			return self::css_value( $size . $unit );
		}
		return self::css_value( $value );
	}

	private static function css_box( $value ) {
		if ( ! is_array( $value ) ) {
			return self::css_value( $value );
		}
		// Sanitise the unit: only allow real CSS length/percent units, else px.
		$unit = isset( $value['unit'] ) ? strtolower( trim( (string) $value['unit'] ) ) : 'px';
		$allowed_units = array( 'px', 'em', 'rem', '%', 'vw', 'vh', 'vmin', 'vmax', 'ch' );
		if ( ! in_array( $unit, $allowed_units, true ) ) {
			$unit = 'px';
		}
		// Strict coercion: pull the numeric part out of each side (handles values
		// that already carry a unit like "10px", stray text, or empties) so we
		// never emit garbage like "0px px 0px px" that invalidates the whole rule.
		$norm = function ( $v ) {
			$v = trim( (string) $v );
			if ( '' === $v ) {
				return '0';
			}
			if ( preg_match( '/-?\d*\.?\d+/', $v, $m ) ) {
				$num = $m[0];
				// Guard against malformed floats like "." or trailing dot.
				return is_numeric( $num ) ? rtrim( rtrim( $num, '0' ), '.' ) ?: '0' : '0';
			}
			return '0';
		};
		$has_side = isset( $value['top'] ) || isset( $value['right'] ) || isset( $value['bottom'] ) || isset( $value['left'] );
		$top = $norm( isset( $value['top'] ) ? $value['top'] : '' );
		$right = $norm( isset( $value['right'] ) ? $value['right'] : ( isset( $value['top'] ) ? $value['top'] : '' ) );
		$bottom = $norm( isset( $value['bottom'] ) ? $value['bottom'] : ( isset( $value['top'] ) ? $value['top'] : '' ) );
		$left = $norm( isset( $value['left'] ) ? $value['left'] : ( isset( $value['right'] ) ? $value['right'] : '' ) );
		// Nothing meaningful was provided — emit nothing rather than a zero box.
		if ( ! $has_side ) {
			return '';
		}
		// A zero-side stays valid only when it carries a unit ("0" is unitless-ok,
		// but keep the unit for consistency with Elementor output).
		return self::css_value( $top . $unit . ' ' . $right . $unit . ' ' . $bottom . $unit . ' ' . $left . $unit );
	}

	private static function css_decls( $decls ) {
		$out = array();
		foreach ( $decls as $prop => $value ) {
			$value = self::css_value( $value );
			if ( '' !== $value ) {
				$out[] = $prop . ':' . $value . ' !important';
			}
		}
		return implode( ';', $out );
	}

	private static function collect_critical_css_rules( $elements, $post_id, &$rules ) {
		if ( ! is_array( $elements ) ) {
			return;
		}
		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			$id = isset( $element['id'] ) ? preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) $element['id'] ) : '';
			$settings = isset( $element['settings'] ) && is_array( $element['settings'] ) ? $element['settings'] : array();
			$base = $id ? '.elementor-' . (int) $post_id . ' .elementor-element.elementor-element-' . $id : '';
			$decls = array();

			if ( 'container' === ( isset( $element['elType'] ) ? $element['elType'] : '' ) ) {
				$is_grid = ( isset( $settings['container_type'] ) && 'grid' === $settings['container_type'] );
				$decls['display'] = $is_grid ? 'grid' : 'flex';
				// Grid containers need explicit column tracks or they collapse to a
				// single column (breaks two-column heroes). Prefer the exact tracks
				// captured from the source, else fall back to N equal columns.
				if ( $is_grid ) {
					if ( ! empty( $settings['__xxxv_grid_template_columns'] ) ) {
						$decls['grid-template-columns'] = $settings['__xxxv_grid_template_columns'];
					} elseif ( isset( $settings['grid_columns_grid']['size'] ) && (int) $settings['grid_columns_grid']['size'] > 0 ) {
						$decls['grid-template-columns'] = 'repeat(' . (int) $settings['grid_columns_grid']['size'] . ', 1fr)';
					}
				}
				if ( isset( $settings['flex_direction'] ) ) $decls['flex-direction'] = $settings['flex_direction'];
				if ( isset( $settings['flex_wrap'] ) ) $decls['flex-wrap'] = $settings['flex_wrap'];
				if ( isset( $settings['flex_align_items'] ) ) $decls['align-items'] = $settings['flex_align_items'];
				if ( isset( $settings['flex_justify_content'] ) ) $decls['justify-content'] = $settings['flex_justify_content'];
				if ( isset( $settings['width'] ) ) $decls['width'] = self::css_size( $settings['width'] );
				if ( isset( $settings['min_height'] ) ) $decls['min-height'] = self::css_size( $settings['min_height'] );
				if ( isset( $settings['padding'] ) ) $decls['padding'] = self::css_box( $settings['padding'] );
				if ( isset( $settings['margin'] ) ) $decls['margin'] = self::css_box( $settings['margin'] );
				if ( isset( $settings['border_radius'] ) ) $decls['border-radius'] = self::css_box( $settings['border_radius'] );
				if ( isset( $settings['background_color'] ) ) $decls['background-color'] = $settings['background_color'];
				if ( isset( $settings['background_image']['url'] ) ) $decls['background-image'] = 'url(' . $settings['background_image']['url'] . ')';
				if ( isset( $settings['__xxxv_background'] ) ) $decls['background'] = $settings['__xxxv_background'];
				if ( isset( $settings['background_size'] ) ) $decls['background-size'] = $settings['background_size'];
				if ( isset( $settings['background_position'] ) ) $decls['background-position'] = $settings['background_position'];
				if ( isset( $settings['gap'] ) ) $decls['gap'] = self::css_size( $settings['gap'] );
				if ( isset( $settings['row_gap'] ) ) $decls['row-gap'] = self::css_size( $settings['row_gap'] );
				if ( isset( $settings['column_gap'] ) ) $decls['column-gap'] = self::css_size( $settings['column_gap'] );
				if ( isset( $settings['overflow'] ) ) $decls['overflow'] = $settings['overflow'];
				if ( isset( $settings['__xxxv_box_shadow'] ) ) $decls['box-shadow'] = $settings['__xxxv_box_shadow'];
				if ( isset( $settings['__xxxv_border'] ) ) $decls['border'] = $settings['__xxxv_border'];
			}

			if ( 'widget' === ( isset( $element['elType'] ) ? $element['elType'] : '' ) ) {
				$widget = isset( $element['widgetType'] ) ? $element['widgetType'] : '';
				if ( 'heading' === $widget ) {
					$base .= ' .elementor-heading-title';
					if ( isset( $settings['title_color'] ) ) $decls['color'] = $settings['title_color'];
				} elseif ( 'button' === $widget ) {
					$base .= ' .elementor-button';
					if ( isset( $settings['button_text_color'] ) ) $decls['color'] = $settings['button_text_color'];
					if ( isset( $settings['background_color'] ) ) $decls['background-color'] = $settings['background_color'];
					if ( isset( $settings['border_radius'] ) ) $decls['border-radius'] = self::css_box( $settings['border_radius'] );
				} elseif ( 'image' === $widget ) {
					$base .= ' img';
					if ( isset( $settings['width'] ) ) $decls['width'] = self::css_size( $settings['width'] );
					if ( isset( $settings['image_border_radius'] ) ) $decls['border-radius'] = self::css_box( $settings['image_border_radius'] );
					if ( isset( $settings['object_fit'] ) ) $decls['object-fit'] = $settings['object_fit'];
				} else {
					if ( isset( $settings['text_color'] ) ) $decls['color'] = $settings['text_color'];
				}
				if ( isset( $settings['typography_font_family'] ) ) $decls['font-family'] = $settings['typography_font_family'];
				if ( isset( $settings['typography_font_size'] ) ) $decls['font-size'] = self::css_size( $settings['typography_font_size'] );
				if ( isset( $settings['typography_font_weight'] ) ) $decls['font-weight'] = $settings['typography_font_weight'];
				if ( isset( $settings['typography_line_height'] ) ) $decls['line-height'] = self::css_size( $settings['typography_line_height'] );
				if ( isset( $settings['typography_letter_spacing'] ) ) $decls['letter-spacing'] = self::css_size( $settings['typography_letter_spacing'] );
				if ( isset( $settings['align'] ) ) $decls['text-align'] = $settings['align'];
			}

			$decl_text = self::css_decls( $decls );
			if ( $base && $decl_text ) {
				$rules[] = $base . '{' . $decl_text . '}';
			}
			// Interactive :hover/:focus/:active styles baked from pseudo-state
			// selectors. Emit them as a real `selector:hover` rule so the widget's
			// hover state matches the source design 1:1.
			if ( $base && ! empty( $settings['__xxxv_hover'] ) && is_array( $settings['__xxxv_hover'] ) ) {
				$hover_decls = array();
				foreach ( $settings['__xxxv_hover'] as $prop => $value ) {
					$prop = strtolower( preg_replace( '/[^a-z-]/i', '', (string) $prop ) );
					$val  = self::css_value( is_array( $value ) ? '' : (string) $value );
					if ( '' !== $prop && '' !== $val ) {
						$hover_decls[ $prop ] = $val;
					}
				}
				if ( $hover_decls ) {
					$hover_text = array();
					foreach ( $hover_decls as $prop => $val ) {
						$hover_text[] = $prop . ':' . $val . ' !important';
					}
					$rules[] = $base . ':hover,' . $base . ':focus{' . implode( ';', $hover_text ) . '}';
				}
			}

			if ( ! empty( $element['elements'] ) ) {
				self::collect_critical_css_rules( $element['elements'], $post_id, $rules );
			}
		}
	}

	private static function compile_critical_css( $elementor_data, $post_id ) {
		$rules = array(
			'.elementor-' . (int) $post_id . '{width:100% !important;max-width:none !important}',
			'.elementor-' . (int) $post_id . ' .e-con{box-sizing:border-box}',
		);
		self::collect_critical_css_rules( $elementor_data, $post_id, $rules );
		return trim( implode( "\n", array_unique( array_filter( $rules ) ) ) );
	}

	private static function get_runtime_template_css( $post_id ) {
		$chunks = array();
		foreach ( array( '_xxxv_template_css', '_xxxv_critical_css' ) as $key ) {
			$css = get_post_meta( $post_id, $key, true );
			if ( '_xxxv_critical_css' === $key && ( ! is_string( $css ) || '' === trim( $css ) ) ) {
				$saved = get_post_meta( $post_id, '_elementor_data', true );
				$data  = is_string( $saved ) ? json_decode( $saved, true ) : null;
				if ( ! is_array( $data ) && is_string( $saved ) ) {
					$data = json_decode( wp_unslash( $saved ), true );
				}
				if ( is_array( $data ) && ! empty( $data ) ) {
					$css = self::compile_critical_css( $data, $post_id );
					if ( is_string( $css ) && '' !== trim( $css ) ) {
						update_post_meta( $post_id, '_xxxv_critical_css', $css );
					}
				}
			}
			if ( is_string( $css ) && '' !== trim( $css ) ) {
				$chunks[] = trim( $css );
			}
		}
		return trim( implode( "\n", $chunks ) );
	}

	/**
	 * Confirm `_elementor_data` was saved and can be loaded back as the same
	 * Elementor element tree. This catches database/meta slashing issues before the
	 * SaaS marks the page as published.
	 *
	 * @param int   $post_id  Page ID.
	 * @param array $expected Incoming Elementor element model.
	 * @return array|WP_Error
	 */
	private static function validate_saved_elementor_data( $post_id, $expected ) {
		$saved = get_post_meta( $post_id, '_elementor_data', true );
		if ( ! is_string( $saved ) || '' === trim( $saved ) ) {
			return new WP_Error( 'xxxv_elementor_data_missing', 'Post-save validation failed: _elementor_data is missing.', array( 'status' => 500 ) );
		}

		// update_post_meta() strips slashes on write, so after saving wp_slash($json)
		// get_post_meta() normally returns valid JSON directly. Only fall back to
		// wp_unslash() for older installs that may have double-slashed stored data.
		$saved_decoded = json_decode( $saved, true );
		if ( ! is_array( $saved_decoded ) ) {
			$saved_decoded = json_decode( wp_unslash( $saved ), true );
		}
		if ( ! is_array( $saved_decoded ) || empty( $saved_decoded ) ) {
			return new WP_Error( 'xxxv_elementor_data_unreadable', 'Post-save validation failed: stored _elementor_data is not readable.', array( 'status' => 500 ) );
		}

		$expected_normalized = self::normalize_elementor_data_for_compare( $expected );
		$saved_normalized    = self::normalize_elementor_data_for_compare( $saved_decoded );
		$expected_json       = wp_json_encode( $expected_normalized );
		$saved_json          = wp_json_encode( $saved_normalized );
		if ( false === $expected_json || false === $saved_json ) {
			return new WP_Error( 'xxxv_elementor_data_encode_failed', 'Post-save validation failed: could not encode Elementor data for comparison.', array( 'status' => 500 ) );
		}

		if ( hash( 'sha256', $expected_json ) !== hash( 'sha256', $saved_json ) ) {
			return new WP_Error( 'xxxv_elementor_data_mismatch', 'Post-save validation failed: saved _elementor_data does not match the submitted template JSON.', array( 'status' => 500 ) );
		}

		return array(
			'elements' => count( $saved_decoded ),
			'hash'     => hash( 'sha256', $saved_json ),
		);
	}

	/**
	 * Post-publish verification that the saved page actually opens in Elementor's
	 * "Edit with Elementor" mode AND contains editable regions/widgets.
	 *
	 * This guards against pages that save with valid JSON but would land the
	 * client in the classic/Gutenberg editor, or that contain only structural
	 * containers with nothing to edit. Any failure aborts publishing (rollback).
	 *
	 * @param int $post_id Page ID.
	 * @return array|WP_Error { edit_mode, widgets } on success.
	 */
	private static function validate_editor_ready( $post_id ) {
		// (a) Edit mode must be the Elementor builder, otherwise the page opens in
		//     the classic editor instead of "Edit with Elementor".
		$edit_mode = get_post_meta( $post_id, '_elementor_edit_mode', true );
		if ( 'builder' !== $edit_mode ) {
			return new WP_Error(
				'xxxv_editor_not_builder',
				'Post-publish check failed: the page is not set to open with "Edit with Elementor" (edit mode: ' . ( $edit_mode ? $edit_mode : 'none' ) . ').',
				array( 'status' => 500 )
			);
		}

		// (b) Confirm Elementor itself recognizes this post as built with Elementor,
		//     which is exactly what gates the "Edit with Elementor" entry point.
		if ( class_exists( '\\Elementor\\Plugin' ) ) {
			$plugin = \Elementor\Plugin::$instance;
			if ( $plugin && isset( $plugin->documents ) ) {
				$document = $plugin->documents->get( $post_id );
				if ( ! $document ) {
					return new WP_Error(
						'xxxv_editor_no_document',
						'Post-publish check failed: Elementor could not load a document for this page, so "Edit with Elementor" would not open it.',
						array( 'status' => 500 )
					);
				}
				if ( method_exists( $document, 'is_built_with_elementor' ) && ! $document->is_built_with_elementor() ) {
					return new WP_Error(
						'xxxv_editor_not_built',
						'Post-publish check failed: Elementor does not consider this page built with Elementor.',
						array( 'status' => 500 )
					);
				}
			}
		}

		// (c) Count actual editable widgets in the saved model. A page with zero
		//     widgets has no editable regions for the client to work with.
		$saved   = get_post_meta( $post_id, '_elementor_data', true );
		$decoded = is_string( $saved ) ? json_decode( $saved, true ) : null;
		if ( ! is_array( $decoded ) ) {
			$decoded = is_string( $saved ) ? json_decode( wp_unslash( $saved ), true ) : null;
		}
		$widgets = is_array( $decoded ) ? self::count_widgets( $decoded ) : 0;
		if ( $widgets < 1 ) {
			return new WP_Error(
				'xxxv_editor_no_widgets',
				'Post-publish check failed: the saved page has no editable Elementor widgets.',
				array( 'status' => 500 )
			);
		}

		return array(
			'edit_mode' => $edit_mode,
			'widgets'   => $widgets,
		);
	}

	/**
	 * Recursively count widget elements in an Elementor data tree.
	 *
	 * @param array $elements Element list.
	 * @return int
	 */
	private static function count_widgets( $elements ) {
		$count = 0;
		if ( ! is_array( $elements ) ) {
			return 0;
		}
		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			if ( isset( $element['elType'] ) && 'widget' === $element['elType'] ) {
				$count++;
			}
			if ( ! empty( $element['elements'] ) && is_array( $element['elements'] ) ) {
				$count += self::count_widgets( $element['elements'] );
			}
		}
		return $count;
	}

	/**
	 * Recursively sort associative keys so the validation hash catches real data
	 * changes, not harmless JSON key-order differences introduced by WordPress.
	 *
	 * @param mixed $data Elementor data.
	 * @return mixed
	 */
	private static function normalize_elementor_data_for_compare( $data ) {
		if ( ! is_array( $data ) ) {
			return $data;
		}

		$is_list = array_keys( $data ) === range( 0, count( $data ) - 1 );
		foreach ( $data as $key => $value ) {
			$data[ $key ] = self::normalize_elementor_data_for_compare( $value );
		}
		if ( ! $is_list ) {
			ksort( $data );
		}
		return $data;
	}

	/**
	 * Print template CSS stored with the Elementor JSON. This is required because
	 * native REST-created widgets do not automatically carry arbitrary class-based
	 * marketplace CSS; the classes stay editable on widgets, and this CSS restores
	 * the exact spacing, colors, hero layout, and responsive design on the live page.
	 */
	public static function print_template_css() {
		if ( ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id ) {
			return;
		}
		$css = self::get_runtime_template_css( $post_id );
		if ( ! is_string( $css ) || '' === trim( $css ) ) {
			return;
		}
		echo "\n<style id=\"xxxv-template-css-" . esc_attr( (string) $post_id ) . "\">\n" . $css . "\n</style>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitized CSS must stay raw inside <style>.
	}

	/**
	 * Enqueue stored template CSS as real frontend CSS. Some optimization/cache
	 * plugins move or strip late wp_head style tags, while wp_add_inline_style()
	 * is handled as an enqueued stylesheet dependency. We keep print_template_css()
	 * as a backup, but this is the primary live-page CSS path.
	 */
	public static function enqueue_template_css() {
		if ( ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id ) {
			return;
		}
		$css = self::get_runtime_template_css( $post_id );
		if ( ! is_string( $css ) || '' === trim( $css ) ) {
			return;
		}

		// Version the stylesheet with the per-page cache-buster so a forced
		// refresh produces a fresh query string and defeats client/CDN caching.
		$cache_version = get_post_meta( $post_id, '_xxxv_cache_version', true );
		if ( ! $cache_version ) {
			$cache_version = get_option( 'xxxv_global_cache_version', XXXV_CONNECTOR_VERSION );
		}
		$handle = 'xxxv-template-css-' . (int) $post_id;
		wp_register_style( $handle, false, array(), XXXV_CONNECTOR_VERSION . '-' . $cache_version );
		wp_enqueue_style( $handle );
		wp_add_inline_style( $handle, $css );
	}

	/**
	 * Curated list of Google Fonts families so `font-family` declarations that
	 * don't have an accompanying @import/<link> can still be auto-registered.
	 * (Names are matched case-insensitively.)
	 *
	 * @return string[]
	 */
	private static function known_google_fonts() {
		return array(
			'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter', 'Raleway',
			'Nunito', 'Nunito Sans', 'Merriweather', 'Playfair Display', 'Oswald',
			'Source Sans Pro', 'Source Sans 3', 'Source Serif Pro', 'PT Sans', 'PT Serif',
			'Ubuntu', 'Rubik', 'Work Sans', 'Mukta', 'Noto Sans', 'Noto Serif', 'Quicksand',
			'Karla', 'Josefin Sans', 'Manrope', 'DM Sans', 'DM Serif Display', 'Barlow',
			'Kanit', 'Heebo', 'Titillium Web', 'Fira Sans', 'Cabin', 'Bebas Neue',
			'Dosis', 'Libre Franklin', 'Libre Baskerville', 'Archivo', 'Space Grotesk',
			'Space Mono', 'Roboto Slab', 'Roboto Condensed', 'Roboto Mono', 'Lora',
			'Mulish', 'Hind', 'Assistant', 'Anton', 'Teko', 'Exo 2', 'Prompt',
			'Crimson Text', 'IBM Plex Sans', 'IBM Plex Serif', 'IBM Plex Mono',
			'Comfortaa', 'Pacifico', 'Caveat', 'Dancing Script', 'Abril Fatface',
			'Zilla Slab', 'Bitter', 'Overpass', 'Catamaran', 'Cairo', 'Tajawal',
			'Figtree', 'Outfit', 'Sora', 'Plus Jakarta Sans', 'Lexend', 'Red Hat Display',
			'Jost', 'Epilogue', 'Albert Sans', 'Onest', 'Schibsted Grotesk',
		);
	}

	/**
	 * Detect Google Fonts referenced anywhere in the template markup/CSS and return
	 * a normalized spec: [ family => [ 'family' => str, 'weights' => int[],
	 * 'subsets' => str[], 'display' => str ] ].
	 *
	 * Sources scanned:
	 *   1. CSS `@import url('https://fonts.googleapis.com/css2?family=...')`
	 *   2. HTML `<link href="https://fonts.googleapis.com/css2?family=...">`
	 *   3. Bare `font-family: 'Name'` declarations matched against the known list
	 *
	 * @param string $content Combined CSS + HTML.
	 * @return array
	 */
	private static function detect_google_fonts( $content ) {
		if ( ! is_string( $content ) || '' === trim( $content ) ) {
			return array();
		}

		$fonts = array();

		$add_family = function ( $family, $weights = array(), $subsets = array(), $display = 'swap' ) use ( &$fonts ) {
			$family = trim( (string) $family, " \t\n\r\0\x0B\"'" );
			$family = str_replace( '+', ' ', $family );
			if ( '' === $family ) {
				return;
			}
			$key = strtolower( $family );
			if ( ! isset( $fonts[ $key ] ) ) {
				$fonts[ $key ] = array(
					'family'  => $family,
					'weights' => array(),
					'subsets' => array(),
					'display' => $display,
				);
			}
			foreach ( (array) $weights as $w ) {
				$w = (int) $w;
				if ( $w >= 100 && $w <= 900 && ! in_array( $w, $fonts[ $key ]['weights'], true ) ) {
					$fonts[ $key ]['weights'][] = $w;
				}
			}
			foreach ( (array) $subsets as $s ) {
				$s = strtolower( trim( (string) $s ) );
				if ( '' !== $s && ! in_array( $s, $fonts[ $key ]['subsets'], true ) ) {
					$fonts[ $key ]['subsets'][] = $s;
				}
			}
			if ( $display ) {
				$fonts[ $key ]['display'] = $display;
			}
		};

		// Parse a Google Fonts stylesheet URL and register its families.
		$parse_gf_url = function ( $url ) use ( $add_family ) {
			$url   = html_entity_decode( $url, ENT_QUOTES );
			$parts = wp_parse_url( $url );
			if ( empty( $parts['query'] ) ) {
				return;
			}
			// Query may contain repeated `family=` keys; split manually.
			$display = 'swap';
			$subsets = array();
			$pairs   = explode( '&', $parts['query'] );
			$families = array();
			foreach ( $pairs as $pair ) {
				$kv  = explode( '=', $pair, 2 );
				$k   = urldecode( $kv[0] );
				$v   = isset( $kv[1] ) ? urldecode( $kv[1] ) : '';
				if ( 'family' === $k ) {
					$families[] = $v;
				} elseif ( 'display' === $k && '' !== $v ) {
					$display = sanitize_key( $v );
				} elseif ( 'subset' === $k && '' !== $v ) {
					$subsets = array_merge( $subsets, explode( ',', $v ) );
				}
			}
			foreach ( $families as $fam ) {
				// Formats: "Roboto", "Roboto:wght@400;700",
				// "Open Sans:ital,wght@0,400;0,700;1,400"
				$name    = $fam;
				$weights = array();
				if ( false !== strpos( $fam, ':' ) ) {
					list( $name, $axis ) = explode( ':', $fam, 2 );
					if ( false !== strpos( $axis, '@' ) ) {
						$tuples = substr( $axis, strpos( $axis, '@' ) + 1 );
						foreach ( explode( ';', $tuples ) as $tuple ) {
							$nums = explode( ',', $tuple );
							$weights[] = (int) end( $nums ); // last value is the weight
						}
					}
				}
				$add_family( $name, $weights, $subsets, $display );
			}
		};

		// 1 + 2: @import url(...) and <link href="..."> pointing at Google Fonts.
		if ( preg_match_all( '#https?://fonts\.googleapis\.com/[^\s"\'\)>]+#i', $content, $m ) ) {
			foreach ( array_unique( $m[0] ) as $url ) {
				$parse_gf_url( rtrim( $url, '.,;' ) );
			}
		}

		// 3: bare font-family declarations matched against the known families.
		if ( preg_match_all( '#font-family\s*:\s*([^;{}]+)#i', $content, $m2 ) ) {
			$known = self::known_google_fonts();
			foreach ( $m2[1] as $decl ) {
				foreach ( explode( ',', $decl ) as $candidate ) {
					$name = trim( $candidate, " \t\n\r\0\x0B\"'" );
					foreach ( $known as $gf ) {
						if ( strcasecmp( $name, $gf ) === 0 && ! isset( $fonts[ strtolower( $gf ) ] ) ) {
							$add_family( $gf, array( 400, 500, 600, 700 ), array( 'latin' ), 'swap' );
						}
					}
				}
			}
		}

		return array_values( $fonts );
	}

	/**
	 * Build the Google Fonts CSS2 stylesheet URL for a stored font spec.
	 *
	 * @param array $fonts Normalized font spec from detect_google_fonts().
	 * @return string Full https URL, or '' when there is nothing to load.
	 */
	private static function build_google_fonts_url( $fonts ) {
		if ( empty( $fonts ) || ! is_array( $fonts ) ) {
			return '';
		}
		$families = array();
		$display  = 'swap';
		$subsets  = array();
		foreach ( $fonts as $font ) {
			if ( empty( $font['family'] ) ) {
				continue;
			}
			$name    = str_replace( ' ', '+', $font['family'] );
			$weights = isset( $font['weights'] ) ? array_map( 'intval', (array) $font['weights'] ) : array();
			$weights = array_values( array_unique( array_filter( $weights ) ) );
			sort( $weights );
			if ( empty( $weights ) ) {
				$weights = array( 400, 700 );
			}
			$families[] = $name . ':wght@' . implode( ';', $weights );
			if ( ! empty( $font['display'] ) ) {
				$display = sanitize_key( $font['display'] );
			}
			if ( ! empty( $font['subsets'] ) ) {
				$subsets = array_merge( $subsets, (array) $font['subsets'] );
			}
		}
		if ( empty( $families ) ) {
			return '';
		}
		$query = array();
		foreach ( $families as $fam ) {
			$query[] = 'family=' . $fam;
		}
		$subsets = array_values( array_unique( array_filter( array_map( 'sanitize_key', $subsets ) ) ) );
		if ( ! empty( $subsets ) ) {
			$query[] = 'subset=' . implode( ',', $subsets );
		}
		$query[] = 'display=' . ( $display ? $display : 'swap' );
		return 'https://fonts.googleapis.com/css2?' . implode( '&', $query );
	}

	/**
	 * Register + preload the template's Google Fonts on connector pages so the
	 * imported typography renders exactly, with correct weights/subsets and
	 * `display=swap`, plus preconnect hints for performance. Hooked to
	 * wp_enqueue_scripts (early) and wp_head (preconnect/preload).
	 */
	public static function enqueue_google_fonts() {
		if ( is_admin() || ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id || ! self::is_connector_page( $post_id ) ) {
			return;
		}
		$fonts = self::get_page_google_fonts( $post_id );
		$url   = self::build_google_fonts_url( $fonts );
		if ( '' === $url ) {
			return;
		}
		wp_enqueue_style( 'xxxv-google-fonts-' . (int) $post_id, $url, array(), null );
	}

	/**
	 * Emit preconnect + preload hints for the Google Fonts stylesheet in <head>.
	 * Hooked to wp_head at priority 1 so it lands before the stylesheet.
	 */
	public static function preconnect_google_fonts() {
		if ( is_admin() || ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id || ! self::is_connector_page( $post_id ) ) {
			return;
		}
		$fonts = self::get_page_google_fonts( $post_id );
		$url   = self::build_google_fonts_url( $fonts );
		if ( '' === $url ) {
			return;
		}
		echo "\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />";
		echo "\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />";
		echo "\n<link rel=\"preload\" as=\"style\" href=\"" . esc_url( $url ) . "\" />\n";
	}

	/**
	 * Read + decode the stored Google Fonts spec for a page.
	 *
	 * @param int $post_id Page ID.
	 * @return array
	 */
	private static function get_page_google_fonts( $post_id ) {
		$raw = get_post_meta( $post_id, '_xxxv_google_fonts', true );
		if ( ! is_string( $raw ) || '' === $raw ) {
			return array();
		}
		$data = json_decode( $raw, true );
		return is_array( $data ) ? $data : array();
	}

	/**
	 * Register the current connector page's detected Google Fonts with Elementor's
	 * font manager so they resolve to the "googlefonts" group (correct enqueue in
	 * both editor + frontend) and appear as known families in Elementor controls.
	 * Hooked to `elementor/fonts/additional_fonts`.
	 *
	 * @param array $additional_fonts Existing additional fonts map.
	 * @return array
	 */
	public static function register_elementor_fonts( $additional_fonts ) {
		if ( ! is_array( $additional_fonts ) ) {
			$additional_fonts = array();
		}
		$post_id = 0;
		if ( function_exists( 'get_queried_object_id' ) ) {
			$post_id = get_queried_object_id();
		}
		if ( ( ! $post_id ) && isset( $_GET['post'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only editor context.
			$post_id = absint( $_GET['post'] );
		}
		if ( ! $post_id ) {
			return $additional_fonts;
		}
		$fonts = self::get_page_google_fonts( $post_id );
		foreach ( $fonts as $font ) {
			if ( ! empty( $font['family'] ) ) {
				$additional_fonts[ $font['family'] ] = 'googlefonts';
			}
		}
		return $additional_fonts;
	}




	/**
	 * Whether theme-CSS neutralization is enabled for this connector/site.
	 * Defaults to enabled so existing installs keep current behavior.
	 *
	 * @return bool
	 */
	public static function is_neutralization_enabled() {
		if ( ! defined( 'XXXV_CONNECTOR_OPT_NEUTRALIZE' ) ) {
			return true;
		}
		$val = get_option( XXXV_CONNECTOR_OPT_NEUTRALIZE, '1' );
		return '0' !== (string) $val;
	}

	/**
	 * Style handles the user chose to exclude from neutralization (kept enqueued).
	 * Stored as a newline/comma-separated list; returned as a lowercase array.
	 *
	 * @return array
	 */
	public static function neutralization_excludes() {
		if ( ! defined( 'XXXV_CONNECTOR_OPT_NEUTRALIZE_EXCLUDES' ) ) {
			return array();
		}
		$raw = (string) get_option( XXXV_CONNECTOR_OPT_NEUTRALIZE_EXCLUDES, '' );
		if ( '' === trim( $raw ) ) {
			return array();
		}
		$parts = preg_split( '/[\s,]+/', $raw );
		$out   = array();
		foreach ( (array) $parts as $p ) {
			$p = strtolower( trim( (string) $p ) );
			if ( '' !== $p ) {
				$out[] = $p;
			}
		}
		return array_values( array_unique( $out ) );
	}

	/**
	 * Neutralize the active theme's CSS on connector-imported pages so it can never
	 * override the imported template design. Runs late on wp_enqueue_scripts and
	 * dequeues theme stylesheets (generic + per-theme handles), and on wp_head/init
	 * strips WordPress block/global/duotone styles and theme editor styles. The
	 * connector template CSS (enqueued at PHP_INT_MAX) therefore always wins.
	 */
	public static function neutralize_theme_css() {
		if ( is_admin() || ! is_singular( 'page' ) ) {
			return;
		}
		if ( ! self::is_neutralization_enabled() ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id || ! self::is_connector_page( $post_id ) ) {
			return;
		}

		global $wp_styles;

		$theme      = function_exists( 'wp_get_theme' ) ? wp_get_theme() : null;
		$stylesheet = $theme ? (string) $theme->get_stylesheet() : '';
		$template   = $theme ? (string) $theme->get_template() : '';

		// Hello Elementor is the recommended blank canvas — keep it. Plus any
		// stylesheet handles the user explicitly excluded from neutralization.
		$keep = array_merge(
			array( 'hello-elementor', 'hello-elementor-theme-style', 'hello-elementor-child-style' ),
			self::neutralization_excludes()
		);

		// Known per-theme stylesheet handles to remove.
		$theme_handles = array(
			'astra-theme-css', 'astra-google-fonts',                 // Astra
			'generatepress-style', 'generate-style-css',             // GeneratePress
			'kadence-style', 'kadence-global',                       // Kadence
			'twentytwentyfive-style', 'twentytwentyfour-style',      // TT5 / TT4
			'twentytwentythree-style', 'twentytwentytwo-style',
			'oceanwp-style',                                         // OceanWP
			'blocksy-styles', 'blocksy-style',                       // Blocksy
			'neve-style',                                            // Neve
			'divi-style', 'et-builder-googlefonts', 'et-core-unified', // Divi
			'storefront-style', 'twentytwentyone-style',
			'flatsome-style', 'flatsome-shop',                       // Flatsome
			'avada-stylesheet', 'fusion-dynamic-css',                // Avada
			'bricks-frontend',                                       // Bricks (as theme)
		);

		// Also derive handles from the active theme slug (covers custom themes).
		foreach ( array( $stylesheet, $template ) as $slug ) {
			if ( '' === $slug ) {
				continue;
			}
			$theme_handles[] = $slug . '-style';
			$theme_handles[] = $slug . '-theme-css';
			$theme_handles[] = $slug . '-css';
		}

		if ( $wp_styles instanceof \WP_Styles ) {
			foreach ( $theme_handles as $handle ) {
				if ( in_array( $handle, $keep, true ) ) {
					continue;
				}
				if ( isset( $wp_styles->registered[ $handle ] ) ) {
					wp_dequeue_style( $handle );
				}
			}
		}
	}

	/**
	 * Remove WordPress block library / global styles / duotone / classic theme
	 * styles + theme editor styles on connector pages. Hooked to wp_enqueue_scripts
	 * (late) and init so both enqueue and print paths are covered.
	 */
	public static function disable_global_styles() {
		if ( is_admin() ) {
			return;
		}
		if ( function_exists( 'is_singular' ) && ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = function_exists( 'get_queried_object_id' ) ? get_queried_object_id() : 0;
		if ( ! $post_id || ! self::is_connector_page( $post_id ) ) {
			return;
		}
		if ( ! self::is_neutralization_enabled() ) {
			return;
		}

		// Disable WP block styles, theme.json global styles, and duotone SVG filters.
		remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
		remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
		remove_action( 'wp_body_open', 'wp_global_styles_render_svg_filters' );
		remove_action( 'in_admin_header', 'wp_global_styles_render_svg_filters' );
		remove_filter( 'render_block', 'wp_render_duotone_support' );

		// Dequeue core block CSS.
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'wp-block-library-theme' );
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'classic-theme-styles' );
		wp_dequeue_style( 'wc-blocks-style' );

		// Strip theme add_editor_style / block styles opt-ins on the frontend.
		remove_theme_support( 'editor-styles' );
		remove_theme_support( 'wp-block-styles' );
	}

	/**
	 * Prevent theme CSS from overriding the imported template design.
	 *
	 * Single orchestrator hooked very late on wp_enqueue_scripts that:
	 *   1. Dequeues ALL theme styles (delegates to neutralize_theme_css +
	 *      disable_global_styles, then sweeps any remaining stylesheet whose src
	 *      lives under the active theme directory as a catch-all).
	 *   2. Forces the connector template CSS to load LAST by re-appending its
	 *      handle to the print queue so it wins the cascade.
	 *   3. Adds an !important safety layer that pins the imported design's base
	 *      typography/color onto the Elementor page wrapper so late theme rules
	 *      can never reassert themselves.
	 */
	public static function prevent_theme_css_override() {
		if ( is_admin() || ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id || ! self::is_connector_page( $post_id ) ) {
			return;
		}

		// --- 1. Dequeue all theme styles --------------------------------------
		self::disable_global_styles();
		self::neutralize_theme_css();

		global $wp_styles;
		if ( $wp_styles instanceof \WP_Styles ) {
			$theme_root = '';
			if ( function_exists( 'get_stylesheet_directory_uri' ) ) {
				$theme_root = trailingslashit( get_template_directory_uri() );
			}
			$child_root = function_exists( 'get_stylesheet_directory_uri' ) ? trailingslashit( get_stylesheet_directory_uri() ) : '';
			$keep       = array( 'hello-elementor', 'hello-elementor-theme-style', 'hello-elementor-child-style' );
			foreach ( (array) $wp_styles->queue as $handle ) {
				if ( in_array( $handle, $keep, true ) || 0 === strpos( (string) $handle, 'elementor' ) || 0 === strpos( (string) $handle, 'xxxv-' ) ) {
					continue;
				}
				$src = isset( $wp_styles->registered[ $handle ] ) ? (string) $wp_styles->registered[ $handle ]->src : '';
				if ( '' !== $src && ( ( '' !== $theme_root && 0 === strpos( $src, $theme_root ) ) || ( '' !== $child_root && 0 === strpos( $src, $child_root ) ) ) ) {
					wp_dequeue_style( $handle );
				}
			}

			// --- 2. Force Elementor + connector CSS to load LAST --------------
			$last_handles = array();
			foreach ( (array) $wp_styles->queue as $handle ) {
				if ( 0 === strpos( (string) $handle, 'elementor' ) || 0 === strpos( (string) $handle, 'xxxv-' ) ) {
					$last_handles[] = $handle;
				}
			}
			if ( $last_handles ) {
				$wp_styles->queue = array_merge(
					array_values( array_diff( (array) $wp_styles->queue, $last_handles ) ),
					$last_handles
				);
			}
		}

		// --- 3. !important safety layer on the Elementor page wrapper ----------
		$guard = 'body.elementor-page .elementor{isolation:isolate}';
		if ( wp_style_is( 'xxxv-template-css-' . (int) $post_id, 'enqueued' ) ) {
			wp_add_inline_style( 'xxxv-template-css-' . (int) $post_id, $guard );
		}
	}




	/**
	 * Save through Elementor's Document API so the editor sees a clean document.
	 *
	 * @param int   $post_id Page ID.
	 * @param array $data    Element model.
	 */
	private static function save_via_document( $post_id, $data ) {
		if ( ! class_exists( '\Elementor\Plugin' ) ) {
			throw new Exception( 'Elementor Plugin class is not available.' );
		}
		try {
			$documents = \Elementor\Plugin::$instance->documents;
			if ( ! $documents ) {
				throw new Exception( 'Elementor documents manager is not available.' );
			}
			$document = $documents->get( $post_id );
			if ( ! $document ) {
				throw new Exception( 'Elementor document could not be initialized for page ' . (int) $post_id . '.' );
			}

			$document->save(
				array(
					'elements' => $data,
					'settings' => array(
						'post_status'  => get_post_status( $post_id ),
						'page_template'=> get_post_meta( $post_id, '_wp_page_template', true ),
					),
				)
			);

			if ( method_exists( $document, 'save_template_type' ) ) {
				$document->save_template_type();
			}
			if ( method_exists( $document, 'clear_cache' ) ) {
				$document->clear_cache();
			}
		} catch ( \Throwable $e ) {
			self::log( 'error', 'Document API save failed: ' . $e->getMessage(), array( 'post_id' => $post_id ) );
			throw new Exception( 'Elementor document lifecycle save failed: ' . $e->getMessage() );
		}
	}

	/**
	 * Save the incoming Elementor JSON as a native Elementor Library template and
	 * re-import it through Elementor's own template pipeline.
	 *
	 * This mirrors exactly what happens when a user saves a design as a template
	 * and then inserts it into a page from the Elementor library: element IDs are
	 * regenerated and each widget runs its own `on_import` handler, so the result
	 * is a set of fully-native, editable widgets rather than a raw meta blob.
	 *
	 * The saved template stays available under Templates -> Saved Templates. Any
	 * failure is non-fatal: we simply return the original data so publishing still
	 * succeeds with the direct-injection path.
	 *
	 * @param array  $data    Decoded Elementor elements array.
	 * @param string $title   Page title (used to name the saved template).
	 * @param int    $post_id Target page id (for logging / reference meta).
	 * @return array Processed elements array (or the original on any failure).
	 */
	private static function save_and_import_via_library( $data, $title, $post_id ) {
		try {
			if ( ! class_exists( '\Elementor\Plugin' ) || ! \Elementor\Plugin::$instance ) {
				return $data;
			}
			$manager = \Elementor\Plugin::$instance->templates_manager;
			if ( ! $manager ) {
				return $data;
			}
			$source = $manager->get_source( 'local' );
			if ( ! $source || ! method_exists( $source, 'save_item' ) ) {
				return $data;
			}

			// 1) Persist the JSON as a reusable Elementor Library template (page type).
			$template_id = $source->save_item(
				array(
					'content'       => $data,
					'title'         => $title . ' (3xVisibility)',
					'type'          => 'page',
					'page_settings' => array(),
				)
			);
			if ( is_wp_error( $template_id ) || ! $template_id ) {
				self::log( 'warn', 'Could not save Elementor library template; using direct data.', array( 'post_id' => $post_id ) );
				return $data;
			}
			update_post_meta( $post_id, '_xxxv_source_template_id', (int) $template_id );

			// 2) Re-read the template back through Elementor's export/import pipeline.
			//    Source_Local::get_data() runs replace_elements_ids() + each widget's
			//    on_import handler, returning fully-native, editable element data.
			if ( ! method_exists( $source, 'get_data' ) ) {
				return $data;
			}
			$processed = $source->get_data( array( 'template_id' => (int) $template_id ) );
			if ( is_array( $processed ) && isset( $processed['content'] ) && is_array( $processed['content'] ) && ! empty( $processed['content'] ) ) {
				self::log( 'info', 'Imported page from saved Elementor library template.', array( 'post_id' => $post_id, 'template_id' => (int) $template_id ) );
				return $processed['content'];
			}
			return $data;
		} catch ( \Throwable $e ) {
			self::log( 'warn', 'Template-library import fell back to direct data: ' . $e->getMessage(), array( 'post_id' => $post_id ) );
			return $data;
		}
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
			self::log( 'warn', 'Page CSS regeneration failed: ' . $e->getMessage(), array( 'post_id' => $post_id ) );
			return false;
		}
	}

	/**
	 * Force Elementor's files/document caches to refresh before CSS generation.
	 * Called BEFORE `regenerate_page_css()` so the regenerated CSS file is fresh.
	 */
	private static function refresh_elementor_files( $post_id ) {
		if ( ! class_exists( '\Elementor\Plugin' ) ) {
			return false;
		}
		try {
			$instance = \Elementor\Plugin::$instance;
			if ( isset( $instance->files_manager ) && method_exists( $instance->files_manager, 'clear_cache' ) ) {
				$instance->files_manager->clear_cache();
			}
			if ( isset( $instance->documents ) ) {
				$document = $instance->documents->get( $post_id );
				if ( $document && method_exists( $document, 'clear_cache' ) ) {
					$document->clear_cache();
				}
			}
			return true;
		} catch ( \Throwable $e ) {
			self::log( 'warn', 'Elementor file/document refresh failed: ' . $e->getMessage(), array( 'post_id' => $post_id ) );
			return false;
		}
	}

	/**
	 * Validate that Elementor's generated post CSS exists and that optional stored
	 * template CSS is available. Success is returned only when styling assets are
	 * present after publish.
	 */
	private static function validate_generated_css( $post_id, $expects_template_css ) {
		if ( $expects_template_css ) {
			$template_css = self::get_runtime_template_css( $post_id );
			if ( ! is_string( $template_css ) || '' === trim( $template_css ) ) {
				return new WP_Error( 'xxxv_template_css_missing', 'Post-save validation failed: template CSS meta is missing.', array( 'status' => 500 ) );
			}
		}

		$upload = wp_upload_dir();
		$path   = trailingslashit( $upload['basedir'] ) . 'elementor/css/post-' . (int) $post_id . '.css';
		if ( file_exists( $path ) && filesize( $path ) > 0 ) {
			return true;
		}

		// One more rebuild attempt after cache refresh for slow/locked filesystems.
		self::refresh_elementor_files( $post_id );
		self::regenerate_page_css( $post_id );
		if ( file_exists( $path ) && filesize( $path ) > 0 ) {
			return true;
		}

		// If Elementor's physical CSS file is unavailable on this host, the connector
		// critical CSS is still enough to render the page styled instead of rolling
		// back or leaving a broken unstyled page live.
		$critical_css = self::get_runtime_template_css( $post_id );
		if ( is_string( $critical_css ) && '' !== trim( $critical_css ) ) {
			return true;
		}

		return new WP_Error( 'xxxv_elementor_css_missing', 'Post-save validation failed: Elementor generated CSS file is missing or empty.', array( 'status' => 500 ) );
	}

	/**
	 * Regenerate the global (active kit) CSS so global colors / typography apply.
	 */
	public static function regenerate_global_css() {
		if ( ! class_exists( '\Elementor\Plugin' ) ) {
			return false;
		}
		try {
			// Preferred: regenerate the active kit's CSS file.
			if ( class_exists( '\Elementor\Core\Files\CSS\Global_CSS' ) ) {
				$global = new \Elementor\Core\Files\CSS\Global_CSS( 'global.css' );
				$global->update();
			}
			$kit_id = get_option( 'elementor_active_kit' );
			if ( $kit_id && class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
				$kit_css = new \Elementor\Core\Files\CSS\Post( (int) $kit_id );
				$kit_css->update();
			}
			return true;
		} catch ( \Throwable $e ) {
			self::log( 'warn', 'Global CSS regeneration failed: ' . $e->getMessage() );
			return false;
		}
	}

	/**
	 * Refresh / rebuild Elementor managed assets (icons, frontend files).
	 */
	private static function refresh_assets() {
		if ( ! class_exists( '\Elementor\Plugin' ) ) {
			return;
		}
		try {
			$instance = \Elementor\Plugin::$instance;
			if ( isset( $instance->frontend ) && method_exists( $instance->frontend, 'enqueue_styles' ) ) {
				// no-op on REST, but ensures assets manager is booted.
			}
			if ( isset( $instance->assets_loader ) ) {
				// Elementor 3.x assets loader auto-rebuilds on next render.
			}
		} catch ( \Throwable $e ) {
			self::log( 'warn', 'Asset refresh skipped: ' . $e->getMessage() );
		}
	}

	/**
	 * Take a snapshot of a page's Elementor state for rollback.
	 *
	 * @param int $post_id Page ID (0 = creating new, nothing to snapshot).
	 * @return array
	 */
	private static function snapshot( $post_id ) {
		if ( ! $post_id ) {
			return array( 'new' => true );
		}
		$post = get_post( $post_id );
		return array(
			'new'            => false,
			'post_title'     => $post ? $post->post_title : '',
			'post_name'      => $post ? $post->post_name : '',
			'post_status'    => $post ? $post->post_status : 'draft',
			'elementor_data' => get_post_meta( $post_id, '_elementor_data', true ),
			'template_css'   => get_post_meta( $post_id, '_xxxv_template_css', true ),
			'critical_css'   => get_post_meta( $post_id, '_xxxv_critical_css', true ),
			'page_template'  => get_post_meta( $post_id, '_wp_page_template', true ),
		);
	}

	/**
	 * Roll back to a snapshot after a failed publish.
	 *
	 * @param array $snap    Snapshot from self::snapshot().
	 * @param int   $post_id The page that was being updated (0 if newly created).
	 */
	private static function rollback( $snap, $post_id ) {
		if ( ! empty( $snap['new'] ) ) {
			// Created in this request: remove the partial page.
			if ( $post_id > 0 ) {
				wp_delete_post( $post_id, true );
			}
			return;
		}
		if ( ! $post_id ) {
			return;
		}
		wp_update_post(
			array(
				'ID'          => $post_id,
				'post_title'  => $snap['post_title'],
				'post_name'   => $snap['post_name'],
				'post_status' => $snap['post_status'],
			)
		);
		update_post_meta( $post_id, '_elementor_data', $snap['elementor_data'] );
		update_post_meta( $post_id, '_xxxv_template_css', isset( $snap['template_css'] ) ? $snap['template_css'] : '' );
		update_post_meta( $post_id, '_xxxv_critical_css', isset( $snap['critical_css'] ) ? $snap['critical_css'] : '' );
		update_post_meta( $post_id, '_wp_page_template', $snap['page_template'] );
		self::regenerate_page_css( $post_id );
		self::clear_runtime_caches( $post_id );
	}

	/**
	 * Lightweight error / debug logger (only writes when WP_DEBUG_LOG is on).
	 *
	 * @param string $level   info|warn|error
	 * @param string $message Message.
	 * @param array  $context Extra context.
	 */
	private static function log( $level, $message, $context = array() ) {
		// Always keep a short ring-buffer in an option for the admin debug view.
		$entry = array(
			'time'    => current_time( 'mysql' ),
			'level'   => $level,
			'message' => $message,
			'context' => $context,
		);
		$log   = get_option( 'xxxv_debug_log', array() );
		if ( ! is_array( $log ) ) {
			$log = array();
		}
		$log[] = $entry;
		if ( count( $log ) > 50 ) {
			$log = array_slice( $log, -50 );
		}
		update_option( 'xxxv_debug_log', $log, false );

		if ( defined( 'WP_DEBUG' ) && WP_DEBUG && function_exists( 'error_log' ) ) {
			error_log( '[3xVisibility][' . $level . '] ' . $message . ' ' . wp_json_encode( $context ) );
		}
	}

	/**
	 * Clear WordPress/Elementor/page-cache layers after publish or republish.
	 *
	 * @param int $post_id Published page ID.
	 */
	private static function clear_runtime_caches( $post_id ) {
		clean_post_cache( $post_id );
		if ( function_exists( 'wp_cache_delete' ) ) {
			wp_cache_delete( $post_id, 'posts' );
		}

		// Do NOT clear Elementor's files_manager cache here. The publish flow just
		// regenerated the per-page CSS file; clearing the file cache immediately
		// after that can delete/invalidates the fresh CSS before visitors load it,
		// causing live pages to look unstyled. We only purge page-scoped caches;
		// full-site/domain purges are intentionally skipped because they can block
		// REST publishing long enough for slow hosts to hit the SaaS timeout.

		if ( function_exists( 'rocket_clean_post' ) ) {
			rocket_clean_post( $post_id );
		}
		if ( function_exists( 'w3tc_flush_post' ) ) {
			w3tc_flush_post( $post_id );
		}
		if ( function_exists( 'wp_cache_post_change' ) ) {
			wp_cache_post_change( $post_id );
		}
		if ( class_exists( 'LiteSpeed\Purge' ) ) {
			do_action( 'litespeed_purge_post', $post_id );
		}
	}

	/**
	 * True when a page was published/imported by this connector and therefore
	 * carries our stored template/critical CSS. Only such pages are auto-healed.
	 *
	 * @param int $post_id Page ID.
	 * @return bool
	 */
	private static function is_connector_page( $post_id ) {
		if ( 'page' !== get_post_type( $post_id ) ) {
			return false;
		}
		if ( get_post_meta( $post_id, '_xxxv_template_css', true ) ) {
			return true;
		}
		if ( get_post_meta( $post_id, '_xxxv_critical_css', true ) ) {
			return true;
		}
		return (bool) get_post_meta( $post_id, '_xxxv_source_template_id', true );
	}

	/**
	 * ZERO-INTERVENTION CSS SELF-HEALING.
	 *
	 * Fires on every `save_post` (WP admin save, Elementor editor "Update",
	 * quick edit, revision restore, etc.) for connector-imported pages. It
	 * rebuilds Elementor's per-page CSS file, refreshes the connector critical
	 * CSS from the current `_elementor_data`, regenerates the global kit CSS and
	 * purges page/object/CDN caches — so the live page always keeps 100% of the
	 * template layout without the user regenerating anything by hand.
	 *
	 * @param int     $post_id Saved post ID.
	 * @param WP_Post $post    Post object.
	 * @param bool    $update  Whether this is an existing post update.
	 */
	public static function auto_regenerate_on_save( $post_id, $post = null, $update = false ) {
		// Guard against autosaves, revisions, and re-entrancy.
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		static $running = array();
		if ( isset( $running[ $post_id ] ) ) {
			return;
		}
		if ( ! did_action( 'elementor/loaded' ) ) {
			return;
		}
		if ( ! self::is_connector_page( $post_id ) ) {
			return;
		}

		$running[ $post_id ] = true;
		try {
			// Rebuild the connector critical CSS from the current Elementor data so
			// it always mirrors the latest edit (background/flex/grid/spacing).
			$saved = get_post_meta( $post_id, '_elementor_data', true );
			$data  = is_string( $saved ) ? json_decode( $saved, true ) : null;
			if ( ! is_array( $data ) && is_string( $saved ) ) {
				$data = json_decode( wp_unslash( $saved ), true );
			}
			if ( is_array( $data ) && ! empty( $data ) ) {
				$critical = self::compile_critical_css( $data, $post_id );
				if ( is_string( $critical ) && '' !== trim( $critical ) ) {
					update_post_meta( $post_id, '_xxxv_critical_css', $critical );
				}
			}

			self::refresh_elementor_files( $post_id );
			self::regenerate_page_css( $post_id );
			self::regenerate_global_css();
			self::refresh_assets();
			self::clear_runtime_caches( $post_id );
		} catch ( \Throwable $e ) {
			self::log( 'warn', 'Auto CSS self-heal failed: ' . $e->getMessage(), array( 'post_id' => $post_id ) );
		}
		unset( $running[ $post_id ] );
	}

	/**
	 * Auto cache purge whenever a connector page transitions to "publish".
	 * Runs a full domain/site purge for supported cache plugins so no stale,
	 * unstyled HTML survives the moment a page goes live.
	 *
	 * @param string  $new_status New post status.
	 * @param string  $old_status Old post status.
	 * @param WP_Post $post       Post object.
	 */
	public static function auto_clear_caches_on_publish( $new_status, $old_status, $post ) {
		if ( ! $post || 'page' !== $post->post_type ) {
			return;
		}
		if ( 'publish' !== $new_status ) {
			return;
		}
		if ( ! self::is_connector_page( $post->ID ) ) {
			return;
		}
		self::clear_runtime_caches( $post->ID );
		// Site-wide purges are safe here (not inside the REST publish request).
		self::purge_all_caches( $post->ID );
	}

	/**
	 * FULL-STACK cache purge. Clears every caching layer we can reach so a freshly
	 * published/updated connector page never serves stale, unstyled HTML:
	 * Elementor CSS, WP object cache, transients, options cache, page-cache
	 * plugins (WP Rocket, W3TC, WP Super Cache, LiteSpeed, WP Fastest Cache,
	 * Autoptimize, SG Optimizer, Comet, Cache Enabler), managed hosts (WP Engine,
	 * Kinsta, SiteGround, Pantheon), and CDNs (Cloudflare, BunnyCDN via plugins).
	 *
	 * @param int $post_id Optional page ID for targeted Elementor CSS rebuild.
	 */
	public static function purge_all_caches( $post_id = 0 ) {
		// --- Elementor CSS cache ------------------------------------------------
		if ( $post_id > 0 ) {
			self::refresh_elementor_files( $post_id );
			self::regenerate_page_css( $post_id );
		}
		self::regenerate_global_css();

		// --- WordPress object cache --------------------------------------------
		if ( function_exists( 'wp_cache_flush' ) ) {
			wp_cache_flush();
		}

		// --- WordPress transients + options cache ------------------------------
		self::flush_connector_transients();
		if ( function_exists( 'wp_cache_delete' ) ) {
			wp_cache_delete( 'alloptions', 'options' );
			wp_cache_delete( 'notoptions', 'options' );
		}

		// --- Page-cache plugins ------------------------------------------------
		if ( function_exists( 'rocket_clean_domain' ) ) {          // WP Rocket
			rocket_clean_domain();
		}
		if ( function_exists( 'w3tc_flush_all' ) ) {               // W3 Total Cache
			w3tc_flush_all();
		}
		if ( function_exists( 'wp_cache_clear_cache' ) ) {         // WP Super Cache
			wp_cache_clear_cache();
		}
		if ( class_exists( 'LiteSpeed\Purge' ) ) {                 // LiteSpeed Cache
			do_action( 'litespeed_purge_all' );
		}
		if ( function_exists( 'wpfc_clear_all_cache' ) ) {         // WP Fastest Cache
			wpfc_clear_all_cache( true );
		}
		if ( class_exists( 'autoptimizeCache' ) ) {                // Autoptimize
			\autoptimizeCache::clearall();
		}
		if ( function_exists( 'sg_cachepress_purge_cache' ) ) {    // SiteGround Optimizer
			sg_cachepress_purge_cache();
		}
		if ( class_exists( 'comet_cache' ) ) {                     // Comet Cache
			\comet_cache::clear();
		}
		if ( class_exists( 'Cache_Enabler' ) ) {                   // Cache Enabler
			\Cache_Enabler::clear_total_cache();
		}
		if ( has_action( 'cachify_flush_cache' ) ) {               // Cachify
			do_action( 'cachify_flush_cache' );
		}
		if ( has_action( 'swift_performance_after_clear_all_cache' ) || class_exists( 'Swift_Performance_Cache' ) && method_exists( 'Swift_Performance_Cache', 'clear_all_cache' ) ) {
			\Swift_Performance_Cache::clear_all_cache();          // Swift Performance
		}

		// --- Managed hosting caches --------------------------------------------
		if ( class_exists( 'WpeCommon' ) ) {                       // WP Engine
			if ( method_exists( 'WpeCommon', 'purge_memcached' ) ) {
				\WpeCommon::purge_memcached();
			}
			if ( method_exists( 'WpeCommon', 'clear_maxcdn_cache' ) ) {
				\WpeCommon::clear_maxcdn_cache();
			}
			if ( method_exists( 'WpeCommon', 'purge_varnish_cache' ) ) {
				\WpeCommon::purge_varnish_cache();
			}
		}
		if ( class_exists( '\Kinsta\Cache' ) ) {                   // Kinsta
			global $kinsta_cache;
			if ( isset( $kinsta_cache ) && isset( $kinsta_cache->kinsta_cache_purge ) && method_exists( $kinsta_cache->kinsta_cache_purge, 'purge_complete_caches' ) ) {
				$kinsta_cache->kinsta_cache_purge->purge_complete_caches();
			}
		}
		if ( function_exists( 'sb_purge_all' ) ) {                 // Servebolt
			sb_purge_all();
		}
		if ( defined( 'PANTHEON_CACHE_TRUE' ) && function_exists( 'pantheon_clear_edge_all' ) ) {
			pantheon_clear_edge_all();                            // Pantheon Advanced Page Cache
		}

		// --- CDN caches --------------------------------------------------------
		if ( has_action( 'cloudflare_purge_everything' ) ) {       // Cloudflare (official plugin)
			do_action( 'cloudflare_purge_everything' );
		}
		if ( class_exists( '\CF\WordPress\Hooks' ) ) {
			do_action( 'cloudflare_purge_everything' );
		}
		if ( function_exists( 'bunnycdn_purge_cache' ) ) {         // BunnyCDN
			bunnycdn_purge_cache();
		}

		// Generic hook so any third-party cache plugin can react.
		do_action( 'xxxv_purged_all_caches', $post_id );
	}

	/**
	 * Force refresh ALL caches for a page and report the outcome.
	 *
	 * Single public entry point that clears every layer: Elementor CSS (per-page
	 * + global rebuild), WordPress object/transient/options cache, all supported
	 * page-cache & hosting plugins, and CDN caches (Cloudflare, BunnyCDN). It also
	 * bumps a per-page cache-buster version so freshly enqueued CSS/JS carry a new
	 * query string, and sends no-cache HTTP headers when called mid-request so the
	 * client/browser layer refreshes too.
	 *
	 * @param int $post_id Page ID to refresh (0 = site-wide only).
	 * @return array { success:bool, post_id:int, cache_version:string, layers:string[] }
	 */
	public static function force_cache_refresh( $post_id ) {
		$post_id = absint( $post_id );
		$layers  = array();

		// --- Elementor CSS (per-page + global) ---------------------------------
		if ( $post_id > 0 ) {
			self::refresh_elementor_files( $post_id );
			self::regenerate_page_css( $post_id );
			self::clear_runtime_caches( $post_id );
			$layers[] = 'elementor_css';
		}

		// --- WordPress + plugin + hosting + CDN caches -------------------------
		self::purge_all_caches( $post_id );
		$layers[] = 'wordpress';
		$layers[] = 'plugins';
		$layers[] = 'cdn';

		// --- Cache-busting version bump ---------------------------------------
		$cache_version = (string) time();
		if ( $post_id > 0 ) {
			update_post_meta( $post_id, '_xxxv_cache_version', $cache_version );
		}
		update_option( 'xxxv_global_cache_version', $cache_version, false );
		$layers[] = 'cache_busting';

		// --- Browser cache: emit no-cache headers if still mid-request --------
		if ( ! headers_sent() ) {
			nocache_headers();
			header( 'Cache-Control: no-cache, no-store, must-revalidate, max-age=0' );
			header( 'Pragma: no-cache' );
			header( 'Expires: -1' );
			header( 'Surrogate-Control: no-store' );
			$layers[] = 'browser';
		}

		self::log( 'info', 'Forced full cache refresh.', array( 'post_id' => $post_id, 'cache_version' => $cache_version ) );

		return array(
			'success'       => true,
			'post_id'       => $post_id,
			'cache_version' => $cache_version,
			'layers'        => $layers,
		);
	}



	/**
	 * Delete connector-scoped transients (both site + network) so no stale
	 * critical-CSS / readiness values survive a publish.
	 */
	private static function flush_connector_transients() {
		global $wpdb;
		if ( ! isset( $wpdb ) ) {
			return;
		}
		$like = $wpdb->esc_like( '_transient_xxxv_' ) . '%';
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like ) );
		$like_to = $wpdb->esc_like( '_transient_timeout_xxxv_' ) . '%';
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like_to ) );
		if ( is_multisite() && isset( $wpdb->sitemeta ) ) {
			$s_like = $wpdb->esc_like( '_site_transient_xxxv_' ) . '%';
			$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE %s", $s_like ) );
		}
	}

	/**
	 * Emit no-cache / cache-busting HTTP headers on connector pages so browsers,
	 * proxies, and reverse caches always re-fetch the freshest styled markup.
	 * Hooked to `send_headers`.
	 */
	public static function send_no_cache_headers() {
		if ( is_admin() || headers_sent() ) {
			return;
		}
		if ( ! is_singular( 'page' ) ) {
			return;
		}
		$post_id = get_queried_object_id();
		if ( ! $post_id || ! self::is_connector_page( $post_id ) ) {
			return;
		}
		nocache_headers();
		header( 'Cache-Control: no-cache, no-store, must-revalidate, max-age=0' );
		header( 'Pragma: no-cache' );
		header( 'Expires: -1' );
		header( 'Surrogate-Control: no-store' );
		// Dynamic validators so intermediaries treat every render as fresh.
		$modified = get_post_modified_time( 'D, d M Y H:i:s', true, $post_id ) . ' GMT';
		header( 'Last-Modified: ' . $modified );
		header( 'ETag: "' . md5( (string) $post_id . '-' . get_post_modified_time( 'U', true, $post_id ) . '-' . wp_rand() ) . '"' );
	}

	/**
	 * Append a version query string to the connector template CSS/JS so a publish
	 * always cache-busts the asset URL. Hooked to `style_loader_src`.
	 *
	 * @param string $src    Stylesheet source URL.
	 * @param string $handle Stylesheet handle.
	 * @return string
	 */
	public static function version_bust_asset_src( $src, $handle = '' ) {
		if ( empty( $src ) || false === strpos( (string) $handle, 'xxxv' ) ) {
			return $src;
		}
		$ver = (string) time();
		return add_query_arg( 'xxxv_v', $ver, $src );
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
			self::refresh_elementor_files( $post_id );
			$ok = self::regenerate_page_css( $post_id );
			self::regenerate_global_css();
			$css_check = self::validate_generated_css( $post_id, is_string( get_post_meta( $post_id, '_xxxv_template_css', true ) ) && '' !== trim( get_post_meta( $post_id, '_xxxv_template_css', true ) ) );
			if ( is_wp_error( $css_check ) ) {
				return $css_check;
			}
			// Purge page/object/CDN caches so the freshly regenerated CSS goes live now.
			self::clear_runtime_caches( $post_id );
			return rest_ensure_response(
				array(
					'ok'      => $ok,
					'post_id' => $post_id,
					'css_url' => wp_upload_dir()['baseurl'] . '/elementor/css/post-' . $post_id . '.css',
				)
			);
		}

		// No id supplied: clear the whole CSS cache so it rebuilds on demand.
		if ( class_exists( '\Elementor\Plugin' ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
		}
		self::regenerate_global_css();
		return rest_ensure_response( array( 'ok' => true, 'scope' => 'all' ) );
	}

	/**
	 * REST endpoint: re-run the "Edit with Elementor" readiness check for an
	 * already-published post on demand, without republishing it.
	 *
	 * @param WP_REST_Request $request The request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function validate_editor( WP_REST_Request $request ) {
		if ( ! did_action( 'elementor/loaded' ) ) {
			return new WP_Error( 'xxxv_no_elementor', 'Elementor is not active.', array( 'status' => 400 ) );
		}

		$post_id = absint( $request->get_param( 'post_id' ) );
		if ( $post_id < 1 || ! get_post( $post_id ) ) {
			return new WP_Error( 'xxxv_bad_post', 'A valid post_id is required.', array( 'status' => 400 ) );
		}

		// Refresh Elementor files/CSS first so the check reflects current state.
		self::refresh_elementor_files( $post_id );

		$check = self::validate_editor_ready( $post_id );
		if ( is_wp_error( $check ) ) {
			return rest_ensure_response(
				array(
					'ok'               => true,
					'post_id'          => $post_id,
					'editor_ready'     => false,
					'editable_widgets' => 0,
					'edit_mode'        => get_post_meta( $post_id, '_elementor_edit_mode', true ),
					'reason'           => $check->get_error_message(),
				)
			);
		}

		return rest_ensure_response(
			array(
				'ok'               => true,
				'post_id'          => $post_id,
				'editor_ready'     => true,
				'editable_widgets' => isset( $check['widgets'] ) ? (int) $check['widgets'] : null,
				'edit_mode'        => isset( $check['edit_mode'] ) ? $check['edit_mode'] : null,
				'reason'           => null,
			)
		);
	}
}
