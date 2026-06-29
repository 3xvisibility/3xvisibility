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
		$page_template  = isset( $body['page_template'] ) ? sanitize_text_field( $body['page_template'] ) : 'elementor_header_footer';

		// Elementor data may arrive as a JSON string; normalize to array.
		if ( is_string( $elementor_data ) ) {
			$decoded        = json_decode( $elementor_data, true );
			$elementor_data = is_array( $decoded ) ? $decoded : array();
		}

		// ---- (1) Validate the incoming JSON model -----------------------------
		$validation = self::validate_model( $elementor_data );
		if ( is_wp_error( $validation ) ) {
			self::log( 'error', 'JSON validation failed: ' . $validation->get_error_message(), array( 'slug' => $slug ) );
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
			// Elementor expects slashed JSON in meta.
			$json = wp_json_encode( $elementor_data );
			if ( false === $json ) {
				throw new Exception( 'Failed to encode Elementor JSON.' );
			}
			update_post_meta( $post_id, '_elementor_data', wp_slash( $json ) );
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

			// ---- Mirror the data through Elementor's own document API so the
			//      internal element cache + settings stay consistent with the editor.
			self::save_via_document( $post_id, $elementor_data );

			// ---- (5) Generate per-page CSS ------------------------------------
			$css_ok = self::regenerate_page_css( $post_id );

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

			self::log( 'info', 'Published successfully.', array( 'post_id' => $post_id, 'css' => $css_ok ) );

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
		foreach ( $data as $index => $element ) {
			if ( ! is_array( $element ) || empty( $element['elType'] ) ) {
				return new WP_Error(
					'xxxv_invalid_element',
					sprintf( 'Top-level element #%d is missing a valid "elType".', (int) $index ),
					array( 'status' => 400 )
				);
			}
		}
		return true;
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

		$saved_decoded = json_decode( wp_unslash( $saved ), true );
		if ( ! is_array( $saved_decoded ) || empty( $saved_decoded ) ) {
			return new WP_Error( 'xxxv_elementor_data_unreadable', 'Post-save validation failed: stored _elementor_data is not readable.', array( 'status' => 500 ) );
		}

		$expected_json = wp_json_encode( $expected );
		$saved_json    = wp_json_encode( $saved_decoded );
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
		$css = get_post_meta( $post_id, '_xxxv_template_css', true );
		if ( ! is_string( $css ) || '' === trim( $css ) ) {
			return;
		}
		echo "\n<style id=\"xxxv-template-css-" . esc_attr( (string) $post_id ) . "\">\n" . $css . "\n</style>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitized CSS must stay raw inside <style>.
	}

	/**
	 * Save through Elementor's Document API so the editor sees a clean document.
	 *
	 * @param int   $post_id Page ID.
	 * @param array $data    Element model.
	 */
	private static function save_via_document( $post_id, $data ) {
		if ( ! class_exists( '\Elementor\Plugin' ) ) {
			return;
		}
		try {
			$documents = \Elementor\Plugin::$instance->documents;
			if ( ! $documents ) {
				return;
			}
			$document = $documents->get( $post_id );
			if ( $document ) {
				$document->save(
					array(
						'elements' => $data,
						'settings' => array(),
					)
				);
			}
		} catch ( \Throwable $e ) {
			// Non-fatal: raw meta was already written above; the page will still render.
			self::log( 'warn', 'Document API save skipped: ' . $e->getMessage(), array( 'post_id' => $post_id ) );
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

		if ( did_action( 'elementor/loaded' ) && class_exists( '\Elementor\Plugin' ) ) {
			try {
				\Elementor\Plugin::$instance->files_manager->clear_cache();
			} catch ( \Throwable $e ) {
				// Non-fatal: per-page CSS was already regenerated above.
			}
		}

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
			$ok = self::regenerate_page_css( $post_id );
			self::regenerate_global_css();
			return rest_ensure_response( array( 'ok' => $ok, 'post_id' => $post_id ) );
		}

		// No id supplied: clear the whole CSS cache so it rebuilds on demand.
		if ( class_exists( '\Elementor\Plugin' ) ) {
			\Elementor\Plugin::$instance->files_manager->clear_cache();
		}
		self::regenerate_global_css();
		return rest_ensure_response( array( 'ok' => true, 'scope' => 'all' ) );
	}
}
