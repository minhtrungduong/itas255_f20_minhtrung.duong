<?php
namespace FooPlugins\FooBar\Admin\Notification;

if ( ! class_exists( __NAMESPACE__ . '\MetaboxSettingsMessage' ) ) {

	class MetaboxSettingsMessage extends MetaboxSettings {

		function __construct() {
			parent::__construct(
				array(
					'post_type'      => FOOBAR_CPT_NOTIFICATION,
					'metabox_id'     => 'settings-message',
					'metabox_title'  => __( 'Announcement Settings', 'foobar' ),
					'priority'       => 'high',
					'meta_key'       => FOOBAR_NOTIFICATION_META_SETTINGS,
					'text_domain'    => FOOBAR_SLUG,
					'plugin_url'     => FOOBAR_URL,
					'plugin_version' => FOOBAR_VERSION
				)
			);
		}

		function get_fields() {
			//filter to allow fields to be overridden
			return apply_filters( 'foobar_admin_notification_settings_fields-message',
				array(
					'tabs' => array(
						array(
							'id'     => 'content',
							'label'  => __( 'Content', 'foobar' ),
							'icon'   => 'dashicons-admin-settings',
							'class'  => 'foofields-cols-3',
							'fields' => array(
								array(
									'id'    => 'message_text',
									'class' => 'foofields-full-width',
									'label' => __( 'Announcement Text', 'foobar' ),
									'default' => __( 'Welcome to our website. Please enjoy your visit...', 'foobar' ),
									'desc'  => sprintf( __( 'The announcement message that will be shown to your visitors. It can also contain %s 😀', 'foobar' ), '<a href="https://getemoji.com/" target="_blank">' . __( 'emoji\'s', 'foobar' ) . '</a>' ),
									'type'  => 'textarea',
									'value_encoder' => 'urlencode',
									'value_decoder' => 'urldecode'
								), //message_text
								array(
									'id'      => 'message_show_link',
									'class'   => 'foofields-full-width',
									'label'   => __( 'Show Link?', 'foobar' ),
									'desc'    => __( 'Do you want to show an anchor link next to the announcement?', 'foobar' ),
									'default' => 'no',
									'type'    => 'radiolist',
									'choices' => array(
										'yes' => __( 'Yes', 'foobar' ),
										'no'  => __( 'No', 'foobar' ),
									)
								), //message_show_link
								array(
									'id'    => 'message_link_text',
									'label' => __( 'Link Text', 'foobar' ),
									'type'  => 'text',
									'value_encoder' => 'urlencode',
									'value_decoder' => 'urldecode',
									'data'  => array(
										'show-when' => array(
											'field' => 'message_show_link',
											'value' => 'yes',
										)
									)
								), //message_link_text
								array(
									'id'    => 'message_link_url',
									'label' => __( 'Link URL', 'foobar' ),
									'type'  => 'text',
									'data'  => array(
										'show-when' => array(
											'field' => 'message_show_link',
											'value' => 'yes',
										)
									)
								), //message_link_url
								array(
									'id'      => 'message_link_target',
									'label'   => __( 'Link Target', 'foobar' ),
									'type'    => 'select',
									'default' => '_self',
									'choices' => array(
										'_self'  => __( 'Same Window', 'foobar' ),
										'_blank' => __( 'New Tab', 'foobar' ),
									),
									'data'    => array(
										'show-when' => array(
											'field' => 'message_show_link',
											'value' => 'yes',
										)
									)
								), //message_link_target
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
