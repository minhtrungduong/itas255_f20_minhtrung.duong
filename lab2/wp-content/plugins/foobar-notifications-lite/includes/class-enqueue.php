<?php
namespace FooPlugins\FooBar;

/**
 * FooBar Enqueue Class.
 * This class handles including a bar on the frontend
 */

if ( !class_exists( 'FooPlugins\FooBar\Enqueue' ) ) {

	class Enqueue {

		/**
		 * @var array
		 */
		private $bars = array();

		/**
		 * Enqueue private constructor.
		 */
		private function __construct() {

		}

		/**
		 * Static function to get the only instance of the Enqueue class
		 *
		 * @return Enqueue
		 */
		public static function instance() {
			global $foobar_enqueue_instance;

			if ( is_null( $foobar_enqueue_instance ) ) {
				$foobar_enqueue_instance = new self();
			}

			return $foobar_enqueue_instance;
		}

		/**
		 * Enqueues bars from the enqueue cache
		 */
		public function enqueue_from_cache() {
			$cache = get_option( FOOBAR_OPTION_ENQUEUE_CACHE );

			if ( is_array( $cache ) ) {
				if ( array_key_exists( 'all', $cache ) ) {
					foreach ( $cache['all'] as $id ) {
						$this->enqueue( intval( $id ) );
					}
				}
			}
		}

		/**
		 * Rebuild the enqueue cache from scratch
		 */
		public function rebuild_cache() {
			delete_option( FOOBAR_OPTION_ENQUEUE_CACHE );

			$cache = array();
			$save_cache = false;

			//loop through all published notifications
			$bars = foobar_get_all_bars();
			foreach ( $bars as $bar ) {
				if ( $bar !== false ) {
					$visibility = $bar->get_meta( 'visibility', '' );
					if ( in_array( $visibility, foobar_valid_visibility_choices() ) ) {
						if ( ! array_key_exists( $visibility, $cache ) ) {
							$cache[ $visibility ] = array();
						}
						//add the bar ID to the cache
						$cache[ $visibility ][] = $bar->ID;

						//make sure the cache is saved
						$save_cache = true;
					}
				}
			}

			if ( $save_cache ) {
				add_option( FOOBAR_OPTION_ENQUEUE_CACHE, $cache );
			}
		}

		/**
		 * Enqueue a bar so that it will be rendered on the frontend
		 *
		 * @param $id int
		 * @param $args
		 */
		public function enqueue( $id, $args = null ) {
			if ( !array_key_exists( $id, $this->bars ) ) {
				$this->bars[$id] = array(
					'id' => $id,
					'args' => $args
				);
			}
		}

		/**
		 * Returns all the enqueued bars
		 *
		 * @return array
		 */
		public function bars() {
			return $this->bars;
		}

		/**
		 * Returns true if there are any bars that are enqueued
		 * @return bool
		 */
		public function has_bars() {
			return is_Array( $this->bars ) && count( $this->bars ) > 0;
		}
	}
}
