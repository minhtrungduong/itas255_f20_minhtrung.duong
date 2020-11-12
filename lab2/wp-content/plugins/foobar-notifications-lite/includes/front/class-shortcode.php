<?php
namespace FooPlugins\FooBar\Front;

/**
 * FooBar Front Shortcode Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Front\Shortcode' ) ) {

	class Shortcode {

		/**
		 * Shortcode constructor.
		 */
		function __construct() {
			add_action( 'plugins_loaded', array( $this, 'init_shortcode' ) );
		}

		/**
		 * Inits the shortcode
		 */
		function init_shortcode() {
			add_shortcode( foobar_shortcode(), array( $this, 'render' ) );
		}

		/**
		 * Enqueues the bar when the shortcode is inserted
		 *
		 * @param $atts
		 *
		 * @return string
		 */
		function render( $atts ) {
			$args = wp_parse_args( $atts, array(
				'id' => 0
			) );

			$args = apply_filters( 'foobar_shortcode_atts', $args );

			if ( array_key_exists( 'id', $args ) ) {

				$id = intval( $args['id'] );
				if ( $id > 0 ) {
					//enqueue the bar
					foobar_enqueue_bar( $id, $args );

					//output some HTML comments
					return "<!-- FOOBAR_SHORTCODE id:{$id} -->";

					//handle inline bars later
				}
			}
		}
	}
}
