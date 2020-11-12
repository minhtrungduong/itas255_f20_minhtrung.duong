<?php
namespace FooPlugins\FooBar\Admin;

/**
 * FooBar Help Page Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Admin\Help' ) ) {

	class Help {

		public function __construct() {
			add_action( 'admin_menu', array( $this, 'add_menu' ) );
			//add_action( 'admin_enqueue_scripts', array( $this, 'add_admin_stylesheet' ) );

			//ajax call for generating demo content
			add_action( 'wp_ajax_foobar_admin_import_demos', array( $this, 'import_demos' ) );

			//ajax call for showing demo foobar
			add_action( 'wp_ajax_foobar_admin_help_demo', array( $this, 'render_demo' ) );
		}

		/**
		 * Add menu to the tools menu
		 */
		public function add_menu() {
			add_submenu_page(
				foobar_get_menu_parent_slug(),
				__( 'FooBar Help' , 'foobar' ),
				__( 'Help' , 'foobar' ),
				'manage_options',
				'foobar-help',
				array( $this, 'render_page' )
			);
		}

		/**
		 * Renders the contents of the page
		 */
		public function render_page() {
			require_once FOOBAR_PATH . 'includes/admin/views/help.php';
		}

		/**
		 * Create the demos by inserting notifications posts
		 */
		function import_demos() {
			if ( check_admin_referer( 'foobar_admin_import_demos' ) ) {
				$demo_content = foobar_get_admin_demo_content();

				$count = 0;

				foreach ( $demo_content as $demo ) {
					//create the post
					$error = wp_insert_post( $demo, true );

					if ( !is_wp_error( $error ) ) {
						$count++;
					}
				}

				foobar_set_setting( 'demo_content', 'on' );

				echo sprintf( __( '%s demos created successfully', 'foobar' ), $count );
			}
			die();
		}

		function render_demo() {
			if ( check_admin_referer( 'foobar_admin_help_demo' ) ) {
				$foobar_demo_id = $_POST['demo'];

				$demo_content = foobar_get_admin_demo_content();

				foreach ( $demo_content as $demo ) {
					if ( $demo['foobar_demo_id'] === $foobar_demo_id ) {

						$args = array(
							'type' => $demo['meta_input'][FOOBAR_NOTIFICATION_META_TYPE],
							'meta' => $demo['meta_input'][FOOBAR_NOTIFICATION_META_SETTINGS],
							'preview' => true
						);

						//create a bar in memory
						$post = new \WP_Post( $demo );
						$post->ID = 'foobar_demo_' . $foobar_demo_id;

						foobar_render_bar( $post, $args );
					}
				}
			}
		}
	}
}
