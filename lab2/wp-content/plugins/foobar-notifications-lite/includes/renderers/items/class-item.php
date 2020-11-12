<?php
namespace FooPlugins\FooBar\Renderers\Items;

use FooPlugins\FooBar\Renderers\Renderer;

/**
 * FooBar Base Item Renderer Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Renderers\Items\Item' ) ) {

	class Item extends Renderer {
		/**
		 * @var \FooPlugins\FooBar\Objects\Items\Item
		 */
		protected $item;

		/**
		 * @var \FooPlugins\FooBar\Renderers\Bars\Bar
		 */
		protected $bar_renderer;

		/**
		 * Base constructor.
		 *
		 * @param $item \FooPlugins\FooBar\Objects\Items\Item
		 * @param $bar_renderer \FooPlugins\FooBar\Renderers\Bars\Bar
		 */
		function __construct( $item, $bar_renderer ) {
			$this->item = $item;
			$this->bar_renderer = $bar_renderer;
		}

		/**
		 * Render the start of the item
		 * @param $multiple
		 */
		function render_start( $multiple ){
			$this->render_html_tag( $multiple ? 'li' : 'div', $this->get_item_attributes(), null, false );
			echo '<div class="fbr-item-inner">';
		}

		/**
		 * Return the attributes for an item, including the class
		 *
		 * @return array
		 */
		function get_item_attributes(){
			return array( 'class' => implode( ' ', $this->get_item_classes() ) );
		}

		/**
		 * Returns the array of classes for the item
		 * @return string[]
		 */
		function get_item_classes() {
			return array(
				'fbr-item',
				'fbr-item-' . $this->item->type
			);
		}

		function render() {

		}

		function render_end(){
			echo '</div></div>';
		}
	}
}
