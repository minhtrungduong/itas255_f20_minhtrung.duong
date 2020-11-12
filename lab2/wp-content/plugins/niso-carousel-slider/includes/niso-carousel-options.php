<?php
/*
 * @link              http://digitalkroy.com/niso-carousel
 * @since             1.0.0
 * @package           niso carousel wordpress Plugin    
 * description        All jQuery options set here for carousel
 *
 * @  niso-carousel
 */

 if ( ! function_exists( 'nisoslid_carousel_scripts_add' ) ) :
 function nisoslid_carousel_scripts_add(){
  ?>
	<script type="text/javascript">
		(function ($) {
			"use strict";
			$(document).ready(function(){
			<?php
			global $post;
				//Query args
		$args = array(
		'post_type'  		=>	'niso-carousel',
		'posts_per_page' 	=> -1,
		);
	//start WP_Query
	$loop= new WP_Query($args);
	
	 while ( $loop->have_posts()) :  $loop->the_post();
	$post_ID = $post->ID;
	$settings = get_post_meta( get_the_ID(), 'carousel_settings', true);
	$video_carousel = get_post_meta( get_the_ID(), 'video_carousel', 1 );
	$video_link =  !empty( $video_carousel[0]['video_link'])  ? $video_carousel[0]['video_link'] : '';
	$niso_videoWidth =  !empty( $video_carousel[0]['niso_videoWidth'])  ? $video_carousel[0]['niso_videoWidth'] : '';
	$videoHeight =  !empty( $video_carousel[0]['videoHeight'])  ? $video_carousel[0]['videoHeight'] : '';
	$niso_img_number =  !empty( $settings[0]['niso_img_number'])  ? $settings[0]['niso_img_number'] : '4';
	$carousel_mode =  !empty( $settings[0]['carousel_mode'])  ? $settings[0]['carousel_mode'] : 'Multiple_active';
	$niso_img_medium =  !empty( $settings[0]['niso_img_medium'])  ? $settings[0]['niso_img_medium'] : '3';
	$niso_img_tab =  !empty( $settings[0]['niso_img_tab'])  ? $settings[0]['niso_img_tab'] : '2';
	$niso_margin_use =  !empty( $settings[0]['niso_margin_use'])  ? $settings[0]['niso_margin_use'] : 'margin_yes';
	$niso_item_margin =  !empty( $settings[0]['niso_item_margin'])  ? $settings[0]['niso_item_margin'] : '10';
	$niso_infinite =  !empty( $settings[0]['niso_infinite'])  ? $settings[0]['niso_infinite'] : '';
	$niso_autoplay =  !empty( $settings[0]['niso_autoplay'])  ? $settings[0]['niso_autoplay'] : 'auto_active';
	$autoplaySpeed =  !empty( $settings[0]['autoplaySpeed'])  ? $settings[0]['autoplaySpeed'] : '300';
	$autoplayTimeout =  !empty( $settings[0]['autoplayTimeout'])  ? $settings[0]['autoplayTimeout'] : '3000';
	$niso_HoverPause =  !empty( $settings[0]['niso_HoverPause'])  ? $settings[0]['niso_HoverPause'] : '';
	$smartSpeed =  !empty( $settings[0]['smartSpeed'])  ? $settings[0]['smartSpeed'] : '250';
	$niso_stagePadding =  !empty( $settings[0]['niso_stagePadding'])  ? $settings[0]['niso_stagePadding'] : '30';
	$niso_nav =  !empty( $settings[0]['niso_nav'])  ? $settings[0]['niso_nav'] : 'nav_hide';
	$niso_arrows_icons =  !empty( $settings[0]['niso_arrows_icons'])  ? $settings[0]['niso_arrows_icons'] : '5';
	$niso_navSpeed =  !empty( $settings[0]['niso_navSpeed'])  ? $settings[0]['niso_navSpeed'] : '300';
	$niso_dots =  !empty( $settings[0]['niso_dots'])  ? $settings[0]['niso_dots'] : 'dots_enable';
	$niso_dots_speed =  !empty( $settings[0]['niso_dots_speed'])  ? $settings[0]['niso_dots_speed'] : '250';
	$niso_center_mode =  !empty( $settings[0]['niso_center_mode'])  ? $settings[0]['niso_center_mode'] : 'mode_disable';
	$niso_scrollimage =  !empty( $settings[0]['niso_scrollimage'])  ? $settings[0]['niso_scrollimage'] : '1';
	$niso_mouseDrag =  !empty( $settings[0]['niso_mouseDrag'])  ? $settings[0]['niso_mouseDrag'] : '';
	$niso_touchDrag =  !empty( $settings[0]['niso_touchDrag'])  ? $settings[0]['niso_touchDrag'] : '';
	$niso_pullDrag =  !empty( $settings[0]['niso_pullDrag'])  ? $settings[0]['niso_pullDrag'] : '';
	$niso_freeDrag =  !empty( $settings[0]['niso_freeDrag'])  ? $settings[0]['niso_freeDrag'] : '';
	$niso_lazyLoad =  !empty( $settings[0]['niso_lazyLoad'])  ? $settings[0]['niso_lazyLoad'] : '';
	$niso_rtl =  !empty( $settings[0]['niso_rtl'])  ? $settings[0]['niso_rtl'] : '';
	$niso_startPosition =  !empty( $settings[0]['niso_startPosition'])  ? $settings[0]['niso_startPosition'] : '0';
	$niso_autoHeight =  !empty( $settings[0]['niso_autoHeight'])  ? $settings[0]['niso_autoHeight'] : '';
	$niso_mousewheel =  !empty( $settings[0]['niso_mousewheel'])  ? $settings[0]['niso_mousewheel'] : '';
	$niso_animateIn =  !empty( $settings[0]['niso_animateIn'])  ? $settings[0]['niso_animateIn'] : '';
	$niso_animateOut =  !empty( $settings[0]['niso_animateOut'])  ? $settings[0]['niso_animateOut'] : '';
	$niso_autoplay_single =  !empty( $settings[0]['niso_autoplay_single'])  ? $settings[0]['niso_autoplay_single'] : '';
	$niso_HoverPause_single =  !empty( $settings[0]['niso_HoverPause_single'])  ? $settings[0]['niso_HoverPause_single'] : '';
	$niso_lightbox =  !empty( $settings[0]['niso_lightbox'])  ? $settings[0]['niso_lightbox'] : 'lightbox_hide';
	$lightbox_effect =  !empty( $settings[0]['lightbox_effect'])  ? $settings[0]['lightbox_effect'] : 'slideLeft';

		?>
		$('#niso-carousel-<?php echo esc_attr($post_ID); ?>.owl-carousel').owlCarousel({
			<?php if($carousel_mode=='Multiple_active'): ?>
			//Multiple carousel settings
			items:<?php echo esc_attr($niso_img_number); ?>,
			<?php if($niso_margin_use=='margin_yes'): ?>
			margin:<?php echo esc_attr($niso_item_margin); ?>,
			<?php endif; ?>
			loop:<?php if($niso_infinite): ?>true<?php else: ?>false<?php endif; ?>,
			<?php if($niso_autoplay=='auto_active'): ?>
			autoplay:true,
			autoplaySpeed:<?php echo esc_attr($autoplaySpeed); ?>,
			autoplayTimeout:<?php echo esc_attr($autoplayTimeout); ?>,
			autoplayHoverPause:<?php if($niso_HoverPause): ?>true<?php else: ?>false<?php endif; ?>,
			slideBy:<?php echo esc_attr($niso_scrollimage ); ?>,
			<?php else: ?>
			autoplay:false,
			<?php endif; ?>
			smartSpeed:<?php echo esc_attr($smartSpeed); ?>,
			<?php if($niso_nav=='nav_active'): ?>
			nav:true,
			navSpeed:<?php echo esc_attr($niso_navSpeed); ?>,
			navText:['<i class="icon-left-<?php echo esc_attr($niso_arrows_icons); ?>"></i>','<i class="icon-right-<?php echo esc_attr($niso_arrows_icons); ?>"></i>'],
			<?php else: ?>
			nav:false,
			<?php endif; ?>
			<?php if($niso_dots=='dots_enable'): ?>
			dots:true,
			dotsSpeed:<?php echo esc_attr($niso_dots_speed); ?>,
			<?php else: ?>
			dots:false,
			<?php endif; ?>
			mouseDrag:<?php if($niso_mouseDrag): ?>true<?php else: ?>false<?php endif; ?>,
			touchDrag:<?php if($niso_touchDrag): ?>true<?php else: ?>false<?php endif; ?>,	
			pullDrag:<?php if($niso_pullDrag): ?>true<?php else: ?>false<?php endif; ?>,
			freeDrag:<?php if($niso_freeDrag): ?>true<?php else: ?>false<?php endif; ?>,
			<?php if($niso_center_mode=='mode_enable'): ?>
			center:true,
			stagePadding:<?php echo esc_attr($niso_stagePadding); ?>,
			<?php else: ?>
			center:false,
			stagePadding:0,
			<?php endif; ?>
			startPosition:<?php echo esc_attr($niso_startPosition); ?>,
            lazyLoad:<?php if($niso_lazyLoad): ?>true<?php else: ?>false<?php endif; ?>,
			rtl:<?php if($niso_rtl): ?>true<?php else: ?>false<?php endif; ?>,
			<?php if($video_link): ?>
			video:true,
		    videoHeight:<?php echo esc_attr($videoHeight); ?>,
			videoWidth:<?php echo esc_attr($niso_videoWidth); ?>,
			<?php else: ?>
			video:false,
			<?php endif; ?>
			autoHeight:<?php if($niso_autoHeight): ?>true<?php else: ?>false<?php endif; ?>,
			 responsive:{
				0:{
					items:1,
					nav:false
				},
				600:{
					items:<?php echo esc_attr($niso_img_tab); ?>,
				},
				960:{
					items:<?php echo esc_attr($niso_img_medium); ?>,
				},
				1300:{
					items:<?php echo esc_attr($niso_img_number); ?>,
				}
			}
		<?php else: ?>
		//Single carousel settings
			items:1,
			animateOut:'<?php echo esc_attr($niso_animateOut); ?>',
			animateIn:'<?php echo esc_attr($niso_animateIn); ?>',
			loop:<?php if($niso_infinite): ?>true<?php else: ?>false<?php endif; ?>,
			<?php if($niso_autoplay_single=='auto_active_single'): ?>
			autoplay:true,
			autoplayHoverPause:<?php if($niso_HoverPause_single): ?>true<?php else: ?>false<?php endif; ?>,
			<?php else: ?>
			autoplay:false,
			<?php endif; ?>
			smartSpeed:<?php echo esc_attr($smartSpeed); ?>,
			<?php if($niso_nav=='nav_active'): ?>
			nav:true,
			navSpeed:<?php echo esc_attr($niso_navSpeed); ?>,
			navText:['<i class="icon-left-<?php echo esc_attr($niso_arrows_icons); ?>"></i>','<i class="icon-right-<?php echo esc_attr($niso_arrows_icons); ?>"></i>'],
			<?php else: ?>
			nav:false,
			<?php endif; ?>
			<?php if($niso_dots=='dots_enable'): ?>
			dots:true,
			dotsSpeed:<?php echo esc_attr($niso_dots_speed); ?>,
			<?php else: ?>
			dots:false,
			<?php endif; ?>
			<?php if($niso_center_mode=='mode_enable'): ?>
			center:true,
			stagePadding:<?php echo esc_attr($niso_stagePadding); ?>,
			<?php else: ?>
			center:false,
			stagePadding:0,
			<?php endif; ?>
			mouseDrag:<?php if($niso_mouseDrag): ?>true<?php else: ?>false<?php endif; ?>,
			touchDrag:<?php if($niso_touchDrag): ?>true<?php else: ?>false<?php endif; ?>,	
			pullDrag:<?php if($niso_pullDrag): ?>true<?php else: ?>false<?php endif; ?>,
			freeDrag:<?php if($niso_freeDrag): ?>true<?php else: ?>false<?php endif; ?>,
			autoHeight:<?php if($niso_autoHeight): ?>true<?php else: ?>false<?php endif; ?>,
			<?php if($video_link): ?>
			video:true,
		    videoHeight:<?php echo esc_attr($videoHeight); ?>,
			videoWidth:<?php echo esc_attr($niso_videoWidth); ?>,
			<?php else: ?>
			video:false,
			<?php endif; ?>
			
			<?php endif; ?>
		})
		<?php if($niso_mousewheel): ?>
		//Mousewheel activation
		$('.owl-stage').addClass('niso-stage-<?php echo esc_attr($post_ID); ?>');
		var owl = $('#niso-carousel-<?php echo esc_attr($post_ID); ?>.owl-carousel');
		owl.on('mousewheel', '.niso-stage-<?php echo esc_attr($post_ID); ?>', function (e) {
			if (e.deltaY>0) {
				owl.trigger('next.owl');
			} else {
				owl.trigger('prev.owl');
			}
			e.preventDefault();
		});
		<?php endif; ?> 
<?php if($niso_lightbox=='lightbox_active'): ?>
$('#niso-carousel-<?php echo esc_attr($post_ID); ?>.niso-carousel .owl-item .item a').nivoLightbox({ 
    effect: '<?php echo esc_attr($lightbox_effect); ?>',
});
<?php endif; ?>

		<?php endwhile; ?> 
		<?php wp_reset_postdata(); ?>
			  });
		}(jQuery));	
    </script>
<?php 
}
 add_action('wp_footer','nisoslid_carousel_scripts_add',99);
endif;
 if ( ! function_exists( 'nisoslid_carousel_style_add' ) ) :
function nisoslid_carousel_style_add(){

			global $post;
				//Query args
		$args = array(
		'post_type'  		=>	'niso-carousel',
		'posts_per_page' 	=> -1,
		);
	//start WP_Query
	$loop= new WP_Query($args);?>
<style type="text/css"> 
<?php
	while ( $loop->have_posts()) :  $loop->the_post();
	$post_ID = $post->ID;
	$settings = get_post_meta( get_the_ID(), 'carousel_settings', true);
	$niso_post_carousel = get_post_meta( get_the_ID(), 'niso_post_carousel', true);
	$niso_dots_position =  !empty( $settings[0]['niso_dots_position'])  ? $settings[0]['niso_dots_position'] : 'center';
		$niso_arrows_margin =  !empty( $settings[0]['niso_arrows_margin'])  ? $settings[0]['niso_arrows_margin'] : '0';
	$niso_arrows_background =  !empty( $settings[0]['niso_arrows_background'])  ? $settings[0]['niso_arrows_background'] : '#111111';
	$niso_arrows_backhover =  !empty( $settings[0]['niso_arrows_backhover'])  ? $settings[0]['niso_arrows_backhover'] : '#555555';
	$niso_arrows_opaicty =  !empty( $settings[0]['niso_arrows_opaicty'])  ? $settings[0]['niso_arrows_opaicty'] : '80';
	$niso_arrows_color =  !empty( $settings[0]['niso_arrows_color'])  ? $settings[0]['niso_arrows_color'] : '#ffffff';
	$niso_arrow_color_hover =  !empty( $settings[0]['niso_arrow_color_hover'])  ? $settings[0]['niso_arrow_color_hover'] : '#cccccc';
	$carousel_margin =  !empty( $settings[0]['carousel_margin'])  ? $settings[0]['carousel_margin'] : '10';
	$niso_border_set =  !empty( $settings[0]['niso_border_set'])  ? $settings[0]['niso_border_set'] : 'border_hide';
	$niso_border =  !empty( $settings[0]['niso_border'])  ? $settings[0]['niso_border'] : '1';
	$niso_border_type =  !empty( $settings[0]['niso_border_type'])  ? $settings[0]['niso_border_type'] : 'solid';
	$niso_border_color =  !empty( $settings[0]['niso_border_color'])  ? $settings[0]['niso_border_color'] : '#111111';

if($niso_post_carousel):
$niso_post_img_height =  !empty( $niso_post_carousel[0]['niso_post_img_height'])  ? $niso_post_carousel[0]['niso_post_img_height'] : '';	
$img_height_set =  !empty( $niso_post_carousel[0]['img_height_set'])  ? $niso_post_carousel[0]['img_height_set'] : 'custom_height';	
$niso_post_img_height =  !empty( $niso_post_carousel[0]['niso_post_img_height'])  ? $niso_post_carousel[0]['niso_post_img_height'] : '350';	
if($img_height_set == 'custom_height'):
?>
#niso-carousel-<?php echo esc_attr($post_ID); ?>.niso-carousel .niso-post-item .post-img img{ 
height:<?php echo esc_attr($niso_post_img_height); ?>px;
}
<?php 
endif;
endif;
 ?>
#niso-carousel-<?php echo esc_attr($post_ID); ?>.niso-carousel{ 
margin:<?php echo esc_attr($carousel_margin); ?>px 0px;
}
#niso-carousel-<?php echo esc_attr($post_ID); ?>.niso-theme .owl-nav{ 
margin:0px 0px <?php echo esc_attr($niso_arrows_margin); ?>px 0px;
} 
#niso-carousel-<?php echo esc_attr($post_ID); ?>.owl-theme .owl-dots{ 
text-align:<?php echo esc_attr($niso_dots_position); ?>;
} 
#niso-carousel-<?php echo esc_attr($post_ID); ?>.owl-theme .owl-nav [class*="owl-"] i{ 
color: <?php echo esc_attr($niso_arrows_color); ?>;
} 
#niso-carousel-<?php echo esc_attr($post_ID); ?>.owl-theme .owl-nav [class*="owl-"] i:hover{ 
color: <?php echo esc_attr($niso_arrow_color_hover); ?>;
}
#niso-carousel-<?php echo esc_attr($post_ID); ?>.owl-theme .owl-nav [class*="owl-"] i:after{ 
background-color: <?php echo esc_attr($niso_arrows_background); ?>;
opacity: 0.<?php echo esc_attr($niso_arrows_opaicty ); ?>;
filter: alpha(opacity=<?php echo esc_attr($niso_arrows_opaicty ); ?>);
}
#niso-carousel-<?php echo esc_attr($post_ID); ?>.owl-theme .owl-nav [class*="owl-"] i:hover:after{ 
background-color: <?php echo esc_attr($niso_arrows_backhover); ?>;
}
<?php if($niso_border_set =='border_active'): ?>
#niso-carousel-<?php echo esc_attr($post_ID); ?>.niso-carousel .owl-item .item img{ 
border:<?php echo esc_attr ($niso_border); ?>px <?php echo esc_attr($niso_border_type); ?> <?php echo esc_attr($niso_border_color); ?>
}
<?php endif; ?>
html body .animated  {
  -webkit-animation-duration : 500000 ms  ;
  animation-duration : 500000 ms  ;
  -webkit-animation-fill-mode : both  ;
  animation-fill-mode : both  ;
}
<?php 
endwhile; 
 wp_reset_postdata(); ?>
 </style>
<?php 
}
add_action('wp_head','nisoslid_carousel_style_add',99);
endif;