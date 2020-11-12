<?php
/*
 * @link              http://digitalkroy.com/niso-carousel-2/
 * @since             1.0.0
 * @package           niso carousel wordpress plugin    
 * description        All carousel output by this shortcode
 *
 * @ niso carousel
 */
 
 /*
 *Image carousel all image get this function
 */
 function niso_carousel_slider_images() {
	global $post;
    // Get the list of files
	$post_ID = $post->ID;
    $all_images = get_post_meta( get_the_ID(), 'niso_img_carousel', 1 );
	$files =  !empty( $all_images[0]['niso_images'])  ? $all_images[0]['niso_images'] : '';
	$settings = get_post_meta( get_the_ID(), 'carousel_settings', true);
	$carousel_mode =  !empty( $settings[0]['carousel_mode'])  ? $settings[0]['carousel_mode'] : 'Multiple_active';
	if($carousel_mode=='Multiple_active'){ 
	$img_size =  !empty( $settings[0]['niso_img_multiple'])  ? $settings[0]['niso_img_multiple'] : 'medium';
	}else{ 
	$img_size =  !empty( $settings[0]['niso_img_single'])  ? $settings[0]['niso_img_single'] : 'big_slide';
	}
	$niso_lightbox =  !empty( $settings[0]['niso_lightbox'])  ? $settings[0]['niso_lightbox'] : 'lightbox_hide';

    // Loop through them and output an image
    foreach ( (array) $files as $attachment_id => $attachment_url ) {
	if($carousel_mode=='Multiple_active'){ 
	$niso_lazyLoad =  !empty( $settings[0]['niso_lazyLoad'])  ? $settings[0]['niso_lazyLoad'] : '';
	}else{ 
	$niso_lazyLoad= '';
	}
		$lazy_img = wp_get_attachment_image_src( $attachment_id , $img_size  );
		$light_img = wp_get_attachment_image_src( $attachment_id ,'large');
        echo '<div class="item">';
		if($niso_lightbox=='lightbox_active'){
		echo '<a href="'.$light_img[0] .'" data-lightbox-gallery="gallery'.$post_ID.'">';
		}
		if($niso_lazyLoad){
	//Lazy load image output
		echo' <img class="owl-lazy" data-src="'.$lazy_img[0].'" data-src-retina="'.$lazy_img[0].'-retina" width='.$lazy_img[1].' height='.$lazy_img[2].' alt="">';
		}else{
		//Simple image output
        echo wp_get_attachment_image( $attachment_id, $img_size  );
		}
		if($niso_lightbox=='lightbox_active'){
        echo '</a>';
		}
        echo '</div>';
    }
}
 /*
 * caption carousel get this function
 */
 if(! function_exists('niso_carousel_caption_img')):
 function niso_carousel_caption_img() {
 global $post;
	$post_ID = $post->ID;
    // Get the list of files
    $caption_group = get_post_meta( get_the_ID(), 'caption_group', 1 );
	$settings = get_post_meta( get_the_ID(), 'carousel_settings', true);
	$carousel_mode =  !empty( $settings[0]['carousel_mode'])  ? $settings[0]['carousel_mode'] : 'Multiple_active';
	if($carousel_mode=='Multiple_active'){ 
	$img_size =  !empty( $settings[0]['niso_img_multiple'])  ? $settings[0]['niso_img_multiple'] : 'medium';
	}else{ 
	$img_size =  !empty( $settings[0]['niso_img_single'])  ? $settings[0]['niso_img_single'] : 'big_slide';
	}
	$niso_caption_style =  !empty( $settings[0]['niso_caption_style'])  ? $settings[0]['niso_caption_style'] : 'medium';
	$niso_lightbox =  !empty( $settings[0]['niso_lightbox'])  ? $settings[0]['niso_lightbox'] : 'lightbox_hide';


    // Loop through them and output an image
    foreach ((array) $caption_group as  $key =>$caption ) {
	    $cap_image_id =  !empty( $caption['cap_image_id'])  ? $caption['cap_image_id'] : '';
		$light_img = wp_get_attachment_image_src( $cap_image_id ,'large');
	    $cap_text =  !empty( $caption['cap_text'])  ? $caption['cap_text'] : '';
		if($carousel_mode=='Multiple_active'){ 
			$niso_lazyLoad =  !empty( $settings[0]['niso_lazyLoad'])  ? $settings[0]['niso_lazyLoad'] : '';
			}else{ 
			$niso_lazyLoad= '';
			}
		$lazy_img = wp_get_attachment_image_src( $cap_image_id , $img_size );
        echo '<div class="item">';
		if($niso_lightbox=='lightbox_active'){
		echo '<a href="'.$light_img[0] .'" data-lightbox-gallery="gallery'.$post_ID.'">';
		}
		if($niso_lazyLoad){ 
		echo' <img class="owl-lazy" data-src="'.$lazy_img[0].'" data-src-retina="'.$lazy_img[0].'-retina" width='.$lazy_img[1].' height='.$lazy_img[2].' alt="'.$cap_text.'">';
		}else{
        echo wp_get_attachment_image( $cap_image_id , $img_size );
		}
        echo '<div class="niso-caption '.$niso_caption_style.'"><h6>'.esc_html($cap_text).'</h6></div>';
		if($niso_lightbox=='lightbox_active'){
		echo '</a>';
		}
        echo '</div>';
    }
}
endif;

/*
*Niso post carousel output function
*/
if(!function_exists('niso_carousel_slider_post')):

	function niso_carousel_slider_post(){
	$niso_post_carousel = get_post_meta( get_the_ID(), 'niso_post_carousel', true);
	$settings = get_post_meta( get_the_ID(), 'carousel_settings', true);
	$carousel_mode =  !empty( $settings[0]['carousel_mode'])  ? $settings[0]['carousel_mode'] : 'Multiple_active';
	if($carousel_mode=='Multiple_active'){ 
	$img_size =  !empty( $settings[0]['niso_img_multiple'])  ? $settings[0]['niso_img_multiple'] : 'medium';
	}else{ 
	$img_size =  !empty( $settings[0]['niso_img_single'])  ? $settings[0]['niso_img_single'] : 'big_slide';
	}
	$niso_caption_style =  !empty( $settings[0]['niso_caption_style'])  ? $settings[0]['niso_caption_style'] : 'medium';
	$niso_lightbox =  !empty( $settings[0]['niso_lightbox'])  ? $settings[0]['niso_lightbox'] : 'lightbox_hide';

	$niso_post_cat =  !empty( $niso_post_carousel[0]['niso_post_cat'])  ? $niso_post_carousel[0]['niso_post_cat'] : 'all';
	$niso_post_img_number =  !empty( $niso_post_carousel[0]['niso_post_img_number'])  ? $niso_post_carousel[0]['niso_post_img_number'] : 6;

			if($niso_post_cat == 'all'){
				$terms ='';
				}
			else{
				$terms = array(
					array(
						'taxonomy'  => 'category',
						'field'  => 'slug',
						'terms'  => $niso_post_cat
					)
				);
			}
			$niso_post_slider= new WP_Query(array(
				'post_type'  		=>	'post',
				'post_status'  		=>	'publish',
				'ignore_sticky_posts'=>	1,
				'posts_per_page' 	=> $niso_post_img_number,
				'tax_query' 	    =>	$terms,
			));

		while ($niso_post_slider->have_posts()):
			$niso_post_slider->the_post();
			$categories = get_the_category();
			$category   = $categories[mt_rand(0,count( $categories)-1)];
			$catname  = $category->name;
			$catlink  = get_category_link($category);
			if(has_post_thumbnail()):
				
			?>
			<div class="item">
				<div class="niso-post-item">
					<div class="post-img">
						<a href="<?php the_permalink(); ?>"><?php the_post_thumbnail($img_size); ?></a>
					</div>
					<div class="post-text">
						<a href="<?php echo esc_url($catlink); ?>" class="niso-post-cat"><?php echo esc_html($catname ); ?></a>
						<h3><?php the_title(); ?></h3>
						<div class="meta">
								<span><?php esc_html_e('By: ','niso'); ?> <a href="<?php echo esc_url(get_author_posts_url(get_the_author_meta('ID'))); ?>"> <?php the_author(); ?></a></span>
								<span><?php echo get_the_date(); ?></span>
						</div>
					</div>
				</div>
			</div>
	<?php 
		endif;
		endwhile;

	}
endif;
 /*
 * video carousel get this function
 */
 if(!function_exists('niso_video_carousel_slider')):
 function niso_video_carousel_slider() {

    // Get the list of files
    $video_carousel = get_post_meta( get_the_ID(), 'video_carousel', 1 );
	$video_link =  !empty( $video_carousel[0]['video_link'])  ? $video_carousel[0]['video_link'] : '';
    // Loop through them and output an image
    foreach ((array) $video_link as  $key =>$video ) {
        echo '<div class="item-video">';
        echo '<a class="owl-video" href="'.$video.'"></a>';
        echo '</div>';
    }
}
endif;
 
if ( ! function_exists( 'nisoslider_carousel_shortcode' ) ) : 
function nisoslider_carousel_shortcode($atts, $content = null){
global $post;
ob_start();
    $niso_atts = shortcode_atts( array(
        'id'=> '',
    ), $atts );

	//Query args
	$args = array(
		'post_type'  		=>	'niso-carousel',
		'post_status'  		=>	'publish',
		'posts_per_page' 	=> 1,
		 'p'                => $niso_atts['id']
		
	);
	//start WP_Query
	$loop= new WP_Query($args);
	 
?>

	<?php if ($loop -> have_posts() ) : ?>
	<?php while ( $loop->have_posts()) :  $loop->the_post();
	$post_ID = $post->ID; 
	$all_images = get_post_meta( get_the_ID(), 'niso_img_carousel', true);
	$caption_group = get_post_meta( get_the_ID(), 'caption_group', true);
	$niso_post_carousel = get_post_meta( get_the_ID(), 'niso_post_carousel', true);
	$niso_post_cat =  !empty( $niso_post_carousel[0]['niso_post_cat'])  ? $niso_post_carousel[0]['niso_post_cat'] : 'no-carousel';


	$cap_image =  !empty( $caption_group[0]['cap_image'])  ? $caption_group[0]['cap_image'] : '';
	$files =  !empty( $all_images[0]['niso_images'])  ? $all_images[0]['niso_images'] : '';
	$settings = get_post_meta( get_the_ID(), 'carousel_settings', true);
	$niso_arrows_position =  !empty( $settings[0]['niso_arrows_position'])  ? $settings[0]['niso_arrows_position'] : 'nav3';

    $video_carousel = get_post_meta( get_the_ID(), 'video_carousel', 1 );
	$video_link =  !empty( $video_carousel[0]['video_link'])  ? $video_carousel[0]['video_link'] : '';

	?>
	<?php if($files): ?>
	<div id="niso-carousel-<?php echo esc_attr($post_ID); ?>" class="owl-carousel niso-carousel owl-theme <?php if($niso_arrows_position!=='nav'): ?>niso-theme <?php echo esc_attr($niso_arrows_position); ?><?php endif; ?>">
	<?php niso_carousel_slider_images(); ?>
	</div>
	<?php endif; ?>
	<?php if($cap_image): ?>
	<div id="niso-carousel-<?php echo esc_attr($post_ID); ?>" class="owl-carousel niso-carousel owl-theme <?php if($niso_arrows_position!=='nav'): ?>niso-theme <?php echo esc_attr($niso_arrows_position); ?><?php endif; ?>">
	<?php niso_carousel_caption_img(); ?>
	</div>
	<?php endif; ?>
	<?php if($video_link): ?>
	<div id="niso-carousel-<?php echo esc_attr($post_ID); ?>" class="owl-carousel niso-carousel owl-theme <?php if($niso_arrows_position!=='nav'): ?>niso-theme <?php echo esc_attr($niso_arrows_position); ?><?php endif; ?>">
	<?php niso_video_carousel_slider(); ?>
	</div>
	<?php endif; ?>
	<?php if($niso_post_cat != 'no-carousel'): ?>
	<div id="niso-carousel-<?php echo esc_attr($post_ID); ?>" class="owl-carousel niso-carousel owl-theme <?php if($niso_arrows_position!=='nav'): ?>niso-theme <?php echo esc_attr($niso_arrows_position); ?><?php endif; ?>">
	<?php niso_carousel_slider_post(); ?>
	</div>
	<?php endif; ?>
	
	
	<?php endwhile; ?> 
<?php wp_reset_postdata(); ?>
 <?php else: ?>
 <div class="niso-error">
 <h2><?php esc_html_e('No carousel found!','niso'); ?></h2>
 </div>
 <?php endif; ?>

 <?php 
 $niso_shortcode = ob_get_clean(); 
return $niso_shortcode;
}
add_shortcode('ncarousel','nisoslider_carousel_shortcode');
endif;
