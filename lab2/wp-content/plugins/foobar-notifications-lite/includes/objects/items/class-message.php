<?php
namespace FooPlugins\FooBar\Objects\Items;

/**
 * A message item class
 */
if ( ! class_exists( 'FooPlugins\FooBar\Objects\Items\Message' ) ) {
	class Message extends Item {
		function __construct( $bar ) {
			parent::__construct( $bar, "message" );
		}
	}
}
