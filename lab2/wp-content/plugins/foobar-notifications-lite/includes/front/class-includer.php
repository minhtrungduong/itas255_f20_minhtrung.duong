<?php
namespace FooPlugins\FooBar\Front;

use FooPlugins\FooBar\Enqueue;

/**
 * FooBar Includer Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Front\Includer' ) ) {

	class Includer {

		/**
		 * Includer constructor.
		 */
		function __construct() {
			add_action( 'wp_footer', array( $this, 'include_bar_assets' ), 1 );
			add_action( 'wp_footer', array( $this, 'include_bars' ), 99 );
			add_action( 'shutdown', array( $this, 'perform_checks' ) );
		}

		/**
		 * Enqueues the bar assets if there are bars
		 */
		function include_bar_assets() {
			$queue = Enqueue::instance();

			//enqueue any bars from the internal cache
			$queue->enqueue_from_cache();

			$always_enqueue = foobar_get_setting('always_enqueue', 'no' ) === 'on';

			if ( $queue->has_bars() || $always_enqueue ) {
				//enqueue foobar assets only if needed
				foobar_enqueue_script();
				foobar_enqueue_stylesheet();
			}
		}

		/**
		 * Render the bars on the page
		 */
		function include_bars() {
			$queue = Enqueue::instance();

			if ( $queue->has_bars() ) {
				foreach ( $queue->bars() as $id => $bar ) {
					foobar_render_bar( $id, $bar['args'] );
				}
			}
		}

		/**
		 * Perform checks to see if the enqueued bars were included in the page
		 */
		function perform_checks() {
			//we need to ensure the wp_footer hook has executed, otherwise no bars will ever show in the frontend
			if ( !did_action( 'wp_footer' ) ) {

				//store an error so that we can display it as an admin notice

			}
		}
	}
}
