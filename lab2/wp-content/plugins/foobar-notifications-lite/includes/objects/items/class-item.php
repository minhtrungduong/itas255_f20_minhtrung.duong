<?php
namespace FooPlugins\FooBar\Objects\Items;

use FooPlugins\FooBar\Objects\Bars\Bar;
use stdClass;

/**
 * A generic item class
 */
if ( ! class_exists( 'FooPlugins\FooBar\Objects\Items\Item' ) ) {

	class Item {

		/**
		 * @var Bar
		 */
		public $bar;

		/**
		 * @var string
		 */
		public $type;

		/**
		 * constructor for a new instance
		 *
		 * @param $bar Bar
		 * @param $type string
		 */
		function __construct( $bar, $type ) {
			$this->bar = $bar;
			$this->type = $type;
		}
	}
}
