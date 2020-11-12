<?php
/*
 * Add custom button in TinyMCE  editor for Niso carousel shortcode.
 *
 * Author name:       Noor alam
 * Author URI:        http://codecanyon.net/user/noor-alam
 * @since             1.0.0
 * @package           Niso carousel wordpress plugin
 */

// Hooks functions into the correct filters
if ( ! function_exists( 'niso_slider_carousel_mce_button' ) ) :
function niso_slider_carousel_mce_button() {
	// check administrator
	if ( !current_user_can( 'administrator' ) ) {
		return;
	}
	// check if WYSIWYG is enabled
	if ( 'true' == get_user_option( 'rich_editing' ) ) {
		add_filter( 'mce_external_plugins', 'niso_slider_carousel_mce_button_scripts' );
		add_filter( 'mce_buttons', 'niso_slider_carousel_tinymce_register' );
	}
}
add_action('admin_head', 'niso_slider_carousel_mce_button');
endif;
// Declare script for new button
if ( ! function_exists( 'niso_slider_carousel_mce_button_scripts' ) ) :
function niso_slider_carousel_mce_button_scripts( $plugin_array ) {
    	$plugin_array['niso_sbutton'] = plugins_url( '/../assets/js/admin-mce-button.js', __FILE__ );
		return $plugin_array;

}
endif;
// Register new button in the editor
if ( ! function_exists( 'niso_slider_carousel_tinymce_register' ) ) :
function niso_slider_carousel_tinymce_register( $buttons ) {
	array_push( $buttons, 'niso_sbutton' );
	return $buttons;
}
endif;
// Add gallery post id dynamical in TinyMCE editor custom button
if ( ! function_exists( 'niso_slider_carousel_tinymce_shortcode_list_id' ) ) :
function niso_slider_carousel_tinymce_shortcode_list_id(){
    $nposts =  get_posts(array(
	'post_type'   => 'niso-carousel',
    'post_status'      => 'publish',
	'posts_per_page'   => -1,
	'suppress_filters' => true
));
        $tinyMCE_list = array();
		$count=1;
		if($nposts) :
        foreach ($nposts as $npost) :
			$post_ID = $npost->ID;
			if(!empty($npost->post_title)){
			$post_title = $npost->post_title;
			}else{ 
			$post_title =sprintf(esc_html('Untitled carousel id - %s','niso'), $post_ID); 
			}
            $tinyMCE_list[] = array( 'text' => esc_html($post_title), 'value' => '[ncarousel id="'.$post_ID.'"]' );
        endforeach;
		else:
		$tinyMCE_list[] = array( 'text' => __('No carousel found','niso') , 'value' => '' );
		endif;
        $jscode = $tinyMCE_list; 
		 if (is_admin()) {
        ?>
        <script type="text/javascript">
        var post_id = <?php echo json_encode($jscode); ?>
        </script>
        <?php
		}
  
}
foreach ( array('post.php','post-new.php') as $hook ) {
     add_action( "admin_head-$hook", 'niso_slider_carousel_tinymce_shortcode_list_id' );
}
endif;
