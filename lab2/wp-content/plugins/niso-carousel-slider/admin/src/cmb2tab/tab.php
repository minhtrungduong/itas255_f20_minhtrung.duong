<?php
/*
* Niso carousel wordpress plugin
*
* cmb2 meta box tab function
*
*/

add_action( 'cmb2_before_post_form_metabox_tabs', 'cmb2_nisoslider_carousel_tab', 10, 2 );
function cmb2_nisoslider_carousel_tab( $object_id, $cmb2 ) {
	echo '<ul class="tabs-menu">';
	$i = 0;
	foreach( $cmb2->meta_box['fields'] as $field_name => $field ) {
		if( $field['type'] == 'group' && ( isset( $field['options']['show_as_tab'] ) && ( $field['options']['show_as_tab'] == true ) ) ){
			$class = ( $i == 0 ) ? ' class="current"' : '';
			$tab_num = $i+1;
			echo '<li'. $class .'><a href="#tab-' . $tab_num . '">' . $field['options']['group_title'] . '</a></li>';
		}
		$i++;
	}
	echo '</ul>';
}

 if ( ! function_exists( 'nisoslider_carousel_cm2_tab_script' ) ) :
function nisoslider_carousel_cm2_tab_script() {
	global $pagenow;

    if(!in_array($pagenow, array('post-new.php', 'post.php'))) {
    	return;
    }
wp_enqueue_style( 'cm2-tab', plugins_url( '/cm2-tab.css', __FILE__ ), array(), '1.0', 'all');

wp_enqueue_script( 'cm2-tab', plugins_url( '/cm2-tab.js', __FILE__ ), '1.0', true);

}
add_action( 'admin_enqueue_scripts', 'nisoslider_carousel_cm2_tab_script' );
endif;