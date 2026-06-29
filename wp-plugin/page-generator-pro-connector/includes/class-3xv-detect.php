<?php
/**
 * Builder + theme detection so the SaaS can pick the right publishing path
 * (native Elementor vs Gutenberg) and adapt to the active theme.
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Detect {

	public static function detect() {
		$theme = wp_get_theme();

		$elementor_active     = did_action( 'elementor/loaded' ) ? true : is_plugin_active_safe( 'elementor/elementor.php' );
		$elementor_pro_active = is_plugin_active_safe( 'elementor-pro/elementor-pro.php' );
		$elementor_version    = defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : null;

		$is_block_theme = function_exists( 'wp_is_block_theme' ) ? wp_is_block_theme() : false;

		// Resolve container width / global colors from Elementor kit when present.
		$container_width = null;
		$global_colors   = array();
		if ( $elementor_active && class_exists( '\Elementor\Plugin' ) ) {
			$kit_id = get_option( 'elementor_active_kit' );
			if ( $kit_id ) {
				$kit_settings = get_post_meta( $kit_id, '_elementor_page_settings', true );
				if ( is_array( $kit_settings ) ) {
					if ( isset( $kit_settings['container_width']['size'] ) ) {
						$container_width = (int) $kit_settings['container_width']['size'];
					}
					if ( ! empty( $kit_settings['system_colors'] ) && is_array( $kit_settings['system_colors'] ) ) {
						foreach ( $kit_settings['system_colors'] as $c ) {
							if ( ! empty( $c['color'] ) ) {
								$global_colors[] = array(
									'id'    => isset( $c['_id'] ) ? $c['_id'] : '',
									'title' => isset( $c['title'] ) ? $c['title'] : '',
									'value' => $c['color'],
								);
							}
						}
					}
				}
			}
		}

		return rest_ensure_response(
			array(
				'recommended_builder' => $elementor_active ? 'elementor' : 'gutenberg',
				'elementor'           => array(
					'active'          => (bool) $elementor_active,
					'pro'             => (bool) $elementor_pro_active,
					'version'         => $elementor_version,
					'container_width' => $container_width,
					'global_colors'   => $global_colors,
				),
				'gutenberg'           => array(
					'active'         => true, // Core block editor is always available.
					'is_block_theme' => (bool) $is_block_theme,
				),
				'theme'               => array(
					'name'     => $theme->get( 'Name' ),
					'slug'     => $theme->get_stylesheet(),
					'template' => $theme->get_template(),
					'version'  => $theme->get( 'Version' ),
					'is_block' => (bool) $is_block_theme,
				),
			)
		);
	}
}

/**
 * is_plugin_active is only loaded in admin; provide a safe front-end check.
 */
function is_plugin_active_safe( $plugin ) {
	$active = (array) get_option( 'active_plugins', array() );
	if ( in_array( $plugin, $active, true ) ) {
		return true;
	}
	if ( is_multisite() ) {
		$network = (array) get_site_option( 'active_sitewide_plugins', array() );
		if ( isset( $network[ $plugin ] ) ) {
			return true;
		}
	}
	return false;
}
