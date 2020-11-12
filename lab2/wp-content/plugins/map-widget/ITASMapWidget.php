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

?>

<script>

    var map;
    var myMarkers = [];

    function initMap() {
        var nanaimo = {lat: 49.159700, lng: -123.907750};
        map = new google.maps.Map(document.getElementById('itasmap'), {
            zoom: 13,
            center: nanaimo
        });

	<?php

		$post_list = get_posts( array(
   		 	'orderby'    => 'menu_order',
    		'sort_order' => 'asc'
		) );
 
		$posts = array();
 
		foreach ( $post_list as $post ) {

			$print = "ID: " . $post->ID . " Title: " . $post->post_title;

			// we have to retrieve the custom field as 'meta' data
		

			$lat = get_post_meta($post->ID, 'lat', true);
            $long = get_post_meta($post->ID, 'long', true);

            $print .= " Lat: [" . $lat . "] Long: [" . $long . "]";

            echo "\nvar myLatlng = new google.maps.LatLng($lat, $long);";
            echo "\nvar marker = new google.maps.Marker({	position: myLatlng, title:'Test House'});";
			echo "\nmarker.setMap(map);";		
			echo "\nconsole.log('Post info: $print')";
	
			
	
		}
		?>
		
	}
</script>

<div id="itasmap" style="width: 600px; height: 800px"></div>
<!-- <a href="#" id="get-data">Attack! (one round)</a>
<br>
<a href="#" id="reset">Reset</a> -->


<div id="show-data"></div>

<!-- NOTE this google map is using an ITAS Google Map key! Do not use for any of your private applications hosted live anywhere-->
<script async defer		
	src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAH2OFHcOiBzIrXvesoHTX77x_TRDlu7pI&callback=initMap">

</script>


	<?php

	
	}

	// output the option form field in admin Widgets screen
	public function form( $instance ) {
			
	
	}

	// save options
	public function update( $new_instance, $old_instance ) {}
}

