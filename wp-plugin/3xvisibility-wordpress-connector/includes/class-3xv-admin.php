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

		// Custom removal rules: extra handles or wildcard patterns to force-remove.
		$raw_rm  = isset( $_POST['xxxv_neutralize_removals'] ) ? wp_unslash( $_POST['xxxv_neutralize_removals'] ) : '';
		$parts_rm = preg_split( '/[\s,]+/', (string) $raw_rm );
		$removals = array();
		foreach ( (array) $parts_rm as $p ) {
			// Allow alphanumerics, dash, underscore and the "*" wildcard.
			$p = preg_replace( '/[^a-z0-9_*-]/', '', strtolower( trim( (string) $p ) ) );
			if ( '' !== $p ) {
				$removals[] = $p;
			}
		}
		$removals = array_values( array_unique( $removals ) );
		update_option( XXXV_CONNECTOR_OPT_NEUTRALIZE_REMOVALS, implode( "\n", $removals ) );

		wp_safe_redirect( admin_url( 'options-general.php?page=pgp-connector&css_saved=1' ) );
		exit;
	}

	public function render() {
		$key            = XXXV_Auth::get_key();
		$rest_url       = rest_url( XXXV_CONNECTOR_NS . '/' );
		$neutralize     = XXXV_Elementor::is_neutralization_enabled();
		$excludes_value = implode( "\n", XXXV_Elementor::neutralization_excludes() );
		$removals_value = implode( "\n", XXXV_Elementor::neutralization_custom_removals() );
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

			<hr />

			<h2>Theme CSS Neutralization</h2>
			<p class="description" style="max-width:640px;">
				On imported connector pages, the plugin dequeues the active theme's stylesheets and WordPress global/block styles so the imported template renders exactly as designed. Turn this off if you want the theme's CSS to remain, or keep specific stylesheets while neutralizing the rest.
			</p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="xxxv_save_css_settings" />
				<?php wp_nonce_field( 'xxxv_save_css_settings' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row">Neutralize theme CSS</th>
						<td>
							<label>
								<input type="checkbox" name="xxxv_neutralize" value="1" <?php checked( $neutralize ); ?> />
								Dequeue theme &amp; WordPress global styles on connector pages (recommended)
							</label>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="xxxv_neutralize_excludes">Keep these stylesheets</label></th>
						<td>
							<textarea id="xxxv_neutralize_excludes" name="xxxv_neutralize_excludes" rows="4" style="width:420px;font-family:monospace;" placeholder="e.g. my-theme-style&#10;woocommerce-general"><?php echo esc_textarea( $excludes_value ); ?></textarea>
							<p class="description">One WordPress style handle per line (or comma-separated). These are never dequeued even when neutralization is on.</p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="xxxv_neutralize_removals">Also remove these stylesheets</label></th>
						<td>
							<textarea id="xxxv_neutralize_removals" name="xxxv_neutralize_removals" rows="4" style="width:420px;font-family:monospace;" placeholder="e.g. my-plugin-css&#10;mytheme-*&#10;*-google-fonts"><?php echo esc_textarea( $removals_value ); ?></textarea>
							<p class="description">Custom removal rules: extra style handles to always dequeue on connector pages, in addition to the built-in popular-theme list. One handle per line (or comma-separated). Wildcards with <code>*</code> are supported (e.g. <code>mytheme-*</code>, <code>*-google-fonts</code>). The "Keep" list above always wins over these rules.</p>
						</td>
					</tr>
				</table>
				<?php submit_button( 'Save CSS Settings' ); ?>
			</form>
		</div>
		<?php
	}
}
