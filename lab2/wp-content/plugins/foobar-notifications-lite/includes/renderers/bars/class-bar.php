<?php
namespace FooPlugins\FooBar\Renderers\Bars;

use FooPlugins\FooBar\Renderers\Renderer;

/**
 * FooBar Base Bar Renderer Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Renderers\Bars\Bar' ) ) {

	class Bar extends Renderer {

		/**
		 * @var \FooPlugins\FooBar\Objects\Bars\Bar
		 */
		protected $bar;

		/**
		 * @var array
		 */
		protected $args;

		/**
		 * Base constructor.
		 *
		 * @param $bar \FooPlugins\FooBar\Objects\Bars\Bar
		 * @param $args array
		 */
		function __construct( $bar, $args ) {
			$this->bar = $bar;
			$this->args = $args;
		}

		/**
		 * Renders the notification
		 *
		 * @param $args
		 */
		function render() {
			$classes = array( 'foobar' );

			$layout = $this->get_meta( 'layout', 'fbr-layout-top' );
			$color = $this->get_meta( 'color', 'fbr-blue' );
			$toggle = $this->get_meta( 'toggle', 'fbr-toggle-default' );
			$transition = $this->get_meta( 'transition', 'fbr-transition-slide' );
			$toggle_position = $this->get_meta( 'toggle_position', '' );

			$classes[] = $layout;
			$classes[] = $color;
			$classes[] = $toggle;
			$classes[] = $transition;
			$classes[] = $toggle_position;

			//check for RTL support
			if ( is_rtl() ) {
				$classes[] = 'fbr-rtl';
			}

			//classes to be added to the container e.g. fbr-top fbr-blue fbr-toggle-right fbr-hover-buttons
			$classes = apply_filters( 'foobar_render_container_classes', $classes, $this->bar );

			$classes = array_filter( $classes );

			//render container div
			$this->render_html_tag( 'div', array(
				'id' => $this->bar->unique_id(),
				'class' => implode(' ', $classes ),
				'data-options' => $this->build_data_options(),
			), null, false );

			//render inner div
			echo '<div class="fbr-inner">';

			//render content div
			echo '<div class="fbr-content">';

			//render items
			$this->render_items();

			echo '</div>'; //close content div

			echo '</div>'; //close inner div

			if ( $toggle !== 'fbr-toggle-none' ) {
				echo '<button class="fbr-toggle"></button>';
			}

			echo '</div>'; //close container div

			//output any custom CSS here
			if ( ! empty( $this->bar->custom_css ) ) {
				echo '<style type="text/css">';
				echo $this->bar->custom_css;
				echo '</style>';
			}
		}

		/**
		 * Builds up the data-options attribute
		 *
		 * @param null $args
		 *
		 * @return mixed|void
		 */
		function build_data_options() {
			$open = $this->get_meta( 'open', 'open' ) === 'open';
			$toggle_action = $this->get_meta( 'toggle_action', '' );
			$layout_push = $this->get_meta( 'layout_push', 'yes' );

			if ( 'dismiss' === $toggle_action ) {
				$data_options['dismiss'] = true;
			}
			if ( 'dismiss_immediate' === $toggle_action ) {
				$data_options['dismiss'] = true;
				$data_options['dismissImmediate'] = true;
			}
			if ( 'yes' === $layout_push ) {
				$data_options['push'] = true;
			}

			if ( $open ) {
				$transition = $this->get_meta( 'transition', 'fbr-transition-slide' );
				if ( $transition !== '' ) {
					$open = 'transition';
				} else {
					$open = 'immediate';
				}
				$data_options['open'] = array(
					'name' => $open
				);
			}

			$data_options['open'] = array(
				'name' => $open
			);

			$preview = $this->get_meta( 'preview', false );
			if ( $preview ) {
				$data_options['preview'] = true;
			} else {
				$data_options['remember'] = $this->get_meta( 'remember', '' ) === '';
			}

			$data_options = apply_filters( 'foobar_render_data_options', $data_options, $this->bar );

			if ( defined( 'JSON_UNESCAPED_UNICODE' ) ) {
				return json_encode( $data_options, JSON_UNESCAPED_UNICODE );
			} else {
				return json_encode( $data_options );
			}
		}

		/**
		 * Gets the setting for a specific key
		 * Priority is given to the anything passed in via args
		 * Then the value is pulled from the saved meta
		 * Lastly, the default value is return if nothing else can be found
		 *
		 * @param $key
		 * @param $default
		 * @param $args
		 *
		 * @return mixed
		 */
		function get_meta( $key, $default ) {
			//first, check to see if args includes the key
			if ( is_array( $this->args ) && array_key_exists( $key, $this->args ) ) {
				return $this->args[$key];
			}
			//otherwise, get the value from the saved settings
			return $this->bar->get_meta( $key, $default );
		}

		/**
		 * Render the bar items
		 */
		public function render_items() {
			$items = $this->bar->items();
			$multiple = count( $items ) > 1;

			if ( $multiple ) {
				echo '<ul class="fbr-items">';
			}

			foreach ( $items as $item ) {
				$item_renderer = foobar_locate_item_renderer( $item, $this );
				if ( $item_renderer !== false ) {
					$item_renderer->render_start( $multiple );
					$item_renderer->render();
					$item_renderer->render_end();
				}
			}

			if ( $multiple ) {
				echo '</ul>';
			}
		}
	}
}
