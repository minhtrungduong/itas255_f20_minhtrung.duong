<?php
namespace FooPlugins\FooBar\Front;

/**
 * FooBar Preview Handler Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Front\Preview' ) ) {

	class Preview {

		/**
		 * Preview constructor.
		 */
		function __construct() {
			add_action( 'template_redirect', array( $this, 'check_for_preview' ) );
		}

		function check_for_preview() {
			//check if we are trying to show a preview
			if ( !isset( $_GET[FOOBAR_FRONT_PREVIEW] ) ) {
				return;
			}

			$foobar_id = intval( $_GET[FOOBAR_FRONT_PREVIEW] );

			if ( $foobar_id > 0 ) {
				foobar_enqueue_bar( $foobar_id, array( 'preview' => true ) );
			}
		}
	}
}
