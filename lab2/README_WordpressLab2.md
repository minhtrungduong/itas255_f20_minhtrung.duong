# ITAS 255 Lab 2 - Wordpress
updated Oct. 20, 2020, dave croft
email: croftd@itas.ca

Note: this lab will be due at the end of class Nov. 4th

The intention for this lab is to create a Wordpress install for a realty setup where someone could create posts for houses with price, size, lat/long and images. If you want to adapt this assignment to a different domain (e.g. site for a custom home builder, site for takeout restaurants, site for parks in Nanaimo etc.) that is enouraged however you will need to be a bit more creative and at a minimum posts/content for the site should require lat/long co-ordinates and images.

## Part 1 - Basic Wordpress Setup 
Docker should be installed on your localhost and serving a Wordpress container using the supplied docker-compose.yml file - this should pull the latest version of Wordpress and have database ports/passwords configured for you
Choose a custom theme for your site (one that supports widgets - most do but some themes are weird)
Create 2 or more pages - these can be used to create menus. You might have an about page, privacy statement page, contact page etc. I know there is a trend towards having a single page applications that are more responsive for mobile use!
Create a menu that shows up at the top of your site, or sidebar, bottom (you can choose based on your theme)
Familiarize yourself with basic Wordpress functionality - how to add/edit posts, setup categories, change the theme etc.!

## Part 2 - Custom Fields, including lat and long

We will use the 'Advanced Custom Fields' plugin to allow each post to include a latitude and longitude. Note you don't necessarily need the custom fields plugin - you can still add custom fields when you edit a post somewhere in the menus - however I've found the Advanced Custom Fields plugin has better functionality.

Please install the ACF plugin (Advanced Custom Fields) and configure posts to include fields for 'lat' and 'long'. You will need to create a new custom fields group - you'll see there is a new 'Custom Fields' menu item on the left side of wordpress admin after you install the plugin. I called my new field group 'houseExtras' and added lat and long as number types.

Let's add three more custom fields to store the address for a house, the price, and the size (e.g. 2200 square feet).

## Part 3 - Review and configure the ITAS Widget Map plugin

I've started creating a custom plugin and widget to customize wordpress as a site for a realtor or custom home builder to show map markers on a map for houses. If you have another business/domain in mind for this lab, you are welcome to do something custom, however you might have to adapt your idea somewhat to meet the lab requirements 
(e.g. you will still be expectated to have a plugin that shows a map!)

Pull the latest changes on github - look for map-widget in the wp-content/plugins folder. Note see the class github repository for the lastest code/updates - I'm just putting the code examples in this README to help describe but the code if the repo will be the most recent.

```php

<?php
/**
 * Plugin Name: ITAS House
 * Description: ITAS 255 Plugin for custom House posts and the custom ITASMapWidget
 * Version:     0.1
 * Author:     started by croftd, made better by firstname.lastname
 */
// security measure to prevent people from running this script directly
defined( 'ABSPATH' ) or die( 'No script kiddies please!' );

require_once('ITASMapWidget.php');

// possibly you want to register some other custom actions here

// register ITASMapWidget - widgets_init is a pre-defined Wordpress hook
add_action( 'widgets_init', function(){
    register_widget( 'ITASMapWidget' );
});

```

See the plugins/map-widget folder and look for ITASMapWidget.php. The start of this file will look something like:

```php

<?php

// croftd - Widget should provide basic CRUD functionality
//
class ITASMapWidget extends WP_Widget {

	// class constructor
	public function __construct() {
		$widget_ops = array( 
				'classname' => 'ITASMapWidget',
				'description' => 'A plugin for a google map',
					);
		parent::__construct( 'ITASMapWidget', 'ITAS Map Widget', $widget_ops );	
	
	}
		
	// output the widget content on the front-end
	public function widget( $args, $instance ) {
		echo "Hello ITAS Map Widget!";	

        // TODO - either echo out or turn php off and insert the Google Map code from lab 1
        // After you've output the JavaScript and html divs etc. for the Google Map, turn php back on
	}

	// output the option form field in admin Widgets screen
	public function form( $instance ) {
			
        // TODO - this is for the widget admin interface, we will be adding support for options later
	}

	// save options
	public function update( $new_instance, $old_instance ) {
        
        // TODO - this allows the admin options to update
        // see: 
    }
}

```
After pulling the map-widget from the github repo and copying into your plugins folder, you should be able to activate the map plugin in the admin interface, and add the ITAS Map Widget to appear to your footer or one of your sidebars. Note your map won't work to show post locations with lat long if you don't have these added as custom fields - they need to be named precisely lat and long. Check your browser console for errors!
  
For reference, here is the data that is stored in the WP_Post class:

https://codex.wordpress.org/Class_Reference/WP_Post

The custom fields that we added were 'meta' fields, so you need to use the get_post_meta function, see the docs at:

https://developer.wordpress.org/reference/functions/get_post_meta/

Here is some sample code to get all the posts, return them in ascending order and retrieve some info for each post and log this to the console with JavaScript - be careful where you insert this. It has to be within the JavaScript initMap function if we want to access any Google Maps variables!

```php

// inside php widget function.. we have php turned off to declare the initMap function

function initMap() {
        var nanaimo = {lat: 49.159700, lng: -123.907750};
        map = new google.maps.Map(document.getElementById('itasmap'), {
            zoom: 13,
            center: nanaimo
        });

    // now turn PHP back on to get a list of all the posts!
    // note PHP is running within the initMap JavaScript function 
	<?php
        $post_list = get_posts( array(
   		 	'orderby'    => 'menu_order',
    		'sort_order' => 'asc'
		) );
 
		$posts = array();
 
		foreach ( $post_list as $post ) {
            
            // grab the post id and title
			      $print = "ID: " . $post->ID . " Title: " . $post->post_title;

			      // we have to retrieve the custom field as 'meta' data
            $print .= " Lat: " . get_post_meta($post->ID, 'lat', true);
            
            $lat = get_post_meta($post->ID, 'lat', true);
            $long = get_post_meta($post->ID, 'long', true);

            echo "<script>";
            // the n is the newline character to format how the JavaScript looks when we 'View Source'

			      echo "\nconsole.log('Post info: $print')";
            echo "\nvar myLatlng = new google.maps.LatLng($lat, $long);";

            // you'll need to also Create the marker
            // Add the marker to the google map variable with the setMap function

			      echo "</script>";

		}
```
If this part is completed properly and you've added lat and long to each post (with values) you should have Google Map markers showing up on the map-widget (If the map widget is enabled as a plugin).

To complete Part 3 - try adding one other piece of information to the Google Map marker - maybe the price or the address when you however over the marker?

## Part 4 - Display House images as gallery

There are different ways to solve this part - there are plugins that allow post images to render in a gallery, or you might be able to add CSS code to have house images display as a gallery rather than one after the other after the post content. There was a 'gallery' type that you used to be able to add to Advanced Custom Fields plugin, but I think this is a paid upgrade now. I'm happy to work together to try and figure out some good solutions for Part 4.

You might need to add additional custom fields to store multiple images for each post - it is OK if you restrict this to fixed number (e.g. each post is required to have a minimum of 3 images).

NOTE: I'm looking for each post to have it's own gallery, not a gallery widget that shows a fixed set of images somwhere on the site.

To support uploading larger images with my Wordpress install, I had to add the following into functions.php:

```php
@ini_set( 'upload_max_size' , '64M' );
@ini_set( 'post_max_size', '64M');
@ini_set( 'max_execution_time', '300' );
```

## Part 5 - SOLD Widget

To practice creating your own plugin/widget, let's remove the 'Archive' Widget from our site, and create a new 'Sold Houses' widget. Similar to how we retrieved all the houses for the Map widget, the Sold widget will get_post_meta($id, 'sold', true) for all the posts, and do something like display the last 5 houses that were sold. 

NOTE: You'll need to add a new Custom Field to store a boolean true/false or a 0/1 to store whether the house has been sold. 

Next, you'll create a new plugin folder and widget file the same way we did for the Map widget. 

In the Widget's widget() function, all you need to do is output information for the last five house that were sold! 

Something like:

```php
public function widget( $args, $instance ) {
	echo "Houses SOLD";	

    // haven't tested this.. but ordering by date will be something like:
    $post_list = get_posts( array(
   		 	'orderby'    => 'post_date',
    		'sort_order' => 'desc'
		) );
 
    $count = 0;
	foreach ( $post_list as $post ) {

        // now for each post - maybe echo out some html with the title and price sold, 
        // and echo out an anchor tag (href) to the 'permalink' showing the house details.

        // if you echo out details for a sold house, increment the $count variable
        // once you get to $count == 5, call return or break the loop as we only need to 
        // display max 5 houses that were sold
    }
}
```
Additional Reference:
  https://www.smashingmagazine.com/2015/04/building-custom-wordpress-archive-page/


## Part 6 - Custom Plugin or Widget

For the last part of the assignment, I'd like you to be creative and write your own custom plugin/widget for your Wordpress site. For example, I'll be working on a Widget to display one random house picture at the top of my site. The code to retrieve a random house picture would include something like:

```php
 function fetch_random_img($postid='') {
    global $wpdb;
    if (empty($postid))
    {
       //we are going for random post and random image
     $postid = $wpdb->get_var("SELECT ID FROM $wpdb->posts WHERE post_status = 'publish' ORDER BY RAND() LIMIT 1");
    }
    $imageid = $wpdb->get_var($wpdb->prepare("SELECT ID FROM wp_posts WHERE post_type='attachment' AND post_mime_type LIKE 'image/%' AND post_parent=$postid ORDER BY RAND() LIMIT 1"));
    if ($imageid) {
         echo wp_get_attachment_image( $imageid, 'full' );
    }
    else {
    return false;
    }

    }
  ```
  
Another idea might be to add a custom filter for comments and or post data to check for any bad words, and remove them or replace them with something like #!$% if present. For example, you can add an action hook to modify any post content with:

Looking at the Wordpress Codex, there appears to be a similar action hook for comments:

https://developer.wordpress.org/reference/hooks/comment_post/

Another idea might be to create a custom REST API that could be called from JavaScript to dynamically update something on your site:

https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/

## Part 7 - Other Site Customizations

Modify your theme, images, menu etc. to make your site more useful/realistic as a realty website (or other if doing a different idea). For example, change 'Recent Posts' to 'Recent Houses', use post_title to store the address of the house etc.. Adding additional realistic content/images often goes a long way.

##  Evaluation

Your Wordpress lab needs to be pushed to github.com (USE the same repo as for lab1, just add a new folder lab2_wordpress, git add etc.) and share with me to be marked!! Please provide a 3-5 minute video demonstration of your site and customizations.

Labs that are not on github and have me added as a collaborate will not be marked!

  2 marks - working Docker setup and basic Wordpress config
  2 marks - Part 2 - Advanced Custom Fields plugin configured and sample data for posts including lat and long etc.
  3 marks - Part 3 custom Google map widget that shows Google map markers for each of the houses including one additional piece of info from a custom field (e.g. each marker might show the address of the house when you hover over it). NOTE most of the code for the map widget is in the class github repository to show you how Widgets work!
  3 marks - Part 4 - house images show up as a Gallery with responsive scroller
  3 marks - Part 5 - SOLD Widget
  3 marks - Part 6 - Custom plugin or Widget - for full marks here I'm looking for something creative, hopefully useful and have some real PHP code, possibly database queries, custom Wordpress database table etc..
  3 marks - Part 7 - Other website customization (custom theme, extra plugins, CSS edits etc...)
  