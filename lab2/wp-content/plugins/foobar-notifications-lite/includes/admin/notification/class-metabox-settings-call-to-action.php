<?php

namespace FooPlugins\FooBar\Admin\Notification;

use FooPlugins\FooBar\Admin\FooFields\Metabox;

if ( ! class_exists( __NAMESPACE__ . '\MetaboxSettingsCallToAction' ) ) {

	class MetaboxSettingsCallToAction extends MetaboxSettings {

		function __construct() {
			parent::__construct(
				array(
					'post_type'      => FOOBAR_CPT_NOTIFICATION,
					'metabox_id'     => 'settings-cta',
					'metabox_title'  => __( 'Call-To-Action Settings', 'foobar' ),
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
					'default' => 'fbr-orange'
				),
				'toggle' => array(
					'default' => 'fbr-toggle-overlap'
				)
			);

			$fields = $this->merge_fields( $overrides, parent::get_appearance_fields() );

			$fields['fields'][] = array(
				'id'      => 'button_position',
				'label'   => __( 'CTA Button Position', 'foobar' ),
				'desc'    => __( 'You can override the position of the Call-To-Action button.', 'foobar' ),
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

		function get_fields() {
			//filter to allow fields to be overridden
			return apply_filters( 'foobar_admin_notification_settings_fields-cta',
				array(
					'tabs' => array(
						array(
							'id'     => 'content',
							'label'  => __( 'Content', 'foobar' ),
							'icon'   => 'dashicons-admin-settings',
							'class'  => 'foofields-cols-3',
							'fields' => array(
								array(
									'id'    => 'cta_text',
									'class' => 'foofields-full-width',
									'label' => __( 'CTA Text', 'foobar' ),
									'desc'  => __( 'The call-to-action message that will be shown.', 'foobar' ),
									'default' => __( 'Get a 15% discount before our sale ends!', 'foobar' ),
									'type'  => 'textarea',
									'value_encoder' => 'urlencode',
									'value_decoder' => 'urldecode'
								), //cta_text
								array(
									'id'    => 'cta_button_text',
									'label' => __( 'Button Text', 'foobar' ),
									'default' => __( 'Shop Now', 'foobar' ),
									'type'  => 'text',
									'value_encoder' => 'urlencode',
									'value_decoder' => 'urldecode'
								), //cta_button_text
								array(
									'id'    => 'cta_button_url',
									'label' => __( 'Button URL', 'foobar' ),
									'default' => trailingslashit( home_url() ) . 'shop' ,
									'type'  => 'text',
								), //cta_button_url
								array(
									'id'      => 'cta_button_target',
									'label'   => __( 'Button Target', 'foobar' ),
									'type'    => 'select',
									'default' => '_self',
									'choices' => array(
										'_self'  => __( 'Same Window', 'foobar' ),
										'_blank' => __( 'New Tab', 'foobar' ),
									),
								), //cta_button_target
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
