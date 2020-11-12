<?php

return array(
	array(
		'foobar_demo_id' => 'welcome_message',
		'post_title' => 'Welcome Message',
		'post_status' => 'publish',
		'post_type' => FOOBAR_CPT_NOTIFICATION,
		'meta_input' => array(
			'_type' => 'message',
			'_settings' => array(
				'message_text' => urlencode( 'Welcome to our website 👋 Please enjoy your visit...' ),
				'message_show_link' => 'no',
				'message_link_target' => '_self',
				'color' => 'fbr-blue',
				'transition' => 'fbr-transition-slide',
				'toggle' => 'fbr-toggle-default',
				'toggle_action' => '',
				'toggle_position' => '',
				'layout' => 'fbr-layout-top',
				'visibility' => '',
				'open' => 'open',
				'layout_push' => 'yes',
			)
		)
	),
	array(
		'foobar_demo_id' => 'black_friday',
		'post_title' => 'Black Friday Specials CTA',
		'post_status' => 'publish',
		'post_type' => FOOBAR_CPT_NOTIFICATION,
		'meta_input' => array(
			'_type' => 'cta',
			'_settings' => array(
				'cta_text' => urlencode( '🤑🛒🎁Black Friday Special Now On! Massive discounts for ALL products' ),
				'cta_button_text' => 'Get 50% Off!',
				'cta_button_url' => '#black-friday',
				'cta_button_target' => '_self',
				'color' => 'fbr-dark',
				'transition' => '',
				'toggle' => 'fbr-toggle-none',
				'toggle_action' => '',
				'toggle_position' => '',
				'layout' => 'fbr-layout-top',
				'visibility' => '',
				'open' => 'open',
			)
		)
	),
	array(
		'foobar_demo_id' => 'cookie_notice',
		'post_title' => 'Cookie Notice',
		'post_status' => 'publish',
		'post_type' => FOOBAR_CPT_NOTIFICATION,
		'meta_input' => array(
			'_type' => 'cookie',
			'_settings' => array(
				'cookie_notice' => 'We use cookies to improve your user experience. If you continue to use this website, you will be providing consent to our use of cookies',
				'cookie_button_text' => 'Accept',
				'cookie_show_policy_link' => 'no',
				'cookie_policy_link_text' => 'Privacy Policy',
				'cookie_policy_link_url' => 'http://foo.dev.cc/privacy-policy/',
				'cookie_policy_link_target' => '_self',
				'color' => 'fbr-yellow',
				'transition' => 'fbr-transition-slide',
				'toggle' => 'fbr-toggle-none',
				'toggle_action' => '',
				'toggle_position' => '',
				'layout' => 'fbr-layout-bottom',
				'visibility' => '',
				'open' => 'open',
			)
		)
	),
	array(
		'foobar_demo_id' => 'policy_update',
		'post_title' => 'Privacy Policy Update Message',
		'post_status' => 'publish',
		'post_type' => FOOBAR_CPT_NOTIFICATION,
		'meta_input' => array(
			'_type' => 'message',
			'_settings' => array(
				'message_text' => 'PLEASE NOTE : We have updated our Privacy Policy',
				'message_show_link' => 'yes',
				'message_link_text' => 'read it now!',
				'message_link_url' => '#policy',
				'message_link_target' => '_blank',
				'color' => 'fbr-orange',
				'transition' => 'fbr-transition-slide',
				'toggle' => 'fbr-toggle-overlap',
				'toggle_action' => 'dismiss',
				'toggle_position' => '',
				'layout' => 'fbr-layout-bottom',
				'visibility' => '',
				'open' => 'closed'
			)
		)
	),
	array(
		'foobar_demo_id' => 'holiday',
		'post_title' => 'Holiday Closing Times',
		'post_status' => 'publish',
		'post_type' => FOOBAR_CPT_NOTIFICATION,
		'meta_input' => array(
			'_type' => 'message',
			'_settings' => array (
				'message_text' => urlencode( '🎅Between 13 Dec and 10 Jan, we close daily at 2pm. Happy Holidays!!! 🎉🍺' ),
				'message_show_link' => 'no',
				'message_link_target' => '_self',
				'color' => 'fbr-red',
				'transition' => 'fbr-transition-slide',
				'toggle' => 'fbr-toggle-none',
				'toggle_action' => '',
				'toggle_position' => '',
				'layout' => 'fbr-layout-bottom',
				'visibility' => '',
				'open' => 'open'
			)
		)
	),
	array(
		'foobar_demo_id' => 'product_launch',
		'post_title' => 'New Product Launch CTA',
		'post_status' => 'publish',
		'post_type' => FOOBAR_CPT_NOTIFICATION,
		'meta_input' => array(
			'_type' => 'cta',
			'_settings' => array(
				'cta_text' => urlencode( '🔥🔥🔥 Our New Product Just Launched 🚀Get 20% OFF' ),
				'cta_button_text' => 'Shop Now',
				'cta_button_url' => '#',
				'cta_button_target' => '_self',
				'color' => 'fbr-purple',
				'transition' => 'fbr-transition-slide-fade',
				'toggle' => 'fbr-toggle-overlap',
				'toggle_action' => '',
				'toggle_position' => '',
				'layout' => 'fbr-layout-top',
				'visibility' => '',
				'open' => 'open',
			)
		)
	),
);
