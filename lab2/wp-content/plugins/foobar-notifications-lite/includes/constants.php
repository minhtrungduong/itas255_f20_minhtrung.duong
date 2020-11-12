<?php
/**
 * Contains the Global constants used throughout FooBar
 */

//options
define( 'FOOBAR_OPTION_DATA', 'foobar-settings' );
define( 'FOOBAR_OPTION_ENQUEUE_CACHE', 'foobar_enqueue_cache' );

//transients
define( 'FOOBAR_TRANSIENT_UPDATED', 'foobar_updated' );
define( 'FOOBAR_TRANSIENT_ACTIVATION_REDIRECT', 'foobar_redirect' );

//custom post types
define( 'FOOBAR_CPT_NOTIFICATION', 'foobar_notification' );

//post meta
define( 'FOOBAR_NOTIFICATION_META_TYPE', '_type' );
define( 'FOOBAR_NOTIFICATION_META_SETTINGS', '_settings' );
define( 'FOOBAR_NOTIFICATION_META_CUSTOM_CSS', '_custom_css' );

//other
define( 'FOOBAR_ADMIN_MENU_PARENT_SLUG', 'edit.php?post_type=foobar_notification' );
define( 'FOOBAR_ADMIN_MENU_HELP_SLUG', 'foobar-help' );
define( 'FOOBAR_ADMIN_MENU_PRICING_SLUG', 'foobar-notifications-lite-pricing' );
define( 'FOOBAR_FRONT_PREVIEW', 'foobar_show_preview' );
