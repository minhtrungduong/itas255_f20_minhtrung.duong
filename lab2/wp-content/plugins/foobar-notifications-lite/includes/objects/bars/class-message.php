<?php
namespace FooPlugins\FooBar\Objects\Bars;

/**
 * The Message Bar
 */
if ( ! class_exists( 'FooPlugins\FooBar\Objects\Bars\Message' ) ) {

	class Message extends Bar {

		public function items() {
			$item = new \FooPlugins\FooBar\Objects\Items\Message( $this );
			return array( $item );
		}

		public function type() {
			return 'message';
		}
	}
}
