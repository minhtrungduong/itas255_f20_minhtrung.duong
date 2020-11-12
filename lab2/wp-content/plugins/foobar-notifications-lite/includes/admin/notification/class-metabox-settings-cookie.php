<?php

namespace FooPlugins\FooBar\Admin\Notification;

use FooPlugins\FooBar\Admin\FooFields\Metabox;

if ( ! class_exists( __NAMESPACE__ . '\MetaboxSettingsCookie' ) ) {

	class MetaboxSettingsCookie extends MetaboxSettings {

		function __construct() {
			parent::__construct(
				array(
					'post_type'      => FOOBAR_CPT_NOTIFICATION,
					'metabox_id'     => 'settings-cookie',
					'metabox_title'  => __( 'Cookie Notice Settings', 'foobar' ),
					'priority'       => 'high',
					'meta_key'       => FOOBAR_NOTIFICATION_META_SETTINGS,
					'text_domain'    => FOOBAR_SLUG,
					'plugin_url'     => FOOBAR_URL,
					'plugin_version' => FOOBAR_VERSION
				)
			);
		}

		function get_appearance_fields() {
			$overrides = array(
				'color' => array(
					'default' => 'fbr-yellow'
				),
				'toggle' => array(
					'default' => 'fbr-toggle-none'
				)
			);

			$fields = $this->merge_fields( $overrides, parent::get_appearance_fields() );

			$fields['fields'][] = array(
				'id'      => 'button_position',
				'label'   => __( 'Button Position', 'foobar' ),
				'desc'    => __( 'You can override the position of the Accept button.', 'foobar' ),
				'type'    => 'radiolist',
				'default' => '',
				'choices' => array(
					'' => array(
						'label'   => __( 'Default', 'foobar' ),
						'tooltip' => __( 'The default button position, depending on the RTL orientation.', 'foobar' )
					),
					'fbr-buttons-left'     => array(
						'label'   => __( 'Force Left', 'foobar' ),
						'tooltip' => __( 'Forces the button to be displayed on the left', 'foobar' ),
					),
					'fbr-buttons-right'     => array(
						'label'   => __( 'Force Right', 'foobar' ),
						'tooltip' => __( 'Forces the button to be displayed on the left', 'foobar' ),
					),
				),
			);

			return $fields;
		}

		function get_visibility_fields() {
			$overrides = array(
				'layout' => array(
					'default' => 'fbr-layout-bottom'
				)
			);

			return $this->merge_fields( $overrides, parent::get_visibility_fields() );
		}

		function get_fields() {
			//filter to allow fields to be overridden
			return apply_filters( 'foobar_admin_notification_settings_fields-cookie',
				array(
					'tabs' => array(
						array(
							'id'     => 'content',
							'label'  => __( 'Content', 'foobar' ),
							'icon'   => 'dashicons-admin-settings',
							'class'  => 'foofields-cols-3',
							'fields' => array(
								array(
									'id'      => 'cookie_notice',
									'class'   => 'foofields-full-width',
									'label'   => __( 'Cookie Notice Text', 'foobar' ),
									'desc'    => __( 'The cookie notice that will be shown to your visitors.', 'foobar' ),
									'default' => sprintf( __( '%s uses cookies to personalise and improve your user experience. If you continue to use this website, you will be providing consent to our use of cookies.', 'foobar' ), get_bloginfo( 'name' ) ),
									'type'    => 'textarea',
									'value_encoder' => 'urlencode',
									'value_decoder' => 'urldecode'
								), //cookie_notice
								array(
									'id'      => 'cookie_button_text',
									'label'   => __( 'Accept Button Text', 'foobar' ),
									'desc'    => __( 'The accept button will close the bar if clicked.', 'foobar' ),
									'default' => __( 'Accept', 'foobar' ),
									'type'    => 'text',
									'value_encoder' => 'urlencode',
									'value_decoder' => 'urldecode'
								), //cookie_button_text
								array(
									'id'      => 'cookie_show_policy_link',
									'class'   => 'foofields-full-width',
									'label'   => __( 'Show Policy Link?', 'foobar' ),
									'desc'    => __( 'Do you want to show an anchor link to your privacy policy page?', 'foobar' ),
									'default' => 'no',
									'type'    => 'radiolist',
									'choices' => array(
										'yes' => __( 'Yes', 'foobar' ),
										'no'  => __( 'No', 'foobar' ),
									),
								), //cookie_show_policy_link
								array(
									'id'      => 'cookie_policy_link_text',
									'label'   => __( 'Policy Link Text', 'foobar' ),
									'default' => __( 'Privacy Policy', 'foobar' ),
									'type'    => 'text',
									'value_encoder' => 'urlencode',
									'value_decoder' => 'urldecode',
									'data'  => array(
										'show-when' => array(
											'field' => 'cookie_show_policy_link',
											'value' => 'yes',
										)
									)
								), //cookie_policy_link_text
								array(
									'id'    => 'cookie_policy_link_url',
									'label' => __( 'Policy Link URL', 'foobar' ),
									'default' => get_privacy_policy_url(),
									'type'  => 'text',
									'data'  => array(
										'show-when' => array(
											'field' => 'cookie_show_policy_link',
											'value' => 'yes',
										)
									)
								), //cookie_policy_link_url
								array(
									'id'      => 'cookie_policy_link_target',
									'label'   => __( 'Policy Link Target', 'foobar' ),
									'type'    => 'select',
									'default' => '_self',
									'choices' => array(
										'_self'  => __( 'Same Window', 'foobar' ),
										'_blank' => __( 'New Tab', 'foobar' ),
									),
									'data'  => array(
										'show-when' => array(
											'field' => 'cookie_show_policy_link',
											'value' => 'yes',
										)
									)
								), //cookie_policy_link_target
							),
						), //General

						$this->get_appearance_fields(),

						$this->get_visibility_fields(),

						//$this->get_advanced_fields()
					)
				) );
		}
	}
}
