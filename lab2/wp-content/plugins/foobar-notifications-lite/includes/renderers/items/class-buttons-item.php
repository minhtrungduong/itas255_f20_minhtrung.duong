<?php
namespace FooPlugins\FooBar\Renderers\Items;

use FooPlugins\FooBar\Renderers\Renderer;

/**
 * FooBar CallToAction Item Renderer Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Renderers\Items\ButtonsItem' ) ) {

	abstract class ButtonsItem extends Item {

		function render() {
			echo '<span class="fbr-message">';
			$this->render_content();
			echo '</span>';
			echo '<span class="fbr-buttons">';
			echo '<span class="fbr-buttons-inner">';
			$this->render_buttons();
			echo '</span>';
			echo '</span>';
		}

		/**
		 * Returns the array of classes for the button item
		 * @return string[]
		 */
		function get_item_classes() {
			$classes = parent::get_item_classes();

			$classes[] = 'fbr-buttons-item';

			// get the various item specific options here
			$button_position = $this->bar_renderer->get_meta( 'button_position', '' );
			if ( $button_position !== '' ) {
				// if it's not the default which requires no CSS class then add the value
				$classes[] = $button_position;
			}

			return $classes;
		}

		abstract function render_content();

		abstract function render_buttons();
	}
}
