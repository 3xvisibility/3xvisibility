<?php
/**
 * Authentication helper: validates the shared API key sent by the SaaS backend.
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Auth {

	/**
	 * Return the stored API key (or empty string).
	 */
	public static function get_key() {
		return (string) get_option( XXXV_CONNECTOR_OPT_KEY, '' );
	}

	/**
	 * Permission callback for protected REST routes.
	 *
	 * The SaaS backend must send the key in the `X-PGP-Key` header.
	 * Uses hash_equals to avoid timing attacks.
	 *
	 * @param WP_REST_Request $request The request.
	 * @return bool|WP_Error
	 */
	public static function check( WP_REST_Request $request ) {
		$stored = self::get_key();
		if ( empty( $stored ) ) {
			return new WP_Error(
				'xxxv_no_key',
				'Connector is not configured. Generate an API key in the plugin settings.',
				array( 'status' => 503 )
			);
		}

		$provided = (string) $request->get_header( 'x_pgp_key' );
		if ( empty( $provided ) ) {
			// Fallback: allow a Bearer token too.
			$auth = (string) $request->get_header( 'authorization' );
			if ( 0 === stripos( $auth, 'bearer ' ) ) {
				$provided = trim( substr( $auth, 7 ) );
			}
		}

		if ( empty( $provided ) || ! hash_equals( $stored, $provided ) ) {
			return new WP_Error(
				'xxxv_forbidden',
				'Invalid or missing API key.',
				array( 'status' => 401 )
			);
		}

		return true;
	}
}
