<?php
/**
 * Plugin Name: ITAS Map Widget
 * Description: Example plugin to add a widget
 * Version:     0.1
 * Authoer:     croftd
 */

// security measure to prevent people from running this script directly
defined( 'ABSPATH' ) or die( 'No script kiddies please!' );

require_once('ITASMapWidget.php');
//require_once('CustomRoute.php');

/** 
 * Example plugin! Based on Pokemon Lab 1 from ITAS 255
 *
 * croftd: Oct. 2019
 */
// register My_Widget
add_action( 'widgets_init', function(){
    register_widget( 'ITASMapWidget' );
   // register_widget( 'CustomRoute' );
});
