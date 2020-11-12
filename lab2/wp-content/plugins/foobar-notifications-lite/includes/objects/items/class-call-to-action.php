<?php
namespace FooPlugins\FooBar\Objects\Items;

/**
 * A CTA item class
 */
if ( ! class_exists( 'FooPlugins\FooBar\Objects\Items\CallToAction' ) ) {
	class CallToAction extends Item {
		function __construct( $bar ) {
			parent::__construct( $bar, "cta" );
		}
	}
}
