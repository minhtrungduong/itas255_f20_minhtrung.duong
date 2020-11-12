<?php
namespace FooPlugins\FooBar\Objects\Bars;

use stdClass;

/**
 * The main Notification base class
 */
if ( ! class_exists( 'FooPlugins\FooBar\Objects\Bars\Bar' ) ) {

	abstract class Bar extends stdClass {
		protected $_post;

		/**
		 * constructor for a new instance
		 *
		 * @param $post
		 * @param $meta
		 */
		function __construct($post = null, $meta = null ) {
			//set some defaults
			$this->_post = null;
			$this->ID = 0;
			$this->meta = array();
			$this->name = '';
			$this->slug = '';

			if ( isset( $post ) && ( $post instanceof \WP_Post ) ) {
				$this->load( $post, $meta );
			}
		}

		/**
		 * Load the details for the notification
		 *
		 * @param $post
		 * @param null $meta
		 */
		protected function load( $post, $meta = null ) {
			$this->_post = $post;
			$this->ID = $post->ID;
			$this->slug = $post->post_name;
			$this->name = $post->post_title;
			if ( is_null( $meta ) && intval( $this->ID ) > 0 ) {
				$this->meta = get_post_meta( intval( $this->ID ), FOOBAR_NOTIFICATION_META_SETTINGS, true );
			} else {
				$this->meta = $meta;
			}
			$this->meta = $this->override_meta( $this->meta );
			if ( intval( $this->ID ) > 0 ) {
				$this->custom_css = get_post_meta( intval( $this->ID ), FOOBAR_NOTIFICATION_META_CUSTOM_CSS, true );
			}
			do_action( 'foobar_notification_loaded', $this );
		}

		/**
		 * Returns true if the notification is valid
		 */
		public function is_valid() {
			return $this->_post !== null;
		}

		/**
		 * Static function to load an instance by slug
		 *
		 * @param $slug
		 *
		 * @return Bar | boolean
		 */
		public static function get_by_slug( $slug ) {
			$args = array(
				'name'        => $slug,
				'post_type'   => FOOBAR_CPT_NOTIFICATION,
				'post_status' => 'publish',
				'numberposts' => 1
			);

			$posts = get_posts( $args );
			if ( $posts ) {
				$class = get_called_class();
				return new $class( $posts[0] );
			}
			return false;
		}

		/**
		 * Static function to load an instance by post id
		 *
		 * @param $post_id
		 *
		 * @return Bar | boolean
		 */
		public static function get_by_id( $post_id ) {
			$post = get_post( intval( $post_id ) );
			if ( $post ) {
				$class = get_called_class();
				return new $class( $post );
			}
			return false;
		}

		/**
		 * Get meta data stored for the notification
		 *
		 * @param $key
		 * @param bool $default
		 *
		 * @return mixed
		 */
		public function get_meta( $key, $default = false ) {
			return foobar_safe_get_from_array( $key, $this->meta, $default );
		}

		/**
		 * Returns the items displayed in the bar
		 *
		 * @return array
		 */
		public abstract function items();

		/**
		 * Returns the type for this bar
		 *
		 * @return string
		 */
		public abstract function type();

		/**
		 * Allow the meta to be overridden by specific bar types
		 *
		 * @param $meta
		 *
		 * @return array
		 */
		protected function override_meta( $meta ) {
			return $meta;
		}

		/**
		 * Output the shortcode for the bar
		 *
		 * @return string
		 */
		public function shortcode() {
			$id = $this->ID;
			$shortcode = foobar_shortcode();
			return "[{$shortcode} id=\"{$id}\"]";
		}

		/**
		 * Return the unique identifier for the bar
		 *
		 * @return string
		 */
		public function unique_id() {
			return 'foobar_' . $this->type() . '_' . $this->ID;
		}
	}
}
