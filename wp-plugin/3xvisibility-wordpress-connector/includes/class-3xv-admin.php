<?php
/**
 * Admin settings screen: shows the connection URL + API key the user pastes
 * into the 3xVisibility, with a one-click regenerate.
 *
 * @package 3xVisibilityConnector
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class XXXV_Admin {

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_post_xxxv_regenerate_key', array( $this, 'regenerate_key' ) );
		add_action( 'admin_post_xxxv_save_css_settings', array( $this, 'save_css_settings' ) );
	}

	public function menu() {
		add_options_page(
			'3xVisibility WordPress Connector',
			'3xVisibility WordPress Connector',
			'manage_options',
			'pgp-connector',
			array( $this, 'render' )
		);
	}

	public function regenerate_key() {
		if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'xxxv_regenerate_key' ) ) {
			wp_die( 'Not allowed.' );
		}
		update_option( XXXV_CONNECTOR_OPT_KEY, wp_generate_password( 48, false, false ) );
		wp_safe_redirect( admin_url( 'options-general.php?page=pgp-connector&regenerated=1' ) );
		exit;
	}

	public function save_css_settings() {
		if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'xxxv_save_css_settings' ) ) {
			wp_die( 'Not allowed.' );
		}
		$enabled = isset( $_POST['xxxv_neutralize'] ) ? '1' : '0';
		update_option( XXXV_CONNECTOR_OPT_NEUTRALIZE, $enabled );

		$raw = isset( $_POST['xxxv_neutralize_excludes'] ) ? wp_unslash( $_POST['xxxv_neutralize_excludes'] ) : '';
		// Sanitize to a clean newline-separated list of style handles.
		$parts   = preg_split( '/[\s,]+/', (string) $raw );
		$handles = array();
		foreach ( (array) $parts as $p ) {
			$p = sanitize_key( strtolower( trim( (string) $p ) ) );
			if ( '' !== $p ) {
				$handles[] = $p;
			}
		}
		$handles = array_values( array_unique( $handles ) );
		update_option( XXXV_CONNECTOR_OPT_NEUTRALIZE_EXCLUDES, implode( "\n", $handles ) );

		wp_safe_redirect( admin_url( 'options-general.php?page=pgp-connector&css_saved=1' ) );
		exit;
	}

	public function render() {
		$key            = XXXV_Auth::get_key();
		$rest_url       = rest_url( XXXV_CONNECTOR_NS . '/' );
		$neutralize     = XXXV_Elementor::is_neutralization_enabled();
		$excludes_value = implode( "\n", XXXV_Elementor::neutralization_excludes() );
		?>
		<div class="wrap">
			<h1>3xVisibility WordPress Connector</h1>
			<p>Connect this site to your 3xVisibility account. Copy the values below into the SaaS when adding this website.</p>

			<?php if ( isset( $_GET['regenerated'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>A new API key was generated. Update it in your 3xVisibility account.</p></div>
			<?php endif; ?>
			<?php if ( isset( $_GET['css_saved'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>Theme-CSS settings saved.</p></div>
			<?php endif; ?>

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">Site URL</th>
					<td><code><?php echo esc_html( home_url() ); ?></code></td>
				</tr>
				<tr>
					<th scope="row">Connector REST URL</th>
					<td><code><?php echo esc_html( $rest_url ); ?></code></td>
				</tr>
				<tr>
					<th scope="row">API Key</th>
					<td>
						<input type="text" readonly value="<?php echo esc_attr( $key ); ?>" style="width:420px;font-family:monospace;" onclick="this.select();" />
						<p class="description">Send this as the <code>X-PGP-Key</code> header. Keep it secret.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Status</th>
					<td>
						<?php echo did_action( 'elementor/loaded' ) ? '✅ Elementor detected' : '⚠️ Elementor not active (Gutenberg still works)'; ?>
					</td>
				</tr>
			</table>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="xxxv_regenerate_key" />
				<?php wp_nonce_field( 'xxxv_regenerate_key' ); ?>
				<?php submit_button( 'Regenerate API Key', 'secondary' ); ?>
			</form>
		</div>
		<?php
	}
}
