<?php
/**
 * Include and setup custom metaboxes and fields. 
 *
 * @link              http://digitalkroy.com/niso-carousel
 * @since             1.0.0
 * @package          Niso Carousel
 *
 * @wordpress-plugin
 */
if ( ! function_exists( 'niso_cheackbox_default' ) ) :
function niso_cheackbox_default( $default ) {
    return isset( $_GET['post'] ) ? '' : ( $default ? (string) $default : '' );
}
endif;

if ( ! function_exists( 'niso_slider_get_term_options' ) ) : 
function niso_slider_get_term_options( $taxonomy ) {
 global $wp_version;
	if ( $wp_version >= 4.5 ) {
  	$args=array(
			'taxonomy' => $taxonomy,
			'orderby'    => 'count',
			'hide_empty' => 0,
		); 
		 $terms = get_terms($args ); 
	}else{ 
	$args=array(
		'orderby'    => 'count',
		'hide_empty' => 0,
		); 
	 $terms = get_terms( $taxonomy,$args ); 
		
		}
			
		$cat= array();
		$cat['no-carousel']= __('No post','news-box');
		$cat['all']= __('All posts','news-box');
		 if ( ! empty( $terms ) && ! is_wp_error( $terms ) ):
        foreach ($terms as $term) :
			$cat[$term->slug ] = esc_html($term->name);
        endforeach;
		endif;
		 
    return $cat; 
}
endif; 

//All meta show in tab
if ( ! function_exists( 'niso_slider_carousel_group_tab' ) ) :
add_action( 'cmb2_init', 'niso_slider_carousel_group_tab' );
function niso_slider_carousel_group_tab() {

	$niso_meta = new_cmb2_box( array(
		'id'           => 'metabox_tabs',
		'title'        => __('Niso carousel set-up','niso'),
		'object_types' => array('niso-carousel'), // post type
		'context'      => 'normal',
		'priority'     => 'high',
		'show_names'   => true // Show field names on the left
	) );

	$images_carousel = $niso_meta->add_field( array(
		'id'           => 'niso_img_carousel',
		'type'         => 'group',
		'repeatable'   => false,
		'before_group' => '<div class="tab-content" id="tab-1">',
		'after_group'  => '</div>',
		'options'      => array(
			'group_title'   => 'Image carousel',
			'sortable'      => false, // beta
			'show_as_tab'   => true
		)
	) );
	
	$niso_meta->add_group_field( $images_carousel, array(
		'name'         => __( 'Add carousel images', 'niso' ),
		'desc'         => __( 'Add your carousel images as you need.', 'niso' ),
		'id'           => 'niso_images',
		'type'         => 'file_list',
		'preview_size' => array( 100, 100 ), // Default: array( 50, 50 )
	) );

	//Inso post carousel 
	$post_carousel = $niso_meta->add_field( array(
		'id'           => 'niso_post_carousel',
		'type'         => 'group',
		'repeatable'   => false,
		'before_group' => '<div class="tab-content" id="tab-2">',
		'after_group'  => '</div>',
		'options'      => array(
			'group_title'   => __('Post carousel','niso'),
			'sortable'      => false, // beta
			'show_as_tab'   => true
		)
	) );
	
	$niso_meta->add_group_field( $post_carousel, array(
		'name'         => __( 'Select post category', 'niso' ),
		'desc'         => __( 'You can create post carousel by select category.', 'niso' ),
		'id'           => 'niso_post_cat',
		'type'             => 'pw_select',
		'default'             => 'no-carousel',
		'options'          => niso_slider_get_term_options('category')
	) );
	$niso_meta->add_group_field( $post_carousel, array(
		'name'         => __( 'Post number', 'niso' ),
		'desc'         => __( 'Set post number for carousel.', 'niso' ),
		'id'           => 'niso_post_img_number',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '20',
		'default'     => '6', // start value
		'value_label' => __('Images number:','niso'),
	) );
	$niso_meta->add_group_field( $post_carousel, array(
		'name'             => __( 'Select image height', 'niso' ),
		'desc'             => __( 'You can select cutom height or set auto height.', 'niso' ),
		'id'               => 'img_height_set',
		'type'             => 'pw_select',
		'default'             => 'custom_height',
		'options'          => array(
			'auto_height'   => __( 'Auto height', 'niso' ),
			'custom_height'   => __( ' Custom height', 'niso' ),
		),
		
	) );
	$niso_meta->add_group_field( $post_carousel, array(
		'name'         => __( 'Post image height', 'niso' ),
		'desc'         => __( 'Set post carousel image height.', 'niso' ),
		'id'           => 'niso_post_img_height',
		'type'        => 'own_slider',
		'min'         => '50',
		'max'         => '1000',
		'default'     => '350', // start value
		'value_label' => __('Images height:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'niso_post_carousel[{#}][img_height_set]',
			'data-conditional-value' => 'custom_height',

		)
	) );

	
	// carousel meta tab two caption carousel
	$images_carousel2 = $niso_meta->add_field( array(
		'id'           => 'caption_group',
		'type'         => 'group',
		'repeatable'   => true,
		'before_group' => '<div class="tab-content niso-caption" id="tab-3">',
		'after_group'  => '</div>',
		'options'      => array(
			'group_title'   => 'Caption carousel',
			'add_button'    => __( 'Add new item', 'cmb2' ),
             'remove_button' => __( 'Remove item', 'cmb2' ),
			'sortable'      => true, // beta
			'show_as_tab'   => true,
			
		),
		'fields'      => array(
		                    array(
					'name' => __( 'Add image', 'deejay' ),
					'desc'    => __( 'Add carousel image here.', 'niso' ),
    				'id'   => 'cap_image',
    				'type' => 'file',
					'preview_size' => array( 100, 100 ), 
					),
				array(
					'name' => __( 'Add image caption', 'deejay' ),
					'desc'    => __( 'Add carousel image caption here.', 'niso' ),
	    			'id'   => 'cap_text',
	    			'type' => 'text'
				),
	
			),
	) );

	//video carousel
	$video_carousel = $niso_meta->add_field( array(
		'id'           => 'video_carousel',
		'type'         => 'group',
		'repeatable'   => false,
		'before_group' => '<div class="tab-content" id="tab-4">',
		'after_group'  => '</div>',
		'options'      => array(
			'group_title'   => 'Video carousel',
			'sortable'      => false, // beta
			'show_as_tab'   => true

		)
	) );
	$niso_meta->add_group_field( $video_carousel, array(
		'name'             => __( 'Carousel video width', 'niso' ),
		'desc'             => __( 'Set carousel video width by px.', 'niso' ),
		'id'               => 'niso_videoWidth',
		'type'        => 'own_slider',
		'min'         => '0',
		'max'         => '1500',
		'default'     => '300', // start value
		'value_label' => __('px:','niso'),
	) );
	$niso_meta->add_group_field( $video_carousel, array(
		'name'             => __( 'Carousel video height', 'niso' ),
		'desc'             => __( 'Set carousel video height by px.', 'niso' ),
		'id'               => 'videoHeight',
		'type'        => 'own_slider',
		'min'         => '0',
		'max'         => '1000',
		'default'     => '300', // start value
		'value_label' => __('px:','niso'),
	) );
	$niso_meta->add_group_field( $video_carousel, array(
		'name'        => __( 'Enter video link', 'niso' ),
		'desc'        => __( 'Past or type from YouTube, Vimeo, or vzaar url.', 'niso' ),
		'id'          => 'video_link',
		'type' => 'oembed',
		'repeatable'   => true,
		'options'      => array(
			'add_row_text' => __( 'Add more video link', 'niso' ),
		),

	) );
	//carousel settings 
	$carousel_settings = $niso_meta->add_field( array(
		'id'           => 'carousel_settings',
		'type'         => 'group',
		'repeatable'   => false,
		'before_group' => '<div class="tab-content" id="tab-5">',
		'after_group'  => '</div>',
		'options'      => array(
			'group_title'   => 'Carousel settings',
			'sortable'      => false, // beta
			'show_as_tab'   => true

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( '', 'niso' ),
		'id'      => 'carousel_mode',
		'type'        => 'radio_inline',
		'default'     => 'Multiple_active', // default value
		'options'     =>array(
			'Multiple_active'        => __('Multiple images carousel','niso'),
			'Single_active'        => __('Single image slider','niso')
		),
	) );
	
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Select image size', 'niso' ),
		'desc'             => __( 'Select image size as you need.Video size set in video carousel page.', 'niso' ),
		'id'               => 'niso_img_multiple',
		'type'             => 'pw_select',
		'default'             => 'medium',
		'options'          => array(
			'medium'   => __( ' Medium ( 300px x 300px hard cropped )  ', 'niso' ),
			'xmedium'   => __( ' Extra medium ( 450px x 450px )  ', 'niso' ),
			'thumbnail' => __( 'Thumbnail ( 150px x 150px hard cropped )  ', 'niso' ),
			'large' => __( 'Large ( 1024px x 1024px max height 1024px )', 'niso' ),
			'full'     => __( 'Full (original size uploaded)', 'niso' ),
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );	
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Select image size', 'niso' ),
		'desc'             => __( 'Select image size as you need.Video size set in video carousel page.', 'niso' ),
		'id'               => 'niso_img_single',
		'type'             => 'pw_select',
		'default'             => 'big_slide',
		'options'          => array(
			'medium_slide'   => __( ' Medium slide (1300px x 400px)  ', 'niso' ),
			'big_slide'   => __( ' Large slide(1600px x 500px )  ', 'niso' ),
			'large' => __( 'Large ( 1024px x 1024px max height 1024px )', 'niso' ),
			'full'     => __( 'Full (original size uploaded)', 'niso' ),
			'xmedium'   => __( ' Small ( 450px x 450px )  ', 'niso' ),
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Single_active',

		)
	) );
		$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Single item animation in', 'niso' ),
		'desc'             => __( 'Select single item animation in', 'niso' ),
		'id'               => 'niso_animateIn',
		'type'             => 'pw_select',
		'default'          => 'fadeInDown',
		'options'          => array(
			'bounceIn'  	 => 'bounceIn',
			'bounceInDown'   	 => 'bounceInDown',
			'bounceInLeft'  	=> 'bounceInLeft',
			'bounceInRight'  	 => 'bounceInRight',
			'bounceInUp'  		 => 'bounceInUp',
			'fadeIn'   		=> 'fadeIn',
			'fadeInDown'  		 => 'fadeInDown',
			'fadeInDownBig'  	 => 'fadeInDownBig',
			'fadeInLeft'  		 => 'fadeInLeft',
			'fadeInLeftBig'  	 => 'fadeInLeftBig',
			'fadeInRight'  		 => 'fadeInRight',
			'fadeInRightBig' 	=> 'fadeInRightBig',
			'fadeInUp'  	 => 'fadeInUp',
			'fadeInUpBig'  	 => 'fadeInUpBig',
			'flip'  	 => 'flip',
			'flipInX'  	 => 'flipInX',
			'flipInY'  	 => 'flipInY',
			'lightSpeedIn' => 'lightSpeedIn',
			'rotateIn' => 'rotateIn',
			'rotateInDownLeft' => 'rotateInDownLeft',
			'rotateInDownRight' => 'rotateInDownRight',
			'rotateInUpLeft' => 'rotateInUpLeft',
			'rotateInUpRight' => 'rotateInUpRight',
			'slideInUp'   => 'slideInUp',
			'slideInDown'   => 'slideInDown',
			'slideInLeft'   => 'slideInLeft',
			'slideInRight'   => 'slideInRight',
			'zoomIn'   => 'zoomIn',
			'zoomInDown'   => 'zoomInDown',
			'zoomInLeft'   => 'zoomInLeft',
			'zoomInRight'   => 'zoomInRight',
			'zoomInUp'   => 'zoomInUp',
			'rollIn'   => 'rollIn',
			
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Single_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Single item animation Out', 'niso' ),
		'desc'             => __( 'Select single item animation Out', 'niso' ),
		'id'               => 'niso_animateOut',
		'type'             => 'pw_select',
		'default'          => 'fadeOutLeft',
		'options'          => array(
			'bounceOut'  	 => 'bounceOut',
			'bounceOutDown'   	 => 'bounceOutDown',
			'bounceOutLeft'  	=> 'bounceOutLeft',
			'bounceOutRight'  	 => 'bounceOutRight',
			'bounceOutUp'  		 => 'bounceOutUp',
			'fadeOut'   		=> 'fadeOut',
			'fadeOutDown'  		 => 'fadeOutDown',
			'fadeOutDownBig'  	 => 'fadeOutDownBig',
			'fadeOutLeft'  		 => 'fadeOutLeft',
			'fadeOutLeftBig'  	 => 'fadeOutLeftBig',
			'fadeOutRight'  		 => 'fadeOutRight',
			'fadeOutRightBig' 	=> 'fadeOutRightBig',
			'fadeOutUp'  	 => 'fadeOutUp',
			'fadeOutUpBig'  	 => 'fadeOutUpBig',
			'flipOutX'  	 => 'flipOutX',
			'flipOutY'  	 => 'flipOutY',
			'lightSpeedOut'  	 => 'lightSpeedOut',
			'rotateOut'  	 => 'rotateOut',
			'rotateOutDownLeft'   => 'rotateOutDownLeft',
			'rotateOutDownRight'   => 'rotateOutDownRight',
			'rotateOutUpLeft'   => 'rotateOutUpLeft',
			'rotateOutUpRight'   => 'rotateOutUpRight',
			'slideOutUp'   => 'slideOutUp',
			'slideOutDown'   => 'slideOutDown',
			'slideOutLeft'   => 'slideOutLeft',
			'slideOutRight'   => 'slideOutRight',
			'zoomOut'   => 'zoomOut',
			'zoomOutDown'   => 'zoomOutDown',
			'zoomOutLeft'   => 'zoomOutLeft',
			'zoomOutRight'   => 'zoomOutRight',
			'zoomOutUp'   => 'zoomOutUp',
			'rollOut'   => 'rollOut',
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Single_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Images show large screen', 'niso' ),
		'desc'    => __( 'Set images to show at a time in large screen', 'niso' ),
		'id'      => 'niso_img_number',
		'type'        => 'own_slider',
		'min'         => '2',
		'max'         => '10',
		'default'     => '4', // start value
		'value_label' => __('Images number:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Images show medium screen', 'niso' ),
		'desc'    => __( 'Set images to show at a time in medium screen.', 'niso' ),
		'id'      => 'niso_img_medium',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '10',
		'default'     => '3', // start value
		'value_label' => __('Images number:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Images show in tab', 'niso' ),
		'desc'    => __( 'Set images to show at a time in tab screen.', 'niso' ),
		'id'      => 'niso_img_tab',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '5',
		'default'     => '2', // start value
		'value_label' => __('Images number:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Use item margin', 'niso' ),
		'desc'    => __( 'You can hide or active auto play.', 'niso' ),
		'id'      => 'niso_margin_use',
		'type'        => 'radio_inline',
		'default'     => 'margin_no', // default value
		'options'     =>array(
			'margin_yes'        => 'Yes',
			'margin_no'        => 'No',
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Set carousel image item margin', 'niso' ),
		'desc'    => __( 'carousel image margin set by px.default margin 10px', 'niso' ),
		'id'      => 'niso_item_margin',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '50',
		'default'     => '10', // start value
		'value_label' => __('Margin:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_margin_use]',
			'data-conditional-value' => 'margin_yes',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Infinite loop', 'niso' ),
		'desc'    => __( 'Carousel infinite loop on of.', 'niso' ),
		'id'      => 'niso_infinite',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(true),
		
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel top bottom margin', 'niso' ),
		'desc'    => __( 'Carousel top bottom margin set by px', 'niso' ),
		'id'      => 'carousel_margin',
		'type'        => 'own_slider',
		'min'         => '0',
		'max'         => '100',
		'default'     => '10', // start value
		'value_label' => __('Margin:','niso'),
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel auto play', 'niso' ),
		'desc'    => __( 'You can hide or active auto play.', 'niso' ),
		'id'      => 'niso_autoplay_single',
		'type'        => 'radio_inline',
		'default'     => 'auto_active_single', // default value
		'options'     =>array(
			'auto_active_single'        => 'active',
			'auto_hide_single'        => 'Hide',
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Single_active',

		)
	) );
		$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Push on hover', 'niso' ),
		'desc'    => __( 'Push auto play when carousel hover.', 'niso' ),
		'id'      => 'niso_HoverPause_single',
		'type'        => 'checkbox',
		'default'     => niso_cheackbox_default( true ), // start value
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_autoplay_single]',
			'data-conditional-value' => 'auto_active_single',

		)		
	) );

	//multiple carousel auto start
		$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel auto play', 'niso' ),
		'desc'    => __( 'You can hide or active auto play.', 'niso' ),
		'id'      => 'niso_autoplay',
		'type'        => 'radio_inline',
		'default'     => 'auto_active', // default value
		'options'     =>array(
			'auto_active'        => 'active',
			'auto_hide'        => 'Hide',
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Auto play speed', 'niso' ),
		'desc'    => __( 'Set carousel auto play by milisecond ', 'niso' ),
		'id'      => 'autoplaySpeed',
		'type'        => 'own_slider',
		'min'         => '100',
		'max'         => '3000',
		'default'     => '300', // default value
		'value_label' => __('milisecond:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_autoplay]',
			'data-conditional-value' => 'auto_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Auto play speed time out', 'niso' ),
		'desc'    => __( 'Auto play speed time out by milisecond ', 'niso' ),
		'id'      => 'autoplayTimeout',
		'type'        => 'own_slider',
		'min'         => '100',
		'max'         => '5000',
		'default'     => '3000', // start value
		'value_label' => __('milisecond:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_autoplay]',
			'data-conditional-value' => 'auto_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Push on hover', 'niso' ),
		'desc'    => __( 'Push auto play when carousel hover.', 'niso' ),
		'id'      => 'niso_HoverPause',
		'type'        => 'checkbox',
		'default'     => niso_cheackbox_default( true ), // start value
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_autoplay]',
			'data-conditional-value' => 'auto_active',

		)		
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Image scroll at a time', 'niso' ),
		'desc'    => __( 'How many image scroll at a time in auto play.Not for single image carousel.', 'niso' ),
		'id'      => 'niso_scrollimage',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '10',
		'default'     => '1', // start value
		'value_label' => __('Images:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_autoplay]',
			'data-conditional-value' => 'auto_active',

		)		
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel smart speed', 'niso' ),
		'desc'    => __( 'Smart speed set by milisecond ', 'niso' ),
		'id'      => 'smartSpeed',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '1000',
		'default'     => '250', // start value
		'value_label' => __('milisecond:','niso'),
	) );

	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel navigation', 'niso' ),
		'desc'    => __( 'Show next/prev buttons.', 'niso' ),
		'id'      => 'niso_nav',
		'type'        => 'radio_inline',
		'default'     => 'nav_hide', // start value
		'options'     =>array(
			'nav_active'        => __('','niso'),
			'nav_hide'        => __('','niso')
		),
			
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Select navigation arrows icons', 'niso' ),
		'desc'             => __( 'Select icon for arrows navigation.', 'niso' ),
		'id'               => 'niso_arrows_icons',
		'type'             => 'radio_inline',
		'default'             => '1',
		'options'          => array(
			'1'   => __( ' Icon one', 'niso' ),
			'2'   => __( 'Icon two ', 'niso' ),
			'3'   => __( 'Icon three ', 'niso' ),
			'4'   => __( 'Icon four ', 'niso' ),
			'5'   => __( 'Icon five ', 'niso' ),
			'6'   => __( 'Icon six ', 'niso' ),
			'7'   => __( 'Icon seven ', 'niso' ),
			'8'   => __( 'Icon eight ', 'niso' ),
			'9'   => __( 'Icon nine ', 'niso' ),
			'10'   => __( 'Icon ten ', 'niso' ),
			'11'   => __( 'Icon eleven ', 'niso' ),
			'12'   => __( 'Icon twelve ', 'niso' ),
			'13'   => __( 'Icon thirteen ', 'niso' ),
			
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Set navigation arrows position', 'niso' ),
		'desc'             => __( 'You can set your navigation arrows position', 'niso' ),
		'id'               => 'niso_arrows_position',
		'type'             => 'pw_select',
		'default'             => 'nav3',
		'options'          => array(
			'nav'   => __( ' Default', 'niso' ),
			'nav3'   => __( 'Standard ', 'niso' ),
			'nav1'   => __( 'Top left ', 'niso' ),
			'nav2'   => __( 'Top right ', 'niso' ),
			'nav4'   => __( ' Bottom Right ', 'niso' ),
			'nav5'   => __( ' Bottom left', 'niso' ),
			
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Set arrow button top bottom margin', 'niso' ),
		'desc'             => __( 'You arrow button set right position by top bottom margin set.', 'niso' ),
		'id'               => 'niso_arrows_margin',
		'type'        => 'own_slider',
		'min'         => '-50',
		'max'         => '50',
		'default'     => '0', // start value
		'value_label' => __('Margin:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Arrows background color', 'niso' ),
		'desc'             => __( 'Set arrow icons background color .', 'niso' ),
		'id'               => 'niso_arrows_background',
		'type'    => 'colorpicker',
		'default' => '#111111',
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Arrows background hover color', 'niso' ),
		'desc'             => __( 'Set arrows icon background hover color .', 'niso' ),
		'id'               => 'niso_arrows_backhover',
		'type'    => 'colorpicker',
		'default' => '#555555',
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Arrows background opacity.', 'niso' ),
		'desc'             => __( 'Set arrows background opacity by number 0 to 99.', 'niso' ),
		'id'               => 'niso_arrows_opaicty',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '99',
		'default'     => '80', // start value
		'value_label' => __('opacity:0.','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Arrows icon color', 'niso' ),
		'desc'             => __( 'Set arrows icon color .', 'niso' ),
		'id'               => 'niso_arrows_color',
		'type'    => 'colorpicker',
		'default' => '#ffffff',
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Arrows icon hover color', 'niso' ),
		'desc'             => __( 'Set arrows icon hover color .', 'niso' ),
		'id'               => 'niso_arrow_color_hover',
		'type'    => 'colorpicker',
		'default' => '#cccccc',
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel navigation speed.', 'niso' ),
		'desc'    => __( 'Set carousel navigation.', 'niso' ),
		'id'      => 'niso_navSpeed',
		'type'        => 'own_slider',
		'min'         => '0',
		'max'         => '2000',
		'default'     => '300', // start value
		'value_label' => __('Milisecend:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_nav]',
			'data-conditional-value' => 'nav_active',

		)
			
	) );

	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel dots', 'niso' ),
		'desc'    => __( 'If you use dots click enable.', 'niso' ),
		'id'      => 'niso_dots',
		'type'    => 'radio_inline',
		'default'    => 'dots_enable',
		'options' => array(
			'dots_enable' => __( ' ', 'niso' ),
			'dots_disable' => __( ' ', 'niso' ),
		),
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Select dots position ', 'niso' ),
		'desc'    => __( 'You can set dots position right, left and center.', 'niso' ),
		'id'      => 'niso_dots_position',
		'type'             => 'pw_select',
		'default'             => 'center',
		'options'          => array(
			'center' => __( 'Center', 'niso' ),
			'left'   => __( 'Left', 'niso' ),
			'right' => __( 'Right ', 'niso' ),
		),
		'attributes' => array(
			'required' => true, // Will be required only if visible.
			'data-conditional-id' => 'carousel_settings[{#}][niso_dots]',
			'data-conditional-value' => 'dots_enable',
		)
	) );

	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Dots speed', 'niso' ),
		'desc'             => __( 'Set dots speed by number.', 'niso' ),
		'id'               => 'niso_dots_speed',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '1000',
		'default'     => '250', // start value
		'value_label' => __('Milisecend:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_dots]',
			'data-conditional-value' => 'dots_enable',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel center mode', 'niso' ),
		'desc'    => __( 'Enables centred view with partial prev/next slides. Use with odd numbered slidesToShow counts.', 'niso' ),
		'id'      => 'niso_center_mode',
		'type' => 'radio_inline',
		'default'     => 'mode_disable', // start value
		'options'          => array(
			'mode_enable' => __( 'Enable', 'niso' ),
			'mode_disable'   => __( 'Disable', 'niso' ),
		),
	
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Center mode padding', 'niso' ),
		'desc'    => __( 'Padding left and right on stage (can see neighbours). ', 'niso' ),
		'id'      => 'niso_stagePadding',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '150',
		'default'     => '50', // start value
		'value_label' => __('Px:','niso'),
		'attributes' => array(
			'required' => true, // Will be required only if visible.
			'data-conditional-id' => 'carousel_settings[{#}][niso_center_mode]',
			'data-conditional-value' => 'mode_enable',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel image border', 'niso' ),
		'desc'    => __( 'You may use border in carousel items.', 'niso' ),
		'id'      => 'niso_border_set',
		'type'        => 'radio_inline',
		'default'     => 'border_hide', // default value
		'options'     =>array(
			'border_active'        => 'active',
			'border_hide'        => 'Hide',
		),
		
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Border', 'niso' ),
		'desc'    => __( 'Border set by px.Default border 1px', 'niso' ),
		'id'      => 'niso_border',
		'type'        => 'own_slider',
		'min'         => '1',
		'max'         => '20',
		'default'     => '1', // start value
		'value_label' => __('Px:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_border_set]',
			'data-conditional-value' => 'border_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Border type', 'niso' ),
		'desc'    => __( 'This setting only caption carousel.', 'niso' ),
		'id'      => 'niso_border_type',
		'type'             => 'pw_select',
		'default'             => 'solid',
		'options'          => array(
			'solid'   => __( 'Solid', 'niso' ),
			'dotted' => __( 'Dotted', 'niso' ),
		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_border_set]',
			'data-conditional-value' => 'border_active',
		)

	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Border color', 'niso' ),
		'desc'             => __( 'Set your border color.', 'niso' ),
		'id'               => 'niso_border_color',
		'type'    => 'colorpicker',
		'default' => '#111111',
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_border_set]',
			'data-conditional-value' => 'border_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Carousel image Lightbox', 'niso' ),
		'desc'    => __( 'You may use image Lightbox.This lightbox not support in video carousel.', 'niso' ),
		'id'      => 'niso_lightbox',
		'type'        => 'radio_inline',
		'default'     => 'lightbox_hide', // default value
		'options'     =>array(
			'lightbox_active'        => 'active',
			'lightbox_hide'        => 'Hide',
		),
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Select image lightbox effect', 'niso' ),
		'desc'             => __( 'Select image lightbox effect as you need.', 'niso' ),
		'id'               => 'lightbox_effect',
		'type'             => 'pw_select',
		'default'             => 'slideLeft',
		'options'          => array(
			'fade'   => __( 'Fade', 'niso' ),
			'fadeScale'   => __( 'Fade scale', 'niso' ),
			'slideLeft'   => __( 'Slide left', 'niso' ),
			'slideRight'   => __( 'Slide right', 'niso' ),
			'slideUp'   => __( 'slide up', 'niso' ),
			'slideDown'   => __( 'Slide down', 'niso' ),
			'fall'   => __( 'Fall', 'niso' ),

		),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][niso_lightbox]',
			'data-conditional-value' => 'lightbox_active',
		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name' => __( 'Mouse drag', 'niso' ),
		'desc'    => __( 'Mouse dragging feature .', 'niso' ),
		'id'   => 'niso_mouseDrag',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(true),

	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name' => __( 'Touch drag', 'niso' ),
		'desc'    => __( 'Touch dragging feature.', 'niso' ),
		'id'   => 'niso_touchDrag',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(true),

	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name' => __( 'Pull drag', 'niso' ),
		'desc'    => __( 'Stage pull to edge.', 'niso' ),
		'id'   => 'niso_pullDrag',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(true),

	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name' => __( 'Free drag', 'niso' ),
		'desc'    => __( 'Item pull to edge.', 'niso' ),
		'id'   => 'niso_freeDrag',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(false),

	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name' => __( 'Auto height', 'niso' ),
		'desc'    => __( 'upload different height image for auto height.', 'niso' ),
		'id'   => 'niso_autoHeight',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(false),

	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name' => __( 'Active mousewheel scrolling', 'niso' ),
		'desc'    => __( 'add mouswheel scrolling for fantastic scroll.', 'niso' ),
		'id'   => 'niso_mousewheel',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(false),
		
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name' => __( 'Lazy load', 'niso' ),
		'desc'    => __( 'Lazy load images.Lazy load not for video carousel.', 'niso' ),
		'id'   => 'niso_lazyLoad',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(false),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name' => __( 'Rtl', 'niso' ),
		'desc'    => __( 'Slider right to left direction.', 'niso' ),
		'id'   => 'niso_rtl',
		'type' => 'checkbox',
		'default'  => niso_cheackbox_default(false),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'             => __( 'Carousel start position', 'niso' ),
		'desc'             => __( 'Set Start position by number.', 'niso' ),
		'id'               => 'niso_startPosition',
		'type'        => 'own_slider',
		'min'         => '0',
		'max'         => '10',
		'default'     => '0', // start value
		'value_label' => __('number:','niso'),
		'attributes' => array(
			'data-conditional-id' => 'carousel_settings[{#}][carousel_mode]',
			'data-conditional-value' => 'Multiple_active',

		)
	) );	
	$niso_meta->add_group_field( $carousel_settings, array(
		'name'    => __( 'Select caption style', 'niso' ),
		'desc'    => __( 'This setting only caption carousel.', 'niso' ),
		'id'      => 'niso_caption_style',
		'type'             => 'pw_select',
		'default'             => 'simple',
		'options'          => array(
			'simple'   => __( 'Simple caption', 'niso' ),
			'niso-hover' => __( 'Hover caption', 'niso' ),
		),

	) );
	$images_carousel = $niso_meta->add_field( array(
		'id'           => 'niso_pro',
		'type'         => 'group',
		'repeatable'   => false,
		'before_group' => '<div class="tab-content tab-pro" id="tab-6">',
		'after_group'  => '</div>',
		'options'      => array(
			'group_title'   => 'Niso pro',
			'sortable'      => false, // beta
			'show_as_tab'   => true
		)
	) );
	
	$niso_meta->add_group_field( $images_carousel, array(
		'name'       => __( 'Niso Carousel', 'niso' ),
        'desc'       => __( ' 
        <div class="niso-prolink"> 
            <div class="niso-pro-img">
                <a href="https://wpthemespace.com/product/niso-carousel/" target="_blank"> <img src="'.plugin_dir_url( dirname( __FILE__ ) ) . 'assets/img/niso-carousel-pro.jpg'.'" alt="Niso Carousel pro" /></a>
            </div>
            <a class="niso-button" href="https://wpthemespace.com/product/niso-carousel/" target="_blank">View details</a>
        </div>
        

        ', 'niso' ),
        'id'         => 'pro_link',
        'type'       => 'text',
        //'show_on_cb' => 'cmb2_hide_if_no_cats', // function should 
	) );	
	$niso_meta->add_field( array(
		'name'       => __( '', 'niso' ),
        'desc'       => __( ' 
        <div class="niso-prolink"> 
            <a class="niso-button" href="http://plugin.wpthemespace.com/niso-doc/" target="_blank">Documentation</a>
        </div>
        

        ', 'niso' ),
        'id'         => 'niso_doc_link',
        'type'       => 'text',
        //'show_on_cb' => 'cmb2_hide_if_no_cats', // function should 
	) );

}
endif;




if(!function_exists('wpspace_notice__error')){
//Admin notice 
function wpspace_notice__error() {
	
    if(get_option('nisonotice34')){
        return;
    }
	$class = 'niso-notice notice notice-warning is-dismissible';
	$message = __( '<strong><span>Hurry up:</span> Upgrade Niso Carousel Pro For Lifetime With Nominal Price. And get Pro Update, unlimited features with Post Carousel, Product Carousel, Portfolio Carousel, Services Carousel, Team Carousel and regular image Carousel. </strong>', 'niso' );
    $url1 = esc_url('http://wpthemespace.com/product/niso-carousel/');
    $url2 =esc_url('http://plugin.wpthemespace.com/');

	printf( '<div class="%1$s" style="padding:10px 15px 20px;text-transform:uppercase"><p>%2$s</p><a target="_blank" class="button button-danger" href="%3$s" style="margin-right:10px">'.__('Upgrade Pro','niso').'</a><a target="_blank" class="button button-primary" href="%4$s">'.__('Show Demo','niso').'</a><a style="margin-left:10px;cursor: pointer;" class="niso-dismiss">Dissimiss the notice</a></div>', esc_attr( $class ), wp_kses_post( $message ),$url1,$url2 ); 
}
add_action( 'admin_notices', 'wpspace_notice__error' );


} // end function_exists

if(!function_exists('wpspace_admin_notice_option')){
function wpspace_admin_notice_option(){
    if(isset($_GET['nhede']) && $_GET['nhede'] == 1 ){
        update_option( 'nisonotice34', 1);
    }
}
add_action('init','wpspace_admin_notice_option');
}


if( !function_exists('wpspace_admin_notice_mplugin')):
add_action( 'admin_notices', 'wpspace_admin_notice_mplugin' );
    function wpspace_admin_notice_mplugin() {
        global $pagenow;
    
        if(get_option('nnmagic2') ||  $pagenow  == 'themes.php' || $pagenow  == 'plugins.php'){
        return;
        }

        if ( isset( $_GET['activate'] ) ) unset( $_GET['activate'] );

        
        if (! file_exists( WP_PLUGIN_DIR . '/magical-posts-display/magical-posts-display.php' ) ) {

                $magial_einstall_url =  wp_nonce_url( self_admin_url( 'update.php?action=install-plugin&plugin=magical-posts-display' ), 'install-plugin_magical-posts-display' );
                    $wpnmessage = sprintf(
                    /* translators: 1: Plugin name 2: Elementor 3: Elementor installation link */
                    esc_html__( 'Best WordPress posts display plugin %1$s, Install and show your posts awesome way  %2$s', 'niso' ),
                    '<strong>' . esc_html__( 'Magical post display', 'niso' ) . '</strong>',
                    '<a class="button button-primary" style="margin-left:20px" href="'.$magial_einstall_url.'">' . __( 'Install Magical posts Display', 'niso' ) . '</a>'

                );
            printf( '<div class="notice notice-warning" style="padding: 13px 10px"><p>%1$s</p><button class="nothanks nothanks-dismiss">%2$s</button> <a style="margin-left:5px" href="%3$s" class="button-primary">%4$s</a></div> ', $wpnmessage,esc_html__('No Thanks','niso'),$magial_einstall_url,esc_html__('Install Now','niso') );

            
        }

    }
endif;

if( !function_exists('nisocarousel_hide_anotice')):
function nisocarousel_hide_anotice(){
    if(isset($_GET['dismissed']) && $_GET['dismissed'] == 1 ){
        update_option( 'nnmagic2', 1);
    }
}
add_action('init','nisocarousel_hide_anotice');
endif;
