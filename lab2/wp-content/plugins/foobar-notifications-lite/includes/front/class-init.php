<?php
namespace FooPlugins\FooBar\Front;

/**
 * FooBar Front Init Class
 * Runs all classes that need to run on the frontend
 */

if ( !class_exists( 'FooPlugins\FooBar\Front\Init' ) ) {

	class Init {

		/**
		 * Init constructor.
		 */
		function __construct() {
			new namespace\Shortcode();
			new namespace\Includer();
			new namespace\Preview();
		}
	}
}
