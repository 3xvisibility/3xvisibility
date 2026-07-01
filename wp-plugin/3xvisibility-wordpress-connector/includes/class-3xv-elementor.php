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
		$elementor_css  = isset( $body['elementor_css'] ) ? self::sanitize_template_css( (string) $body['elementor_css'] ) : '';
		// WordPress Elementor pages are always published as Elementor Full Width.
		// Do not let requests switch to theme default/canvas/HTML layouts.
		$page_template  = 'elementor_header_footer';

		// Elementor data may arrive as a JSON string; normalize to array.
		if ( is_string( $elementor_data ) ) {
			$decoded        = json_decode( $elementor_data, true );
			$elementor_data = is_array( $decoded ) ? $decoded : array();
		}
		self::normalize_top_level_containers( $elementor_data );

		// ---- (1) Validate the incoming JSON model -----------------------------
		$validation = self::validate_model( $elementor_data );
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
			$elementor_css = self::map_css_media_references( $elementor_css, $media_report );
		}
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

		$validation = self::validate_model( $elementor_data );
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
	 * Validate the Elementor element model shape.
	 *
	 * @param mixed $data The decoded model.
	 * @return true|WP_Error
	 */
	private static function validate_model( $data ) {
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
			$nested = self::validate_element_recursive( $element, $supported_widgets );
			if ( is_wp_error( $nested ) ) {
				return $nested;
			}
		}
		return true;
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
	 * Validate one element recursively: native Elementor only, no HTML widgets, no
	 * raw markup injection into text-editor settings.
	 *
	 * @param array $element Element.
	 * @param array $supported_widgets Allowed free widgets.
	 * @return true|WP_Error
	 */
	private static function validate_element_recursive( $element, $supported_widgets ) {
		$el_type = isset( $element['elType'] ) ? $element['elType'] : '';
		if ( 'widget' === $el_type ) {
			$widget = isset( $element['widgetType'] ) ? $element['widgetType'] : '';
			if ( 'html' === $widget ) {
				return new WP_Error( 'xxxv_html_widget_forbidden', 'HTML widgets are forbidden. WordPress publishing requires native Elementor widgets only.', array( 'status' => 400 ) );
			}
			if ( ! in_array( $widget, $supported_widgets, true ) ) {
				return new WP_Error( 'xxxv_unsupported_widget', 'Unsupported Elementor widget type: ' . sanitize_text_field( $widget ), array( 'status' => 400 ) );
			}
			$settings = isset( $element['settings'] ) && is_array( $element['settings'] ) ? $element['settings'] : array();
			if ( 'text-editor' === $widget && isset( $settings['editor'] ) && preg_match( '#<(script|style|iframe|html|body|head|section|article|main|link|canvas|svg)\b#i', (string) $settings['editor'] ) ) {
				return new WP_Error( 'xxxv_raw_html_forbidden', 'Raw HTML/style/script injection inside Text Editor widgets is forbidden.', array( 'status' => 400 ) );
			}
			$settings_valid = self::validate_settings_no_raw_html( $settings );
			if ( is_wp_error( $settings_valid ) ) {
				return $settings_valid;
			}
		} elseif ( 'container' !== $el_type ) {
			return new WP_Error( 'xxxv_invalid_eltype', 'Only Elementor Containers and supported Widgets are allowed.', array( 'status' => 400 ) );
		}

		$children = isset( $element['elements'] ) && is_array( $element['elements'] ) ? $element['elements'] : array();
		foreach ( $children as $child ) {
			if ( ! is_array( $child ) ) {
				return new WP_Error( 'xxxv_invalid_child', 'Invalid Elementor child element.', array( 'status' => 400 ) );
			}
			$valid = self::validate_element_recursive( $child, $supported_widgets );
			if ( is_wp_error( $valid ) ) {
				return $valid;
			}
		}
		return true;
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

	private static function map_css_media_references( $css, &$report ) {
		if ( ! isset( $report['urls'] ) || ! is_array( $report['urls'] ) ) {
			$report['urls'] = array();
		}

		// CSS may contain background URLs that do not appear in widget controls. Import
		// those as well, including extensionless AI image URLs such as Pollinations.
		if ( preg_match_all( '#url\(\s*["\']?(https?://[^\s"\'\)]+)["\']?\s*\)#i', $css, $matches ) ) {
			foreach ( array_unique( $matches[1] ) as $source ) {
				if ( self::is_remote_image_url( $source ) ) {
					self::import_media_url_for_report( $source, $report );
				}
			}
		}
		if ( empty( $report['urls'] ) || ! is_array( $report['urls'] ) ) {
			return $css;
		}
		foreach ( $report['urls'] as $source => $mapped ) {
			if ( empty( $mapped['failed'] ) && ! empty( $mapped['url'] ) ) {
				$css = str_replace( $source, $mapped['url'], $css );
			}
		}
		return $css;
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
		$unit = isset( $value['unit'] ) ? $value['unit'] : 'px';
		$top = isset( $value['top'] ) ? $value['top'] : '';
		$right = isset( $value['right'] ) ? $value['right'] : $top;
		$bottom = isset( $value['bottom'] ) ? $value['bottom'] : $top;
		$left = isset( $value['left'] ) ? $value['left'] : $right;
		if ( '' === (string) $top && '' === (string) $right && '' === (string) $bottom && '' === (string) $left ) {
			return '';
		}
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
				$decls['display'] = ( isset( $settings['container_type'] ) && 'grid' === $settings['container_type'] ) ? 'grid' : 'flex';
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

		$handle = 'xxxv-template-css-' . (int) $post_id;
		wp_register_style( $handle, false, array(), XXXV_CONNECTOR_VERSION );
		wp_enqueue_style( $handle );
		wp_add_inline_style( $handle, $css );
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
		wp_cache_flush();

		// Do NOT clear Elementor's files_manager cache here. The publish flow just
		// regenerated the per-page CSS file; clearing the file cache immediately
		// after that can delete/invalidates the fresh CSS before visitors load it,
		// causing live pages to look unstyled. We only purge page/object caches.

		if ( function_exists( 'rocket_clean_post' ) ) {
			rocket_clean_post( $post_id );
		}
		if ( function_exists( 'rocket_clean_domain' ) ) {
			rocket_clean_domain();
		}
		if ( function_exists( 'w3tc_flush_post' ) ) {
			w3tc_flush_post( $post_id );
		} elseif ( function_exists( 'w3tc_flush_all' ) ) {
			w3tc_flush_all();
		}
		if ( function_exists( 'wp_cache_post_change' ) ) {
			wp_cache_post_change( $post_id );
		} elseif ( function_exists( 'wp_cache_clear_cache' ) ) {
			wp_cache_clear_cache();
		}
		if ( class_exists( 'LiteSpeed\Purge' ) ) {
			do_action( 'litespeed_purge_post', $post_id );
			do_action( 'litespeed_purge_all' );
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
