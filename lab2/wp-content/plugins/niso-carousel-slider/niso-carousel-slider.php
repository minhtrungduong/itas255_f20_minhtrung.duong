<?php
/*
 * @link              http://wpthemespace.com
 * @since             1.0.0
 * @package           Niso Carousel Slider
 *
 * @wordpress-plugin
 * Plugin Name:       Niso Carousel Slider
 * Plugin URI:        http://wpthemespace.com
 * Description:       A simple carousel and slider plugin.You can create post, image and video carousel and simple slider by this plugin.
 * Version:           1.3.11
 * Author:            Noor alam
 * Author URI:        http://wpthemespace.com
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       niso
 * Domain Path:       /languages
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

define( 'NISO_CAROUSEL_SLIDER_DIR', plugin_dir_path( __FILE__ ) );
define( 'NISO_CAROUSEL_FILE', __FILE__  );
/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
 if ( is_admin() ) {
     // We are in admin mode
require_once( NISO_CAROUSEL_SLIDER_DIR .'admin/niso-carousel-post.php' );
require_once( NISO_CAROUSEL_SLIDER_DIR .'admin/niso-carousel-admin-role.php' );
require_once( NISO_CAROUSEL_SLIDER_DIR .'admin/niso-carousel-column-set.php' );
require_once( NISO_CAROUSEL_SLIDER_DIR .'admin/niso-carousel-update-massage.php' );
require_once (NISO_CAROUSEL_SLIDER_DIR .'admin/niso-carousel-meta-tab.php' );
require_once (NISO_CAROUSEL_SLIDER_DIR .'admin/niso-button-tinymce.php' );
require_once (NISO_CAROUSEL_SLIDER_DIR . 'admin/src/cmb2/init.php');
 require_once (NISO_CAROUSEL_SLIDER_DIR . 'admin/src/cmb2tab/tab.php');
 require_once (NISO_CAROUSEL_SLIDER_DIR . 'admin/src/cmb2-select2/cmb-field-select2.php');
 require_once (NISO_CAROUSEL_SLIDER_DIR . 'admin/src/cmb2-slider/slider-field.php');
 require_once (NISO_CAROUSEL_SLIDER_DIR . 'admin/src/cmb2/cmb2-conditionals.php');
}

require_once( NISO_CAROUSEL_SLIDER_DIR .'includes/niso-carousel-options.php' );
require_once( NISO_CAROUSEL_SLIDER_DIR .'includes/niso-carousel-shortcode.php' );

	/**
	 * Load the plugin all style and script.
	 *
	 * @since    1.0.0
	 */

 if ( ! function_exists( 'niso_slider_carousel_style_script' ) ) :
function niso_slider_carousel_style_script() {
wp_enqueue_style( 'niso-carousel-fontello', plugins_url( '/assets/css/fontello.css', __FILE__ ), array(), '1.0', 'all');
wp_enqueue_style( 'niso-carousel-owl', plugins_url( '/assets/css/owl.carousel.css', __FILE__ ), array(), '1.0', 'all');
wp_enqueue_style( 'niso-theme-default', plugins_url( '/assets/css/themes/niso.theme.default.css', __FILE__ ), array(), '1.0', 'all');
wp_enqueue_style( 'niso-animate', plugins_url( '/assets/css/animate.css', __FILE__ ), array(), '1.0', 'all');
wp_enqueue_style( 'niso-carousel', plugins_url( '/assets/css/niso-carousel.css', __FILE__ ), array(), '1.0', 'all');
wp_enqueue_style( 'niso-carousel-lightbox', plugins_url( '/assets/css/nivo-lightbox.css', __FILE__ ), array(), '1.0', 'all');
wp_enqueue_style( 'niso-carousel-lightbox-theme', plugins_url( '/assets/css/themes/default.css', __FILE__ ), array(), '1.0', 'all');

wp_enqueue_script('jquery');
wp_enqueue_script( 'niso-carousel-owl.min', plugins_url( '/assets/js/owl.carousel.min.js', __FILE__ ), array( 'jquery' ), '1.0', true);
wp_enqueue_script( 'jquery.mousewheel.min', plugins_url( '/assets/js/jquery.mousewheel.min.js', __FILE__ ), array( 'jquery' ), '1.0', true);
wp_enqueue_script( 'niso-carousel-lightbox.min', plugins_url( '/assets/js/nivo-lightbox.min.js', __FILE__ ), array( 'jquery' ), '1.0', true);
}
add_action( 'wp_enqueue_scripts', 'niso_slider_carousel_style_script' );
endif;

	/**
	 * Load admin all style and script.
	 *
	 * @since    1.0.0
	 */

 if ( ! function_exists( 'niso_slider_carousel_admin_style_script' ) ) :
function niso_slider_carousel_admin_style_script() {
	global $pagenow;

    if( in_array($pagenow, array('post-new.php', 'post.php'))) {
wp_enqueue_style( 'niso-carousel-fontello', plugins_url( '/assets/css/fontello.css', __FILE__ ), array(), '1.0', 'all');
wp_enqueue_style( 'niso-carousel-labelauty', plugins_url( '/assets/css/jquery-labelauty.css', __FILE__ ), array(), '1.0', 'all');
wp_enqueue_script( 'niso-carousel-labelauty', plugins_url( '/assets/js/jquery-labelauty.js', __FILE__ ), array( 'jquery' ), '1.0', true);
wp_enqueue_script( 'niso-carousel-admin', plugins_url( '/assets/js/niso-admin.js', __FILE__ ), array( 'jquery' ), '1.1', true);

    }
wp_enqueue_style( 'niso-carousel-admin', plugins_url( '/assets/css/admin.css', __FILE__ ), array(), '1.3', 'all');
wp_enqueue_script( 'niso-carousel-admin', plugins_url( '/assets/js/notice.js', __FILE__ ), array( 'jquery' ), '1.2', true);

}
add_action( 'admin_enqueue_scripts', 'niso_slider_carousel_admin_style_script' );
endif;

/**
 * niso carousel activation hook.
 *
 */ 
 if ( ! function_exists( 'niso_slider_carousel_activation_setup' ) ) :
function niso_slider_carousel_activation_setup() {
    // Trigger our function that registers the custom post type
    niso_slider_carousel_post_type();
 
    // Clear the permalinks after the post type has been registered
    flush_rewrite_rules();
    // Add new administrator role
	niso_slider_carousel_admin_role();
}
register_activation_hook( __FILE__, 'niso_slider_carousel_activation_setup' ); 
endif; 
/**
 * niso carousel deactivation hook.
 *
 */ 
 if ( ! function_exists( 'niso_slider_carousel_deactivation_setup' ) ) :
function niso_slider_carousel_deactivation_setup() {
 
    // Clear the permalinks to remove our post type's rules
    flush_rewrite_rules();
	
	// gets the administrator role remove
	niso_slider_carousel_admin_role_remove();
 
}
register_deactivation_hook( __FILE__, 'niso_slider_carousel_deactivation_setup' );
endif;

	/**
	 * Load the plugin text domain for translation.
	 *
	 * @since    1.0.0
	 */
if ( ! function_exists( 'niso_slider_carousel_textdomain' ) ) :
	function niso_slider_carousel_textdomain() {

		load_plugin_textdomain(
			'niso',
			false,
			dirname( dirname( plugin_basename( __FILE__ ) ) ) . '/languages'
		);

	}
add_action( 'plugins_loaded', 'niso_slider_carousel_textdomain' );
endif;

//new image size added
add_image_size( 'xmedium', 450, 450, true );
add_image_size( 'medium_slide', 1300, 400, true );
add_image_size( 'big_slide', 1300, 400, true );