<?php
/**
 * Register Niso Carousel post type. 
 * This is administrator only post type. 
 *
 * @link              http://digitalkroy.com/niso-carousel
 * @since             1.0.0
 * @package           Niso carousel
 *
 * @wordpress-plugin
 */
 
/**
 *add niso carousel administrator role
 *
 *
 */
if ( ! function_exists( 'niso_slider_carousel_admin_role' ) ) :
function niso_slider_carousel_admin_role() {
    // gets the administrator role
    $admins = get_role( 'administrator' );

    $admins->add_cap( 'edit_niso_slider_carousel' ); 
    $admins->add_cap( 'read_niso_slider_carousels' ); 
    $admins->add_cap( 'delete_niso_slider_carousel' ); 
    $admins->add_cap( 'delete_niso_slider_carousels' ); 
    $admins->add_cap( 'edit_niso_slider_carousels' ); 
    $admins->add_cap( 'edit_niso_others_carousels_slider' ); 
    $admins->add_cap( 'publish_niso_slider_carousels' ); 
    $admins->add_cap( 'read_niso_private_carousels_slider' ); 
    $admins->add_cap( 'create_niso_slider_carousels' ); 
}
add_action( 'admin_init', 'niso_slider_carousel_admin_role');
endif;
/**
 *Remove niso carousel administrator role
 *
 *
 */
if ( ! function_exists( 'niso_slider_carousel_admin_role_remove' ) ) :
function niso_slider_carousel_admin_role_remove() {
    // remove administrator role
    $admins = get_role( 'administrator' );
	$admins->remove_cap( 'edit_niso_slider_carousel' ); 
    $admins->remove_cap( 'read_niso_slider_carousels' ); 
    $admins->remove_cap( 'delete_niso_slider_carousel' ); 
    $admins->remove_cap( 'delete_niso_slider_carousels' ); 
    $admins->remove_cap( 'edit_niso_slider_carousels' ); 
    $admins->remove_cap( 'edit_niso_others_carousels_slider' ); 
    $admins->remove_cap( 'publish_niso_slider_carousels' ); 
    $admins->remove_cap( 'read_niso_private_carousels_slider' ); 
    $admins->remove_cap( 'create_niso_slider_carousels' ); 
}
endif;
