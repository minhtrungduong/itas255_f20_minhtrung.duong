<?php

namespace FooPlugins\FooBar\Admin\Notification;

use FooPlugins\FooBar\Admin\FooFields\Fields\Field;
use FooPlugins\FooBar\Admin\FooFields\Metabox;

if ( ! class_exists( __NAMESPACE__ . '\MetaboxPreview' ) ) {

	class MetaboxPreview extends Metabox {

		function __construct() {
			parent::__construct(
				array(
					'post_type'      => FOOBAR_CPT_NOTIFICATION,
					'metabox_id'     => 'preview',
					'metabox_title'  => __( 'Frontend Preview', 'foobar' ),
					'priority'       => 'low',
					'context'        => 'side',
					'text_domain'    => FOOBAR_SLUG,
					'plugin_url'     => FOOBAR_URL,
					'plugin_version' => FOOBAR_VERSION,
					'fields'         => array(
						'fields' => array(
							array(
								'id'     => 'preview',
								'type'   => 'preview',
								'render' => array( $this, 'render_preview_contents' )
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
		 * Render the preview contents
		 *
		 * @param $field Field
		 */
		function render_preview_contents( $field ) {
			$foobar = foobar_get_instance_admin();

			if ( $foobar !== false ) {
				$preview_url  = add_query_arg( FOOBAR_FRONT_PREVIEW, $foobar->ID, home_url() );
				$preview_args = array(
					'href'   => $preview_url,
					'class'  => 'button button-large',
					'target' => '_blank'
				);

				self::render_html_tag( 'a', $preview_args, __( 'Launch Frontend Preview', 'foobar' ) );

				$preview_querystring = '<code>?' . FOOBAR_FRONT_PREVIEW .'=' . $foobar->ID . '</code>';

				self::render_html_tag( 'p', array(), __( 'Remember to "Update" to see your changes in the frontend preview.', 'foobar' ) );
				self::render_html_tag( 'p', array(), sprintf( __( 'You can preview the bar on any page, by adding %s to the URL', 'foobar' ), $preview_querystring ), true, false );
			} else {
				echo __( 'Preview not available yet!', 'foobar' );
			}
		}
	}
}
