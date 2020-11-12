<?php
namespace FooPlugins\FooBar\Objects\Items;

/**
 * A Cookie item class
 */
if ( ! class_exists( 'FooPlugins\FooBar\Objects\Items\Cookie' ) ) {
	class Cookie extends Item {
		function __construct( $bar ) {
			parent::__construct( $bar, "cookie" );
		}
	}
}
