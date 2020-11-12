<?php
/**
 * Niso Carousel update messages.
 *
 * @link              http://digitalkroy.com/niso-carousel
 * @since             1.0.0
 * @package           niso-carousel
 *
 * @wordpress-plugin
 */

// niso carousel all item column set
if ( ! function_exists( 'niso_slider_carousel_image_count_admin_column' ) ) :
function niso_slider_carousel_image_count_admin_column($post_ID) {
   // $niso_slider_carousel_count = get_post_meta($post_ID, 'carousel_img', true);
	$all_images = get_post_meta( $post_ID, 'niso_img_carousel', true );
	$total_img =  !empty( $all_images[0]['niso_images'])  ? $all_images[0]['niso_images'] : ''; 
    $caption_group = get_post_meta($post_ID, 'caption_group', 1 );
    $niso_post_carousel = get_post_meta($post_ID, 'niso_post_carousel', 1 );
    $niso_post_img_number =  !empty( $niso_post_carousel[0]['niso_post_img_number'])  ? $niso_post_carousel[0]['niso_post_img_number'] : '';
	$video_carousel = get_post_meta($post_ID, 'video_carousel', 1 );
	$video_link =  !empty( $video_carousel[0]['video_link'])  ? $video_carousel[0]['video_link'] : '';
    if ($total_img) {
        $total_images_count = count( $total_img );
        return $total_images_count;
    }
    if ($caption_group) {
        $total_caption_image = count( $caption_group );
        return $total_caption_image;
    }
    if ($video_link) {
        $total_video = count( $video_link );
        return $total_video;
    }
    if ($niso_post_img_number) {
        return $niso_post_img_number;
    }
}
endif;
// Shortcode Generator
if ( ! function_exists( 'niso_slider_carousel_type_admin_column' ) ) :
function niso_slider_carousel_type_admin_column($post_ID) {
	$video_carousel = get_post_meta($post_ID, 'video_carousel', 1 );
	$video_link =  !empty( $video_carousel[0]['video_link'])  ? $video_carousel[0]['video_link'] : '';
	if(get_post_meta($post_ID, 'niso_img_carousel', true)){
    $img_carousel = __('Image carousel','niso'); 
	}else{
	 $img_carousel = ''; 
	}
    if(get_post_meta($post_ID, 'caption_group', true)){
    $caption_carousel = __('Caption carousel','niso'); 
    }else{
     $caption_carousel = ''; 
    }
	if(get_post_meta($post_ID, 'niso_post_carousel', true)){
    $caption_carousel = __('Post carousel','niso'); 
	}else{
	 $caption_carousel = ''; 
	}
	if($video_link){
    $video_carousel = __('Video carousel','niso'); 
	}else{
	 $video_carousel = ''; 
	}
	$carousel_type= array($img_carousel,$caption_carousel,$video_carousel);

	return $carousel_type;
	
}
endif;
if ( ! function_exists( 'niso_slider_carousel_shortcode_column_head' ) ) :
add_filter('manage_niso-carousel_posts_columns', 'niso_slider_carousel_shortcode_column_head', 10);
function niso_slider_carousel_shortcode_column_head($defaults) {
    $defaults['shortcode_generate'] = __('Carousel Shortcode','niso');
    $defaults['carousel_items'] = __('Carousel Items','niso');
    $defaults['carousel_type'] = __('Carousel Type','niso');
    return $defaults;
}
endif;
if ( ! function_exists( 'niso_slider_carousel_column_content' ) ) :
add_action('manage_niso-carousel_posts_custom_column', 'niso_slider_carousel_column_content', 10, 2);
function niso_slider_carousel_column_content($column_name, $post_ID) {

    if ($column_name == 'shortcode_generate') {
        $niso_img_count = niso_slider_carousel_image_count_admin_column($post_ID);
        $shortcode_render = '[ncarousel id="'.$post_ID.'"]';
        
        if($niso_img_count < 1) {
        esc_html_e('Shortcode will appear when you upload Items.','niso');
        } else {
        echo '<input style="min-width:210px" type=\'text\' onClick=\'this.setSelectionRange(0, this.value.length)\' value=\''.$shortcode_render.'\' />';
        }
    }
    if ($column_name == 'carousel_items') {
	$all_images = get_post_meta( $post_ID, 'niso_img_carousel', true );
    $total_img =  !empty( $all_images[0]['niso_images'])  ? $all_images[0]['niso_images'] : ''; 
    $caption_group = get_post_meta($post_ID, 'caption_group', 1 );
    $niso_post_carousel = get_post_meta($post_ID, 'niso_post_carousel', 1 );
    $niso_post_cat =  !empty( $niso_post_carousel[0]['niso_post_cat'])  ? $niso_post_carousel[0]['niso_post_cat'] : 'All'; 


        $niso_img_count = niso_slider_carousel_image_count_admin_column($post_ID);
        if ($niso_img_count) {
		if($total_img){
     printf(esc_html('%d images uploaded','niso'), $niso_img_count );  
		}elseif($caption_group){
     printf(esc_html('%d images uploaded','niso'), $niso_img_count );  
        }elseif($niso_post_carousel){
     printf(esc_html('%d %s post selected','niso'), $niso_img_count,$niso_post_cat );  
		}else{
     printf(esc_html('%d Videos uploaded','niso'), $niso_img_count );  
		}
	 
        } else {
		    esc_html_e(' No item uploaded!','niso');
        }
    }
    if ($column_name == 'carousel_type') {
        $niso_slider_carousel_type = niso_slider_carousel_type_admin_column($post_ID);
			$type_name = array_filter($niso_slider_carousel_type); 
			$niso_tottal_type = implode(", ", $type_name);
			 printf(esc_html('%s','niso'), $niso_tottal_type );  

    }
}
endif;