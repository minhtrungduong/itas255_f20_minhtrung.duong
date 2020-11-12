<?php
/**
 * Contains all the Global common functions used throughout FooBar
 */

use FooPlugins\FooBar\Enqueue;
use FooPlugins\FooBar\Objects\Bars\Bar;
use FooPlugins\FooBar\Objects\Items\Item;
use FooPlugins\FooBar\Renderers\Renderer;

/**
 * Custom Autoloader used throughout FooBar
 *
 * @param $class
 */
function foobar_autoloader( $class ) {
	/* Only autoload classes from this namespace */
	if ( false === strpos( $class, FOOBAR_NAMESPACE ) ) {
		return;
	}

	/* Remove namespace from class name */
	$class_file = str_replace( FOOBAR_NAMESPACE . '\\', '', $class );

	/* Convert sub-namespaces into directories */
	$class_path = explode( '\\', $class_file );
	$class_file = array_pop( $class_path );
	$class_path = strtolower( implode( '/', $class_path ) );

	/* Convert class name format to file name format */
	$class_file = foobar_uncamelize( $class_file );
	$class_file = str_replace( '_', '-', $class_file );
	$class_file = str_replace( '--', '-', $class_file );

	/* Load the class */
	require_once FOOBAR_DIR . '/includes/' . $class_path . '/class-' . $class_file . '.php';
}

/**
 * Convert a CamelCase string to camel_case
 *
 * @param $str
 *
 * @return string
 */
function foobar_uncamelize( $str ) {
	$str    = lcfirst( $str );
	$lc     = strtolower( $str );
	$result = '';
	$length = strlen( $str );
	for ( $i = 0; $i < $length; $i ++ ) {
		$result .= ( $str[ $i ] == $lc[ $i ] ? '' : '_' ) . $lc[ $i ];
	}

	return $result;
}

/**
 * Safe way to get value from an array
 *
 * @param $key
 * @param $array
 * @param $default
 *
 * @return mixed
 */
function foobar_safe_get_from_array( $key, $array, $default ) {
	if ( is_array( $array ) && array_key_exists( $key, $array ) ) {
		return $array[ $key ];
	} else if ( is_object( $array ) && property_exists( $array, $key ) ) {
		return $array->{$key};
	}

	return $default;
}

/**
 * Safe way to get value from the request object
 *
 * @param $key
 *
 * @return mixed
 */
function foobar_safe_get_from_request( $key ) {
	return foobar_safe_get_from_array( $key, $_REQUEST, null );
}

/**
 * Clean variables using sanitize_text_field. Arrays are cleaned recursively.
 * Non-scalar values are ignored.
 *
 * @param string|array $var Data to sanitize.
 *
 * @return string|array
 */
function foobar_clean( $var ) {
	if ( is_array( $var ) ) {
		return array_map( 'foobar_clean', $var );
	} else {
		return is_scalar( $var ) ? sanitize_text_field( $var ) : $var;
	}
}

/**
 * Safe way to get value from the request object
 *
 * @param $key
 * @param null $default
 * @param bool $clean
 *
 * @return mixed
 */
function foobar_safe_get_from_post( $key, $default = null, $clean = true ) {
	if ( isset( $_POST[ $key ] ) ) {
		$value = wp_unslash( $_POST[ $key ] );
		if ( $clean ) {
			return foobar_clean( $value );
		}

		return $value;
	}

	return $default;
}

/**
 * Run foobar_clean over posted textarea but maintain line breaks.
 *
 * @param string $var Data to sanitize.
 *
 * @return string
 */
function foobar_sanitize_textarea( $var ) {
	return implode( "\n", array_map( 'foobar_clean', explode( "\n", $var ) ) );
}

/**
 * Return a sanitized and unslashed key from $_GET
 *
 * @param $key
 *
 * @return string|null
 */
function foobar_sanitize_key( $key ) {
	if ( isset( $_GET[ $key ] ) ) {
		return sanitize_key( wp_unslash( $_GET[ $key ] ) );
	}

	return null;
}

/**
 * Return a sanitized and unslashed value from $_GET
 *
 * @param $key
 *
 * @return string|null
 */
function foobar_sanitize_text( $key ) {
	if ( isset( $_GET[ $key ] ) ) {
		return sanitize_text_field( wp_unslash( $_GET[ $key ] ) );
	}

	return null;
}

/**
 * Returns the menu parent slug
 *
 * @return string
 */
function foobar_get_menu_parent_slug() {
	return apply_filters( 'foobar_admin_menuparentslug', 'edit.php?post_type=' . FOOBAR_CPT_NOTIFICATION );
}

/**
 * Returns the foobar settings from options table
 */
function foobar_get_settings() {
	return get_option( FOOBAR_OPTION_DATA );
}

/**
 * Returns a specific option based on a key
 *
 * @param $key
 * @param $default
 *
 * @return mixed
 */
function foobar_get_setting( $key, $default = false ) {
	$settings = foobar_get_settings();

	return foobar_safe_get_from_array( $key, $settings, $default );
}

/**
 * Sets a specific option based on a key
 *
 * @param $key
 * @param $value
 *
 * @return mixed
 */
function foobar_set_setting( $key, $value ) {
	$settings = foobar_get_settings();
	$settings[$key] = $value;

	update_option( FOOBAR_OPTION_DATA, $settings );
}

/**
 * Returns true if FooBar is in debug mode
 * @return bool
 */
function foobar_is_debug() {
	return foobar_get_setting( 'debug', false );
}

/**
 * Enqueue the core FooBar stylesheet
 */
function foobar_enqueue_stylesheet() {
	$suffix = foobar_is_debug() ? '' : '.min';
	$handle = 'foobar-core';
	$src    = apply_filters( 'foobar_stylesheet_src', FOOBAR_ASSETS_URL . 'css/foobar' . $suffix . '.css' );
	$deps   = apply_filters( 'foobar_stylesheet_deps', array() );

	wp_enqueue_style( $handle, $src, $deps, FOOBAR_VERSION );
	do_action( 'foobar_enqueue_stylesheet', $handle, $src, $deps, FOOBAR_VERSION );
}

/**
 * Enqueue the core FooBar script
 */
function foobar_enqueue_script() {
	$suffix = foobar_is_debug() ? '' : '.min';
	$handle = 'foobar-core';
	$src    = apply_filters( 'foobar_script_src', FOOBAR_ASSETS_URL . 'js/foobar' . $suffix . '.js' );
	$deps   = apply_filters( 'foobar_script_deps', array( 'jquery' ) );

	wp_enqueue_script( $handle, $src, $deps, FOOBAR_VERSION );
	do_action( 'foobar_enqueue_script', $handle, $src, $deps, FOOBAR_VERSION );
}

/**
 * Returns the registered bar type mappings
 *
 * @return array
 */
function foobar_registered_bar_types() {
	$types = array(
		'message' => array(
			'type'    => 'FooPlugins\FooBar\Objects\Bars\Message',
			'label'   => __( 'Announcement', 'foobar' ),
			'tooltip' => __( 'Shows a simple announcement message with an optional link', 'foobar' ),
//			'attributes' => array(
//				'class' => 'pro'
//			)
		),
		'cta'     => array(
			'type'    => 'FooPlugins\FooBar\Objects\Bars\CallToAction',
			'label'   => __( 'Call To Action', 'foobar' ),
			'tooltip' => __( 'Shows a message with a call-to-action button', 'foobar' ),
		),
		'cookie'     => array(
			'type'    => 'FooPlugins\FooBar\Objects\Bars\Cookie',
			'label'   => __( 'Cookie Notice', 'foobar' ),
			'tooltip' => __( 'Shows a cookie notice with an accept button', 'foobar' ),
		)
	);

	return apply_filters( 'foobar_registered_bar_types', $types );
}

/**
 * Gets the current foobar instance in the admin
 *
 * @return bool|Bar
 */
function foobar_get_instance_admin() {
	global $post;
	global $foobar_admin_instance;

	if ( is_admin() ) {
		//check if we have already created an instance
		if ( is_subclass_of( $foobar_admin_instance, 'FooPlugins\FooBar\Objects\Bars\Bar' ) ) {
			return $foobar_admin_instance;
		}

		if ( $post instanceof \WP_Post) {
			$foobar_admin_instance = foobar_get_instance( $post );
			return $foobar_admin_instance;
		}
	}

	return false;
}

/**
 * Gets an instance of a notification bar from a post object
 *
 * @param $post
 *
 * @param null $args
 *
 * @return Bar|bool
 */
function foobar_get_instance( $post, $args = null ) {
	if ( !$post instanceof \WP_Post) {
		$post = get_post( $post );
	}
	$type = foobar_safe_get_from_array( 'type', $args, null );

	if ( $type === null ) {
		$type = get_post_meta( $post->ID, FOOBAR_NOTIFICATION_META_TYPE, true );
	}

	$meta = foobar_safe_get_from_array( 'meta', $args, null );

	if ( !empty( $type ) && !is_array( $type ) ) {
		$registered_bar_types = foobar_registered_bar_types();

		$class_type = 'FooPlugins\FooBar\Objects\Bars\Message';

		if ( array_key_exists( $type, $registered_bar_types ) ) {
			$class_type = $registered_bar_types[ $type ]['type'];
		}

		return new $class_type( $post, $meta );
	}

	return false;
}

/**
 * Based on a bar object, return a bar renderer instance
 *
 * @param $bar
 *
 * @return bool|Renderer
 */
function foobar_locate_bar_renderer( $bar, $args = null ) {
	if ( is_object( $bar ) && ( $bar instanceof Bar ) ) {

		$registered_renderers = foobar_registered_renderers();
		$type                 = get_class( $bar );
		$renderer_type        = 'FooPlugins\FooBar\Renderers\Bars\Bar';

		if ( array_key_exists( $type, $registered_renderers ) ) {
			$renderer_type = $registered_renderers[ $type ];
		}

		return new $renderer_type( $bar, $args );
	}

	return false;
}

/**
 * Based on an item object, return a item renderer instance
 *
 * @param $item
 *
 * @return bool|Renderer
 */
function foobar_locate_item_renderer( $item, $bar_renderer ) {
	if ( is_object( $item ) && ( $item instanceof Item ) ) {

		$registered_renderers = foobar_registered_renderers();
		$type                 = get_class( $item );
		$renderer_type = 'FooPlugins\FooBar\Renderers\Items\Message';

		if ( array_key_exists( $type, $registered_renderers ) ) {
			$renderer_type = $registered_renderers[ $type ];
		}

		return new $renderer_type( $item, $bar_renderer );
	}

	return false;
}

/**
 * returns all registered notification renderers
 *
 * @return array
 */
function foobar_registered_renderers() {
	$renderers = array(
		'FooPlugins\FooBar\Objects\Bars\Message'      => 'FooPlugins\FooBar\Renderers\Bars\Bar',
		'FooPlugins\FooBar\Objects\Bars\CallToAction' => 'FooPlugins\FooBar\Renderers\Bars\Bar',
		'FooPlugins\FooBar\Objects\Bars\Cookie'       => 'FooPlugins\FooBar\Renderers\Bars\Bar',

		'FooPlugins\FooBar\Objects\Items\Message'      => 'FooPlugins\FooBar\Renderers\Items\Message',
		'FooPlugins\FooBar\Objects\Items\CallToAction' => 'FooPlugins\FooBar\Renderers\Items\CallToAction',
		'FooPlugins\FooBar\Objects\Items\Cookie'       => 'FooPlugins\FooBar\Renderers\Items\Cookie',
	);

	return apply_filters( 'foobar_registered_renderers', $renderers );
}

/**
 * Renders a FooBar
 *
 * @param $post
 * @param array $args
 */
function foobar_render_bar( $post, $args = null ) {
	global $current_foobar;

	if ( ! $post instanceof WP_Post && is_int( $post ) ) {
		$post = get_post( $post );
	}

	//get the foobar instance
	$instance = foobar_get_instance( $post, $args );

	if ( $instance !== false ) {

		//set the global
		$current_foobar = $instance;

		//find the renderer
		$renderer = foobar_locate_bar_renderer( $instance, $args );

		if ( $renderer !== false ) {
			$renderer->render();
		} else {
			echo '<!-- FOOBAR_ERROR: could not render the bar -->';
		}

		//clear the global
		$current_foobar = null;
	}
}

/**
 * Returns the shortcode string for a foobar notification
 */
function foobar_shortcode() {
	return apply_filters( 'foobar_shortcode', 'foobar' );
}

/**
 * Enqueues a FooBar for rendering
 *
 * @param $id
 * @param array $args
 */
function foobar_enqueue_bar( $id, $args = null ) {
	Enqueue::instance()->enqueue( $id, $args );
}

/**
 * Returns an array of all published bars that have been saved
 *
 * @return Bar[]
 */
function foobar_get_all_bars() {
	$args = array(
		'post_type'     => FOOBAR_CPT_NOTIFICATION,
		'post_status'   => array( 'publish' ),
		'cache_results' => false,
		'nopaging'      => true,
	);

	$posts = get_posts( $args );

	$bars = array();

	foreach ( $posts as $post ) {
		$bars[$post->ID] = foobar_get_instance( $post );
	}

	return $bars;
}

/**
 * Returns the valid visibility choices for the enqueue cache
 *
 * @return array
 */
function foobar_valid_visibility_choices() {
	return apply_filters( 'foobar_valid_visibility_choices', array('all') );
}

/**
 * Returns a friendly version of the visibility set for a bar
 *
 * @param $visibility
 *
 * @return mixed|string|void
 */
function foobar_get_friendly_visibility( $visibility ) {
	switch ($visibility ) {
		case 'all' :
			return __( 'Everywhere' , 'foobar' );
		case 'specific' :
			return __( 'Specific pages with shortcode' , 'foobar' );
	}

	return '';
}

/**
 * Get the FooBar admin menu parent slug
 * @return string
 */
function foobar_admin_menu_parent_slug() {
	return apply_filters( 'foobar_admin_menu_parent_slug', FOOBAR_ADMIN_MENU_PARENT_SLUG );
}

/**
 * Returns the FooBar pricing page Url within the admin
 *
 * @return string The Url to the FooBar pricing page in admin
 */
function foobar_admin_pricing_url() {
	return admin_url( add_query_arg( array( 'page' => FOOBAR_ADMIN_MENU_PRICING_SLUG ), foobar_admin_menu_parent_slug() ) );
}

/**
 * Returns the FooBar free trial pricing page Url within the admin
 *
 * @return string The Url to the FooBar free trial page in admin
 */
function foobar_admin_freetrial_url() {
	return add_query_arg( 'trial', 'true', foobar_admin_pricing_url() );
}

/**
 * Returns the array of demo content
 *
 * @return array
 */
function foobar_get_admin_demo_content() {
	$demo_content = include( FOOBAR_PATH . 'includes/admin/demo_content.php' );

	return apply_filters( 'foobar_get_admin_demo_content', $demo_content );
}
