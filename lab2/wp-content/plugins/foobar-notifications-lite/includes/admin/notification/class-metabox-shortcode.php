<?php

namespace FooPlugins\FooBar\Admin\Notification;

use FooPlugins\FooBar\Admin\FooFields\Fields\Field;
use FooPlugins\FooBar\Admin\FooFields\Metabox;

if ( ! class_exists( __NAMESPACE__ . '\MetaboxShortcode' ) ) {

	class MetaboxShortcode extends Metabox {

		function __construct() {
			parent::__construct(
				array(
					'post_type'      => FOOBAR_CPT_NOTIFICATION,
					'metabox_id'     => 'shortcode',
					'metabox_title'  => __( 'Shortcode', 'foobar' ),
					'priority'       => 'low',
					'context'        => 'side',
					'text_domain'    => FOOBAR_SLUG,
					'plugin_url'     => FOOBAR_URL,
					'plugin_version' => FOOBAR_VERSION,
					'fields'         => array(
						'fields' => array(
							array(
								'id'      => 'shortcode',
								'type'    => 'shortcode',
								'render'  => array( $this, 'render_shortcode_contents' )
							)
						)
					)
				)
			);

			$this->add_filter( 'must_add_meta_boxes', array( $this, 'must_add_meta_boxes' ) );
		}

		/**
		 * Determines if the metabox should be shown or not
		 * @return bool
		 */
		function must_add_meta_boxes() {
			$foobar = foobar_get_instance_admin();

			return $foobar !== false;
		}

		/**
		 * Render the shortcode details
		 *
		 * @param $field Field
		 */
		function render_shortcode_contents( $field ) {
			$foobar = foobar_get_instance_admin();

			if ( $foobar !== false ) {
				$shortcode = $foobar->shortcode();

				echo '<input type="text" readonly="readonly" size="' . strlen( $shortcode ) . '" value="' . esc_attr( $shortcode ) . '" class="foobar-shortcode" />';
				echo '<p class="foobar-shortcode-message">' . esc_html( __( 'Shortcode copied to clipboard :)', 'foobar' ) ) . '</p>';
				echo '<p>' . esc_html( __( 'Paste the above shortcode into a post or page to show the notification.', 'foobar' ) ) . '</p>';
			} else {
				echo __( 'Shortcode not available yet!', 'foobar' );
			}
		}
	}
}
