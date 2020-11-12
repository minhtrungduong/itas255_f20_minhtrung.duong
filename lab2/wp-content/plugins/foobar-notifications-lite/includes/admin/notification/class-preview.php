<?php
namespace FooPlugins\FooBar\Admin\Notification;

/**
 * FooBar Notification Admin Preview Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Admin\Notification\Preview' ) ) {

	class Preview {
		function __construct() {
			//enqueue assets needed for this metabox
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );

			//add a preview action for each row
			add_filter( 'post_row_actions', array( $this, 'modify_list_row_actions' ), 10, 2 );

			//ajax call for generating a foobar preview
			add_action( 'wp_ajax_foobar_admin_preview', array( $this, 'ajax_preview' ) );
		}

		/**
		 * Returns a preview of the foobar
		 */
		public function ajax_preview() {
			if ( check_admin_referer( 'foobar_admin_preview' ) ) {
				$id = $_POST['id'];
				foobar_render_bar( intval( $id ), array( 'preview' => true ) );
			}
			die();
		}

		/**
		 * Add a preview link to each notification
		 *
		 * @param $actions
		 * @param $post
		 *
		 * @return array
		 */
		function modify_list_row_actions( $actions, $post ) {
			if ( $post->post_type === FOOBAR_CPT_NOTIFICATION  ) {

				$has_edit = array_key_exists( 'edit', $actions );
				$has_trash = array_key_exists( 'trash', $actions );
				$has_preview = false;

				// The default $actions passed has the Edit, Quick-edit and Trash links.
				if ( $has_edit ) {
					$edit = $actions['edit'];
				}
				if ( $has_trash ) {
					$trash = $actions['trash'];
				}

				$bar = foobar_get_instance( $post );

				if ( $bar !== false ) {
					$preview = array(
						'foobar-preview' => sprintf( '<a class="foobar-admin-preview" data-foobar-id="%s" data-foobar-uid="%s" data-foobar-preview-nonce="%s" href="#preview">%s</a>',
							$bar->ID,
							$bar->unique_id(),
							wp_create_nonce( 'foobar_admin_preview' ),
							__( 'Preview', 'foobar' )
						)
					);

					$has_preview = true;
				}

				$actions = array();

				if ( $has_edit ) {
					$actions = array( 'edit' => $edit );
				}

				if ( $has_preview ) {
					$actions += $preview;
				}

				if ( $has_trash ) {
					$actions += array( 'trash' => $trash );
				}

				return $actions;
			}

			return $actions;
		}


		/***
		 * Enqueue the assets needed by the metabox
		 *
		 * @param $hook_suffix
		 */
		function enqueue_assets( $hook_suffix ) {
			if ( FOOBAR_CPT_NOTIFICATION === $this->get_admin_post_type() ) {
				// Register, enqueue scripts and styles here
				foobar_enqueue_stylesheet();
				foobar_enqueue_script();
			}
		}

		/**
		 * Returns the admin post type currently being viewed/edited
		 *
		 * @return string|null
		 */
		function get_admin_post_type() {
			global $post, $typenow, $current_screen, $pagenow;

			$post_type = null;

			if ( $post && ( property_exists( $post, 'post_type' ) || method_exists( $post, 'post_type' ) ) ) {
				$post_type = $post->post_type;
			}

			if ( empty( $post_type ) && ! empty( $current_screen ) && ( property_exists( $current_screen, 'post_type' ) || method_exists( $current_screen, 'post_type' ) ) && ! empty( $current_screen->post_type ) ) {
				$post_type = $current_screen->post_type;
			}

			if ( empty( $post_type ) && ! empty( $typenow ) ) {
				$post_type = $typenow;
			}

			if ( empty( $post_type ) && function_exists( 'get_current_screen' ) ) {
				$get_current_screen = get_current_screen();
				if ( property_exists( $get_current_screen, 'post_type' ) && ! empty( $get_current_screen->post_type ) ) {
					$post_type = $get_current_screen->post_type;
				}
			}

			if ( empty( $post_type ) && isset( $_REQUEST['post'] ) && ! empty( $_REQUEST['post'] ) && function_exists( 'get_post_type' ) && $get_post_type = get_post_type( (int) $_REQUEST['post'] ) ) {
				$post_type = $get_post_type;
			}

			if ( empty( $post_type ) && isset( $_REQUEST['post_type'] ) && ! empty( $_REQUEST['post_type'] ) ) {
				$post_type = sanitize_key( $_REQUEST['post_type'] );
			}

			if ( empty( $post_type ) && 'edit.php' == $pagenow ) {
				$post_type = 'post';
			}

			return $post_type;
		}
	}
}
