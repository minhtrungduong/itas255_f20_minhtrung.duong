<?php
namespace FooPlugins\FooBar\PostTypes;

/*
 * Notification Custom Post Type
 */

if ( ! class_exists( 'FooPlugins\FooBar\PostTypes\Notification' ) ) {

	class Notification {

		function __construct() {
			//register the post types
			add_action( 'init', array( $this, 'register' ) );
		}

		function register() {
			//allow others to override the Notification post type register args
			//see all available args : https://developer.wordpress.org/reference/functions/register_post_type/
			$args = apply_filters( 'foobar_posttypes_notification_registerargs',
				array(
					'labels'        => array(
						'name'               => __( 'Notifications', 'foobar' ),
						'singular_name'      => __( 'Notification', 'foobar' ),
						'add_new'            => __( 'Add Notification', 'foobar' ),
						'add_new_item'       => __( 'Add New Notification', 'foobar' ),
						'edit_item'          => __( 'Edit Notification', 'foobar' ),
						'new_item'           => __( 'New Notification', 'foobar' ),
						'view_item'          => __( 'View Notifications', 'foobar' ),
						'search_items'       => __( 'Search Notifications', 'foobar' ),
						'not_found'          => __( 'No Notifications found', 'foobar' ),
						'not_found_in_trash' => __( 'No Notifications found in Trash', 'foobar' ),
						'menu_name'          => __( 'FooBar', 'foobar' ),
						'all_items'          => __( 'Notifications', 'foobar' )
					),
					'hierarchical'  => false,
					'public'        => false,
					'rewrite'       => false,
					'show_ui'       => true,
					'show_in_menu'  => true,
					'menu_icon'     => 'dashicons-megaphone',
					'supports'      => array( 'title' ),
				)
			);

			register_post_type( FOOBAR_CPT_NOTIFICATION, $args );
		}
	}
}
