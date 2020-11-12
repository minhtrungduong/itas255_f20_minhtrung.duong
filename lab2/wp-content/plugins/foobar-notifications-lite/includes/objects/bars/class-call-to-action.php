<?php
namespace FooPlugins\FooBar\Objects\Bars;

/**
 * The CTA Bar
 */
if ( ! class_exists( 'FooPlugins\FooBar\Objects\Bars\CallToAction' ) ) {

	class CallToAction extends Bar {

		public function items() {
			$item = new \FooPlugins\FooBar\Objects\Items\CallToAction( $this );
			return array( $item );
		}

		public function type() {
			return 'cta';
		}
	}
}
