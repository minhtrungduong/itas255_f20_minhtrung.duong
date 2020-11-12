<?php
/**
 *   Register Niso Carousel post type. 
 *   This is administrator only post type. 
 *
 * @Author            Noor alam
 * @link              http://digitalkroy.com/niso-carousel
 * @since             1.0.0
 * @package           Niso Carousel
 *
 * @wordpress-plugin
 */
 
 if ( ! function_exists( 'niso_slider_carousel_post_type' ) ) :
function niso_slider_carousel_post_type() {
	$labels = array(
		'name'               => __( 'carousels','niso' ),
		'singular_name'      => __( 'carousel','niso' ),
		'menu_name'          => __( 'niso carousel','niso' ),
		'name_admin_bar'     => __( 'niso carousel','niso' ),
		'add_new'            => __( 'Add New carousel','niso' ),
		'add_new_item'       => __( 'Add New carousel','niso' ),
		'new_item'           => __( 'New carousel', 'niso' ),
		'edit_item'          => __( 'Edit carousel', 'niso' ),
		'view_item'          => __( 'View carousel', 'niso' ),
		'all_items'          => __( 'All carousel', 'niso' ),
		'parent_item_colon'  => __( 'Parent carousel:', 'niso' ),
		'not_found'          => __( 'No carousel found.', 'niso' ),
		'not_found_in_trash' => __( 'No carousel found in Trash.', 'niso' ),
	);

	$args = array(
		'labels'             => $labels,
        'description'        => __( 'You can create awesome image carousels with by niso carousel.', 'niso' ),
		'public'             => false,
		'show_ui'            => true,
		'show_in_menu'       => true,
		'query_var'          => false,
		'rewrite'            => array( 'slug' => 'niso-carousel' ),
		'capabilities' => array(
          'edit_post'          => 'edit_niso_slider_carousel', 
		  'read_post'          => 'read_niso_slider_carousels', 
		  'delete_post'        => 'delete_niso_slider_carousel', 
		  'delete_posts'       => 'delete_niso_slider_carousels', 
		  'edit_posts'         => 'edit_niso_slider_carousels', 
		  'edit_others_posts'  => 'edit_niso_others_carousels_slider', 
		  'publish_posts'      => 'publish_niso_slider_carousels',       
		  'read_private_posts' => 'read_niso_private_carousels_slider', 
		  'create_posts'       => 'create_niso_slider_carousels',
		),
		'has_archive'        => false,
		'hierarchical'       => false,
		'menu_position'      => 65,
		'menu_icon' => 'dashicons-tickets-alt',
		'supports'           => array( 'title')
	);

	register_post_type( 'niso-carousel', $args );

}
 add_action( 'init', 'niso_slider_carousel_post_type' );
 endif;
 
 
/*
 * Change niso carousel title placeholder
 *
 *
 */
if ( ! function_exists( 'niso_slider_carousel_title_text' ) ) :
function niso_slider_carousel_title_text( $title ){
     $screen = get_current_screen();
 
     if  ( 'niso-carousel' == $screen->post_type ) {
          $title = __('Enter carousel name','niso');
     }
 
     return $title;
}
 
add_filter( 'enter_title_here', 'niso_slider_carousel_title_text' );
endif;