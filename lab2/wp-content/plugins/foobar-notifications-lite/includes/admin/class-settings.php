<?php
namespace FooPlugins\FooBar\Admin;

use FooPlugins\FooBar\Admin\FooFields\SettingsPage;

/**
 * FooBar Admin Settings Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Admin\Settings' ) ) {

	class Settings extends SettingsPage {

		public function __construct() {
			$general_tab = array(
				'id'     => 'general',
				'label'  => __( 'General', 'foobar' ),
				'icon'   => 'dashicons-admin-settings',
				'fields' => array(
					array(
							'id'       => 'always_enqueue',
							'type'     => 'checkbox',
							'label'    => __( 'Always Enqueue Assets', 'foobar' ),
							'desc'     => __( 'By default, FooBar javascript and stylesheet assets are only enqueued in your pages when needed. Some themes always need these assets in order to function.', 'foobar' )
					),
					array(
							'id'       => 'debug',
							'type'     => 'checkbox',
							'label'    => __( 'Enable Debug Mode', 'foobar' ),
							'desc'     => __( 'Helps to debug problems and diagnose issues. Enable debugging if you need support for an issue you are having.', 'foobar' )
					)
				)
			);

			$advanced_tab = array(
				'id'     => 'advanced',
				'label'  => __( 'Advanced', 'foobar' ),
				'icon'   => 'dashicons-admin-generic',
				'fields' => array(
					array(
						'id'       => 'demo_content',
						'type'     => 'checkbox',
						'label'    => __( 'Demo Content Created', 'foobar' ),
						'desc'     => __( 'If the demo content has been created, then this will be checked. You can uncheck this to allow for demo content to be created again.', 'foobar' )
					)
				)
			);

			$system_info_tab = array(
				'id'     => 'systeminfo',
				'label'  => __( 'System Info', 'foobar' ),
				'icon'   => 'dashicons-info',
				'fields' => array(
					array(
						'id'       => 'systeminfoheading',
						'label'    => __( 'Your System Information', 'foobar' ),
						'desc'     => __( 'The below system info can be used when submitting a support ticket, to help us replicate your environment.', 'foobar' ),
						'type'     => 'heading',
					),
					array(
						'id'       => 'systeminfodetail',
						'layout'   => 'inline',
						'type'     => 'system_info',
						'render' => array( $this, 'render_system_info' )
					)
				)
			);

			$field_group = array(
				'tabs' => array(
					$general_tab,
					$advanced_tab,
					$system_info_tab,
				)
			);

			parent::__construct(
				array(
					'settings_id'     => 'foobar',
					'page_title'  => __( 'FooBar Settings', 'foobar' ),
					'menu_title' => __('Settings', 'foobar'),
					'menu_parent_slug' => foobar_get_menu_parent_slug(),
					'text_domain'    => FOOBAR_SLUG,
					'plugin_url'     => FOOBAR_URL,
					'plugin_version' => FOOBAR_VERSION,
					'layout'         => 'foofields-tabs-horizontal',
					'fields'         => $field_group
				)
			);
		}

		/**
		 * Render some system info
		 *
		 * @param $field
		 */
		function render_system_info( $field ) {
			global $wp_version;

			$current_theme = wp_get_theme();

			$settings = foobar_get_settings();

			//get all activated plugins
			$plugins = array();
			foreach ( get_option('active_plugins') as $plugin_slug => $plugin ) {
				$plugins[] = $plugin;
			}

			$debug_info = array(
				__( 'FooBar version', 'foobar' )  			=> FOOBAR_VERSION,
				__( 'WordPress version', 'foobar' )   			=> $wp_version,
				__( 'Activated Theme', 'foobar' )     			=> $current_theme['Name'],
				__( 'WordPress URL', 'foobar' )       			=> get_site_url(),
				__( 'PHP version', 'foobar' )         			=> phpversion(),
				__( 'Settings', 'foobar' )            			=> $settings,
				__( 'Active Plugins', 'foobar' )      			=> $plugins
			);
?>
	<style>
		.foobar-debug {
			width: 100%;
			font-family: "courier new";
			height: 500px;
		}
	</style>
	<textarea class="foobar-debug"><?php foreach ( $debug_info as $key => $value ) {
		echo esc_html( $key ) . ' : ';
		print_r( $value );
		echo "\n";
	} ?></textarea>
	<?php
		}
	}
}
