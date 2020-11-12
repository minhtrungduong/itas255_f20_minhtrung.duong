<?php

namespace FooPlugins\FooBar\Admin\Notification;

use FooPlugins\FooBar\Admin\FooFields\Metabox;
use FooPlugins\FooBar\Enqueue;

if ( ! class_exists( __NAMESPACE__ . '\MetaboxSettings' ) ) {

	abstract class MetaboxSettings extends Metabox {

		function __construct( $config ) {
			parent::__construct( $config );
			$this->add_filter( 'can_save', array( $this, 'can_save_meta' ), 10, 2 );
			$this->add_filter( 'after_save_post_meta', array( $this, 'update_enqueue_cache' ), 10, 2 );
		}

		/**
		 * Updates the enqueue cache for the front-end
		 *
		 * @param $post_id
		 * @param $state
		 */
		function update_enqueue_cache( $post_id, $state ) {
			Enqueue::instance()->rebuild_cache();
		}

		/**
		 * Determines if the metabox can save it's data based on the type
		 *
		 * @param $can_save
		 * @param $metabox
		 *
		 * @return bool
		 */
		function can_save_meta( $can_save, $metabox ) {
			global $foobar_admin_current_type;

			if ( !empty( $foobar_admin_current_type ) ) {

				$metabox_id = 'settings-' . $foobar_admin_current_type;

				return ( $metabox_id === $this->config['metabox_id'] );
			}

			return false;
		}

		function get_layout_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_layout_choices', array(
				'fbr-layout-top' => array(
					'label'   => __( 'Top', 'foobar' ),
					'tooltip' => __( 'Shows a sticky bar at the top of the page', 'foobar' )
				),
				'fbr-layout-top-inline' => array(
					'label'   => __( 'Top (Scrolls)', 'foobar' ),
					'tooltip' => __( 'Shows a top bar that will scroll with the page', 'foobar' )
				),
				'fbr-layout-bottom'     => array(
					'label'   => __( 'Bottom', 'foobar' ),
					'tooltip' => __( 'Shows a sticky bar along the bottom of the page', 'foobar' ),
				),
//				'fbr-layout-left'     => array(
//					'label'   => __( 'Left', 'foobar' ),
//					'tooltip' => __( 'Shows the bar along the left of the page', 'foobar' ),
//				),
//				'fbr-layout-right'     => array(
//					'label'   => __( 'Right', 'foobar' ),
//					'tooltip' => __( 'Shows the bar along the right of the page', 'foobar' ),
//				),
//				'fbr-layout-inline'     => array(
//					'label'   => __( 'Inline', 'foobar' ),
//					'tooltip' => __( 'Shows the bar inline in the page where the short code was placed', 'foobar' ),
//				)
			) );
		}

		function get_layout_push_choices(){
			return apply_filters( 'foobar_admin_notification_metaboxsettings_layout_push_choices', array(
				'yes' => array(
					'label'   => __( 'Yes', 'foobar' ),
					'tooltip' => __( 'The bar will push the page to try avoid hiding content', 'foobar' )
				),
				'no' => array(
					'label'   => __( 'No', 'foobar' ),
					'tooltip' => __( 'The bar is simply positioned within the page and may overlap content', 'foobar' )
				)
			) );
		}

		function get_transition_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_transition_choices', array(
				'fbr-transition-slide' => array(
					'label'   => __( 'Slide', 'foobar' ),
					'tooltip' => __( 'A slide animation is used when opening or closing the bar', 'foobar' )
				),
				'fbr-transition-fade' => array(
					'label'   => __( 'Fade', 'foobar' ),
					'tooltip' => __( 'A fade animation is used when opening or closing the bar', 'foobar' )
				),
				'fbr-transition-slide-fade' => array(
					'label'   => __( 'Slide + Fade', 'foobar' ),
					'tooltip' => __( 'The bar will slide and fade at the same time', 'foobar' )
				),
				''     => array(
					'label'   => __( 'None', 'foobar' ),
					'tooltip' => __( 'No transition is used - it is immediate', 'foobar' ),
				)
			) );
		}

		function get_color_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_color_choices', array(
				'fbr-blue' => array(
					'label'   => __( 'Blue', 'foobar' ),
					'html'    => '<span style="background-color:#63aeff"></span>'
				),
				'fbr-green'     => array(
					'label'   => __( 'Green', 'foobar' ),
					'html'    => '<span style="background-color:#51cb94"></span>'
				),
				'fbr-purple'     => array(
					'label'   => __( 'Purple', 'foobar' ),
					'html'    => '<span style="background-color:#b479f2"></span>'
				),
				'fbr-red'     => array(
					'label'   => __( 'Red', 'foobar' ),
					'html'    => '<span style="background-color:#ff716d"></span>'
				),
				'fbr-orange'     => array(
					'label'   => __( 'Orange', 'foobar' ),
					'html'    => '<span style="background-color:#fea76d"></span>'
				),
				'fbr-yellow'     => array(
					'label'   => __( 'Yellow', 'foobar' ),
					'html'    => '<span style="background-color:#fbdc70"></span>'
				),
				'fbr-dark'     => array(
					'label'   => __( 'Dark', 'foobar' ),
					'html'    => '<span style="background-color:#333"></span>'
				),
				'fbr-light'     => array(
					'label'   => __( 'Light', 'foobar' ),
					'html'    => '<span style="background-color:#eee"></span>'
				)
			) );
		}

		function get_toggle_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_toggle_choices', array(
				'fbr-toggle-default' => array(
					'label'   => __( 'Square', 'foobar' ),
					'tooltip' => __( 'The default toggle button shape, which is square', 'foobar' )
				),
				'fbr-toggle-circle'     => array(
					'label'   => __( 'Circle', 'foobar' ),
					'tooltip' => __( 'A circular toggle button', 'foobar' ),
				),
				'fbr-toggle-overlap'     => array(
					'label'   => __( 'Overlap', 'foobar' ),
					'tooltip' => __( 'A square toggle button which overlaps the bar', 'foobar' ),
				),
				'fbr-toggle-none'     => array(
					'label'   => __( 'None', 'foobar' ),
					'tooltip' => __( 'Do not show a toggle button', 'foobar' ),
				)
			) );
		}

		function get_toggle_position_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_toggle_position_choices', array(
				'' => array(
					'label'   => __( 'Default', 'foobar' ),
					'tooltip' => __( 'The default toggle button position, which could change based on the type and position.', 'foobar' )
				),
				'fbr-toggle-left'     => array(
					'label'   => __( 'Force Left', 'foobar' ),
					'tooltip' => __( 'Forces the toggle to be displayed on the left', 'foobar' ),
				),
				'fbr-toggle-right'     => array(
					'label'   => __( 'Force Right', 'foobar' ),
					'tooltip' => __( 'Forces the toggle to be displayed on the left', 'foobar' ),
				),
			) );
		}

		function get_toggle_action_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_toggle_action_choices', array(
				'' => array(
					'label'   => __( 'Toggle', 'foobar' ),
					'tooltip' => __( 'The toggle button will expand or collapse the bar.', 'foobar' )
				),
				'dismiss'     => array(
					'label'   => __( 'Close', 'foobar' ),
					'tooltip' => __( 'Closing the bar will remove it from the page completely.', 'foobar' ),
				),
//				'dismiss_immediate'     => array(
//					'label'   => __( 'Close Immediately', 'foobar' ),
//					'tooltip' => __( 'Closing the bar will remove it completely, with NO transition.', 'foobar' ),
//				),
			) );
		}

		function get_open_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_open_choices', array(
				'open' => array(
					'label'   => __( 'Opened', 'foobar' ),
					'tooltip' => __( 'Open the bar when the page loads', 'foobar' )
				),
				'closed'     => array(
					'label'   => __( 'Collapsed', 'foobar' ),
					'tooltip' => __( 'The bar will be collapsed when the page loads', 'foobar' ),
				),
//				'delayed'     => array(
//					'label'   => __( 'Delayed', 'foobar' ),
//					'tooltip' => __( 'Opens the bar after a number of seconds', 'foobar' ),
//				),
			) );
		}

		function get_visibility_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_visibility_choices', array(
				'' => array(
					'label'   => __( 'Do Not Show', 'foobar' ),
					'tooltip' => __( 'Do not show the bar anywhere on the site', 'foobar' )
				),
				'all'     => array(
					'label'   => __( 'Always Show', 'foobar' ),
					'tooltip' => __( 'Display the bar on every page of the website', 'foobar' ),
				),
//				'homepage'     => array(
//					'label'   => __( 'Homepage Only', 'foobar' ),
//					'tooltip' => __( 'Display the bar onyl on the homepage.', 'foobar' ),
//				),
//				'pages'     => array(
//					'label'   => __( 'Pages Only', 'foobar' ),
//					'tooltip' => __( 'Display the bar on pages only.', 'foobar' ),
//				),
//				'posts'     => array(
//					'label'   => __( 'Posts Only', 'foobar' ),
//					'tooltip' => __( 'Display the bar on posts only.', 'foobar' ),
//				),
			) );
		}

		function get_remember_choices() {
			return apply_filters( 'foobar_admin_notification_metaboxsettings_remember_choices', array(
				'' => array(
					'label'   => __( 'Yes', 'foobar' ),
					'tooltip' => __( 'The bar state will be remembered when the page is refreshed.', 'foobar' )
				),
				'disabled'     => array(
					'label'   => __( 'No', 'foobar' ),
					'tooltip' => __( 'The state of the bar will not be remembered when the page is refreshed.', 'foobar' ),
				)
			) );
		}

		function get_appearance_fields() {
			return array(
				'id'     => 'appearance',
				'label'  => __( 'Appearance', 'foobar' ),
				'icon'   => 'dashicons-admin-appearance',
				'fields' => array(
					array(
						'id'      => 'color',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Color Scheme', 'foobar' ),
						'desc'    => __( 'Choose from one of the pre-defined color schemes available for your bar.', 'foobar' ),
						'type'    => 'htmllist',
						'default' => 'fbr-blue',
						'choices' => $this->get_color_choices()
					),
					array(
						'id'      => 'transition',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Transition', 'foobar' ),
						'desc'    => __( 'What transition should the bar use when opening or closing?', 'foobar' ),
						'type'    => 'radiolist',
						'default' => 'fbr-transition-slide',
						'choices' => $this->get_transition_choices()
					),
					array(
						'id'      => 'toggle',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Toggle Shape', 'foobar' ),
						'desc'    => __( 'The toggle is the small button on the the side of the bar with an icon. What do you want the toggle button shape to look like?', 'foobar' ),
						'type'    => 'radiolist',
						'default' => 'fbr-toggle-default',
						'choices' => $this->get_toggle_choices()
					),
					array(
						'id'      => 'toggle_action',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Toggle Action', 'foobar' ),
						'desc'    => __( 'What happens when the toggle button is clicked? ', 'foobar' ),
						'type'    => 'radiolist',
						'default' => '',
						'choices' => $this->get_toggle_action_choices(),
						'data'  => array(
							'show-when' => array(
								'field' => 'toggle',
								'operator' => '!==',
								'value' => 'fbr-toggle-none',
							)
						)
					),
					array(
						'id'      => 'toggle_position',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Toggle Position', 'foobar' ),
						'desc'    => __( 'You can override the position of the toggle button.', 'foobar' ),
						'type'    => 'radiolist',
						'default' => '',
						'choices' => $this->get_toggle_position_choices(),
						'data'  => array(
							'show-when' => array(
								'field' => 'toggle',
								'operator' => '!==',
								'value' => 'fbr-toggle-none',
							)
						)
					),

				),
			);
		}

		function get_visibility_fields() {
			return array(
				'id'     => 'visibility',
				'label'  => __( 'Visibility', 'foobar' ),
				'icon'   => 'dashicons-visibility',
				'fields' => array(
					array(
						'id'      => 'layout',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Position', 'foobar' ),
						'desc'    => __( 'Where do you want the bar to show on the page?', 'foobar' ),
						'type'    => 'radiolist',
						'default' => 'fbr-layout-top',
						'choices' => $this->get_layout_choices()
					),
					array(
						'id'       => 'layout_push',
						'class'   => 'foofields-full-width',
						'label'    => __( 'Push Content', 'foofields' ),
						'desc'     => __( 'Whether or not the bar pushes the page to avoid hiding content', 'foofields' ),
						'type'     => 'radiolist',
						'default'  => 'yes',
						'choices'  => $this->get_layout_push_choices(),
						'data'  => array(
							'show-when' => array(
								'field' => 'layout',
								'operator' => 'regex',
								'value' => 'fbr-layout-top|fbr-layout-top-inline|fbr-layout-left|fbr-layout-right',
							)
						)
					),
					array(
						'id'      => 'visibility',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Display Rules', 'foobar' ),
						'desc'    => __( 'On which pages do you want to show the bar?', 'foobar' ),
						'type'    => 'radiolist',
						'default' => '',
						'choices' => $this->get_visibility_choices()
					),
					array(
						'id'      => 'visibility-specific-help',
						'class'   => 'foofields-full-width',
						'text'    => __( 'The bar will only show on pages where you have included the shortcode for this particular bar.', 'foobar' ),
						'type'    => 'help',
						'data'  => array(
							'show-when' => array(
								'field' => 'visibility',
								'value' => '',
							)
						)
					),
					array(
						'id'      => 'open',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Open Rules', 'foobar' ),
						'desc'    => __( 'Is the bar opened or collapsed when the page loads?', 'foobar' ),
						'type'    => 'radiolist',
						'default' => 'open',
						'choices' => $this->get_open_choices()
					),
					array(
						'id'      => 'remember',
						'class'   => 'foofields-full-width',
						'label'   => __( 'Remember State', 'foobar' ),
						'desc'    => __( 'Remember the state of the bar across page refreshes. If a visitor closes the bar, when they refresh the page again, it will stay closed.', 'foobar' ),
						'type'    => 'radiolist',
						'default' => '',
						'choices' => $this->get_remember_choices()
					),
					array(
						'id'      => 'remember-help',
						'class'   => 'foofields-full-width',
						'text'    => __( 'FooBar Previews : state will NOT be remembered when previewing a bar on this page and Frontend Previews. This is to prevent a bar from behaving differently to what is expected.', 'foobar' ),
						'type'    => 'help',
					),
				),
			);
		}

		function get_advanced_fields() {
			return array(
				'id'     => 'advanced',
				'label'  => __( 'Advanced', 'foobar' ),
				'icon'   => 'dashicons-admin-generic',
				'fields' => array(

				),
			);
		}

		/**
		 * @param $overrides array
		 * @param $original_fields array
		 *
		 * @return array
		 */
		function merge_fields( $overrides, $original_fields ) {
			$config = $original_fields;

			if ( is_array( $overrides ) && isset( $config['fields'] ) ) {
				foreach ( $config['fields'] as &$field ) {
					if ( isset( $field['id'] ) ) {
						$field_id = $field['id'];

						if ( array_key_exists( $field_id, $overrides ) ) {
							$override = $overrides[$field_id];
							$field = array_replace_recursive( $field, $override );
						}
					}
				}
			}

			return $config;
		}
	}
}
