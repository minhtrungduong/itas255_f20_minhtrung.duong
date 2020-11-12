<?php
namespace FooPlugins\FooBar\Renderers;

/**
 * FooBar Base Renderer Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Renderers\Renderer' ) ) {

	abstract class Renderer {

		/**
		 * Renders something to the screen
		 *
		 * @param $args
		 */
		abstract function render();

		/**
		 * Safely renders an HTML tag
		 *
		 * @param $tag
		 * @param $attributes
		 * @param string $inner
		 * @param bool $close
		 * @param bool $escape_inner
		 */
		protected function render_html_tag( $tag, $attributes, $inner = null, $close = true, $escape_inner = true ) {
			echo '<' . $tag . ' ';
			//make sure all attributes are escaped
			$attributes     = array_map( 'esc_attr', $attributes );
			$attributePairs = [];
			foreach ( $attributes as $key => $val ) {
				if ( is_null( $val ) ) {
					continue;
				} else if ( is_int( $key ) ) {
					$attributePairs[] = esc_attr( $val );
				} else {
					$val              = esc_attr( $val );
					$attributePairs[] = "{$key}=\"{$val}\"";
				}
			}
			echo implode( ' ', $attributePairs );

			if ( in_array( $tag, array( 'img', 'input', 'br', 'hr', 'meta', 'etc' ) ) ) {
				echo ' />';
				return;
			}
			echo '>';
			if ( isset( $inner ) ) {
				if ( $escape_inner ) {
					echo esc_html( $inner );
				} else {
					echo $inner;
				}
			}
			if ( $close ) {
				echo '</' . $tag . '>';
			}
		}
	}
}
