<?php
/**
 * Lightweight self-updater.
 *
 * Checks a JSON manifest hosted by 3xVisibility and lets WordPress offer a
 * one-click update from the Plugins screen — no marketplace required.
 *
 * Manifest format (XXXV_CONNECTOR_UPDATE_URL):
 * {
 *   "version": "1.1.0",
 *   "download_url": "https://3xvisibility.com/wp-plugin/3xvisibility-connector.zip",
 *   "tested": "6.6",
 *   "requires": "5.8",
 *   "requires_php": "7.4"
 * }
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Updater {

	private $slug;
	private $basename;

	public function __construct() {
		$this->basename = plugin_basename( XXXV_CONNECTOR_FILE );
		$this->slug     = dirname( $this->basename );
		add_filter( 'pre_set_site_transient_update_plugins', array( $this, 'check_update' ) );
		add_filter( 'plugins_api', array( $this, 'plugin_info' ), 20, 3 );
	}

	private function fetch_manifest() {
		$cached = get_transient( 'xxxv_connector_manifest' );
		if ( false !== $cached ) {
			return $cached;
		}
		$res = wp_remote_get( XXXV_CONNECTOR_UPDATE_URL, array( 'timeout' => 10 ) );
		if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
			set_transient( 'xxxv_connector_manifest', array(), HOUR_IN_SECONDS );
			return array();
		}
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		$data = is_array( $data ) ? $data : array();
		set_transient( 'xxxv_connector_manifest', $data, 6 * HOUR_IN_SECONDS );
		return $data;
	}

	public function check_update( $transient ) {
		if ( empty( $transient->checked ) ) {
			return $transient;
		}
		$manifest = $this->fetch_manifest();
		if ( empty( $manifest['version'] ) || empty( $manifest['download_url'] ) ) {
			return $transient;
		}
		if ( version_compare( $manifest['version'], XXXV_CONNECTOR_VERSION, '>' ) ) {
			$transient->response[ $this->basename ] = (object) array(
				'slug'        => $this->slug,
				'plugin'      => $this->basename,
				'new_version' => $manifest['version'],
				'package'     => $manifest['download_url'],
				'tested'      => isset( $manifest['tested'] ) ? $manifest['tested'] : '',
				'requires'    => isset( $manifest['requires'] ) ? $manifest['requires'] : '',
				'url'         => 'https://3xvisibility.com',
			);
		}
		return $transient;
	}

	public function plugin_info( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || empty( $args->slug ) || $args->slug !== $this->slug ) {
			return $result;
		}
		$manifest = $this->fetch_manifest();
		if ( empty( $manifest['version'] ) ) {
			return $result;
		}
		return (object) array(
			'name'          => '3xVisibility WordPress Connector',
			'slug'          => $this->slug,
			'version'       => $manifest['version'],
			'author'        => '3xVisibility',
			'homepage'      => 'https://3xvisibility.com',
			'download_link' => $manifest['download_url'],
			'tested'        => isset( $manifest['tested'] ) ? $manifest['tested'] : '',
			'requires'      => isset( $manifest['requires'] ) ? $manifest['requires'] : '',
			'requires_php'  => isset( $manifest['requires_php'] ) ? $manifest['requires_php'] : '7.4',
			'sections'      => array(
				'description' => 'Secure companion plugin for the 3xVisibility SaaS.',
			),
		);
	}
}
