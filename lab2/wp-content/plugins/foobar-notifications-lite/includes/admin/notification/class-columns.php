<?php

namespace FooPlugins\FooBar\Admin\Notification;

/*
 * FooBar Notification Columns class
 */

use FooPlugins\FooBar\Objects\Bars\Bar;

if ( ! class_exists( __NAMESPACE__ . '\Columns' ) ) {

	class Columns {

		/**
		 * @var Bar|bool
		 */
		private $foobar = false;

		public function __construct() {
			add_filter( 'manage_' . FOOBAR_CPT_NOTIFICATION . '_posts_columns', array( $this, 'custom_columns' ) );
			add_action( 'manage_' . FOOBAR_CPT_NOTIFICATION . '_posts_custom_column', array( $this, 'custom_column_content' ), 10, 2 );
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		}

		/**
		 * Add custom columns to the notification CPT
		 *
		 * @param $columns
		 *
		 * @return array
		 */
		public function custom_columns( $columns ) {
			return array_slice( $columns, 0, 2, true ) +
				   array(
						   FOOBAR_CPT_NOTIFICATION . '_type' => __( 'Type', 'foobar' ),
						   FOOBAR_CPT_NOTIFICATION . '_visibility' => __( 'Visibility', 'foobar' ),
						   FOOBAR_CPT_NOTIFICATION . '_shortcode' => __( 'Shortcode', 'foobar' )
				   );
		}

		/**
		 * Get a locally stored version of the current bar
		 *
		 * @param $post
		 *
		 * @return bool|Bar
		 */
		private function get_local_bar( $post ) {
			if ( false === $this->foobar ) {
				$this->foobar = foobar_get_instance( $post );
			} else if ( $this->foobar->ID !== $post->ID) {
				$this->foobar = foobar_get_instance( $post );
			}

			return $this->foobar;
		}

		/**
		 * Get custom column content
		 *
		 * @param $column
		 *
		 * @return string
		 */
		public function custom_column_content( $column, $post_id ) {
			global $post;

			switch ( $column ) {
				case FOOBAR_CPT_NOTIFICATION . '_type':
					$bar = $this->get_local_bar( $post );
					if ( $bar instanceof Bar) {
						$types = foobar_registered_bar_types();
						$type = foobar_safe_get_from_array( $bar->type(), $types, array( 'label' => 'Unknown' ) );

						echo $type['label'];
					}
					break;
				case FOOBAR_CPT_NOTIFICATION . '_shortcode':
					$bar = $this->get_local_bar( $post );
					if ( $bar instanceof Bar) {
						$shortcode = $bar->shortcode();

						echo '<input type="text" readonly="readonly" size="' . strlen( $shortcode ) . '" value="' . esc_attr( $shortcode ) . '" class="foobar-shortcode" />';
						echo '<p class="foobar-shortcode-message">' . __( 'Shortcode copied to clipboard :)', 'foobar' ) . '</p>';
					}
					break;

				case FOOBAR_CPT_NOTIFICATION . '_visibility':
					$bar = $this->get_local_bar( $post );
					if ( $bar instanceof Bar) {
						$visibility = $bar->get_meta( 'visibility', '' );

						echo foobar_get_friendly_visibility( $visibility );
					}
					break;
			}
		}

		/**
		 * Enqueue scripts and styles
		 */
		public function enqueue_assets() {
			$get_current_screen = get_current_screen();
			if ( property_exists( $get_current_screen, 'post_type' ) && ! empty( $get_current_screen->post_type ) ) {
				if ( $get_current_screen->post_type === FOOBAR_CPT_NOTIFICATION ) {
					foobar_enqueue_script();
					wp_enqueue_script( 'foobar-notification', FOOBAR_URL . 'assets/admin/js/notification.min.js', array( 'foobar-core' ), FOOBAR_VERSION );

					foobar_enqueue_stylesheet();
					wp_enqueue_style( 'foobar-notification', FOOBAR_URL . 'assets/admin/css/notification.min.css', array('foobar-core'), FOOBAR_VERSION );
				}
			}
		}
	}
}
