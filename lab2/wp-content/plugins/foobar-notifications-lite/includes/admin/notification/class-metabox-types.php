<?php

namespace FooPlugins\FooBar\Admin\Notification;

use FooPlugins\FooBar\Admin\FooFields\Metabox;

if ( ! class_exists( __NAMESPACE__ . '\MetaboxTypes' ) ) {

	class MetaboxTypes extends Metabox {

		function __construct() {
			parent::__construct(
				array(
					'post_type'      => FOOBAR_CPT_NOTIFICATION,
					'metabox_id'     => 'types',
					'metabox_title'  => __( 'What type of notification do you want to create?', 'foobar' ),
					'priority'       => 'high',
					'meta_key'       => FOOBAR_NOTIFICATION_META_TYPE,
					'text_domain'    => FOOBAR_SLUG,
					'plugin_url'     => FOOBAR_URL,
					'plugin_version' => FOOBAR_VERSION,
					'fields'         => array(
						'fields' => array(
							array(
								'id'      => 'type',
								'type'    => 'htmllist',
								'choices' => foobar_registered_bar_types()
							),
						)
					),
					'scripts'        => array(
						array(
							'handle' => 'foobar-notification',
							'src'    => FOOBAR_URL . 'assets/admin/js/notification.min.js',
							'deps'   => array( 'jquery' ),
							'ver'    => FOOBAR_VERSION
						)
					),
					'styles'         => array(
						array(
							'handle' => 'foobar-notification',
							'src'    => FOOBAR_URL . 'assets/admin/css/notification.min.css',
							'deps'   => array(),
							'ver'    => FOOBAR_VERSION
						)
					)
				)
			);

			add_action( 'admin_footer', array( $this, 'admin_footer' ) );

			//add_action()
			$this->add_action( 'enqueue_assets', array( $this, 'enqueue' ) );

			add_action( 'admin_head', array( $this, 'custom_css' ) );

			$this->add_filter( 'get_posted_data', array( $this, 'get_type' ), 10, 2 );

			add_filter( 'hidden_meta_boxes', array( $this, 'get_hidden_meta_boxes' ), 10, 3 );
		}


		/**
		 * Returns a list of all hidden metaboxes
		 *
		 * @param string[]  $hidden       An array of IDs of hidden meta boxes.
		 * @param WP_Screen $screen       WP_Screen object of the current screen.
		 * @param bool      $use_defaults Whether to show the default meta boxes.
		 *
		 * @return mixed
		 */
		function get_hidden_meta_boxes( $hidden, $screen, $use_defaults ) {
			if ( $this->is_admin_edit_mode() && $this->is_current_post_type() ) {

				$ensure_not_hidden = array(
					'foobar_notification-types',
					'foobar_notification-settings-message',
					'foobar_notification-settings-cta',
					'foobar_notification-settings-cookie'
				);

				foreach ( $ensure_not_hidden as $item ) {
					$key = array_search( $item, $hidden );
					if ( $key !== false ) {
						unset( $hidden[$key] );
					}
				}
			}

			return $hidden;
		}

		/**
		 * Return the data as a string and not an array
		 *
		 * @param $posted_data
		 * @param $metabox Metabox
		 *
		 * @return string
		 */
		function get_type( $posted_data, $metabox ) {
			global $foobar_admin_current_type;

			if ( array_key_exists( 'type', $posted_data ) ) {

				//the type has been set from the metabox
				$foobar_admin_current_type = $posted_data['type'];

			} else {

				//dealing with an existing bar, so get the type from post_meta, and ignore the metabox
				$foobar_admin_current_type = get_post_meta( $metabox->post_id, FOOBAR_NOTIFICATION_META_TYPE, true );

			}

			return $foobar_admin_current_type;
		}

		/**
		 * Render the FooBar to the footer
		 */
		function admin_footer() {
			global $post;

			if ( $this->is_admin_edit_mode() && $this->is_current_post_type() ) {
				foobar_render_bar( $post, array( 'preview' => true ) );
			}
		}

		/**
		 * Enqueue foobar assets
		 */
		function enqueue() {
			foobar_enqueue_script();
			foobar_enqueue_stylesheet();
		}

		/**
		 * Output some custom CSS to show and hide the settings metaboxes
		 */
		function custom_css() {
			$foobar = foobar_get_instance_admin();

			$registered_types = foobar_registered_bar_types();

			$metaboxes = array();

			foreach ( $registered_types as $type_key => $type ) {
				$metaboxes[$type_key] = '#foobar_notification-settings-' . $type_key;
			}

			if ( $foobar === false ) {
				//we need to hide all the settings metaboxes

				$metabox_css = implode(', ', $metaboxes ) . ' { display: none; }';

				echo "
    <style type='text/css'>
	    #foobar_notification-types {
			display: block;
	    }

	    {$metabox_css}
    </style>";

			} else {
				//get the type from the $foobar and only show that metabox

				if ( array_key_exists( $foobar->type(), $metaboxes ) ) {
					unset( $metaboxes[$foobar->type()] );
				}

				$metabox_css = implode(', ', $metaboxes ) . ' { display: none; }';

				echo "
    <style type='text/css'>
	    #foobar_notification-types {
			display: none;
	    }

	    {$metabox_css}
    </style>";
			}
		}
	}
}
