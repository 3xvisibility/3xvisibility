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
		// Keep the extracted folder name stable so WordPress does not deactivate
		// the plugin after an auto-update (manifest zips can unzip into a
		// differently named folder).
		add_filter( 'upgrader_source_selection', array( $this, 'fix_source_dir' ), 10, 4 );
		// After any plugin update, drop the cached manifest so the next check is fresh.
		add_action( 'upgrader_process_complete', array( $this, 'clear_manifest_cache' ), 10, 2 );
		// Add a "Check for updates" action link on the Plugins screen.
		add_filter( 'plugin_action_links_' . $this->basename, array( $this, 'action_links' ) );
		add_action( 'admin_init', array( $this, 'maybe_force_check' ) );
		// Enable auto-updates for this plugin by default.
		add_filter( 'auto_update_plugin', array( $this, 'enable_auto_update' ), 10, 2 );
	}

	/**
	 * Turn on WordPress background auto-updates for this plugin.
	 */
	public function enable_auto_update( $update, $item ) {
		if ( isset( $item->plugin ) && $item->plugin === $this->basename ) {
			return true;
		}
		return $update;
	}

	/**
	 * Force WordPress to re-check for updates when the user clicks our link.
	 */
	public function maybe_force_check() {
		if ( isset( $_GET['xxxv_check_update'] ) && current_user_can( 'update_plugins' ) ) {
			check_admin_referer( 'xxxv_check_update' );
			$this->clear_manifest_cache();
			delete_site_transient( 'update_plugins' );
			wp_safe_redirect( self_admin_url( 'plugins.php' ) );
			exit;
		}
	}

	/**
	 * "Check for updates" link under the plugin row.
	 */
	public function action_links( $links ) {
		$url = wp_nonce_url( self_admin_url( 'plugins.php?xxxv_check_update=1' ), 'xxxv_check_update' );
		$links[] = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Check for updates', '3xvisibility-wordpress-connector' ) . '</a>';
		return $links;
	}

	/**
	 * Clear cached manifest so a new version is detected immediately.
	 */
	public function clear_manifest_cache( $upgrader = null, $data = null ) {
		delete_transient( 'xxxv_connector_manifest' );
	}

	/**
	 * Ensure the unzipped directory is renamed to the plugin slug so the update
	 * replaces the existing plugin in place (prevents post-update deactivation).
	 */
	public function fix_source_dir( $source, $remote_source, $upgrader, $args = array() ) {
		global $wp_filesystem;
		if ( empty( $args['plugin'] ) || $args['plugin'] !== $this->basename ) {
			return $source;
		}
		$desired = trailingslashit( $remote_source ) . $this->slug;
		if ( untrailingslashit( $source ) === untrailingslashit( $desired ) ) {
			return $source;
		}
		if ( $wp_filesystem && $wp_filesystem->move( untrailingslashit( $source ), untrailingslashit( $desired ) ) ) {
			return trailingslashit( $desired );
		}
		return $source;
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
		set_transient( 'xxxv_connector_manifest', $data, HOUR_IN_SECONDS );
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
