<?php
/**
 * Plugin Name: Pokemon Content!
 * Description: Example plugin to add some Pokemon content to our Wordpress site
 * Version:     0.1
 * Authoer:     croftd
 */

// security measure to prevent people from running this script directly
defined( 'ABSPATH' ) or die( 'No script kiddies please!' );

/** 
 * Example plugin! Based on Pokemon Lab 1 from ITAS 255
 *
 * croftd: Oct. 2020
 */

// croftd: Wordpress defines specific actions, and if we register this plugin, whenever
// 'the_content' is fired, the pokemon function will get called.
//
add_action( 'the_content', 'pokemon' );

function pokemon ( $content ) {
    return $content .= '<p>Pokemon was here!</p>';
}
