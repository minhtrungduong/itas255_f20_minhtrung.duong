<?php
/**
 * cmb2 conditionals file
 * @link              http://digitalkroy.com/niso-carousel
 * @since             1.0.0
 * @package           Niso Carousel
 *
 *
*/

add_action('plugins_loaded', 'niso_cmb2_conditionals_load_actions');

function niso_cmb2_conditionals_load_actions()
{
	if(!defined('CMB2_LOADED') || false === CMB2_LOADED) {
		return;
	}

	define('NISO_CMB2_CONDITIONALS_PRIORITY', 99999);

	add_action('admin_init', 'niso_cmb2_conditionals_hook_data_to_save_filtering', NISO_CMB2_CONDITIONALS_PRIORITY);
	add_action('admin_footer', 'niso_cmb2_conditionals_footer', NISO_CMB2_CONDITIONALS_PRIORITY);
}

/**
 * Decides whether include the scripts or not.
 */
function niso_cmb2_conditionals_footer()
{
	global $pagenow;

    if(!in_array($pagenow, array('post-new.php', 'post.php'))) {
    	return;
    }

	wp_enqueue_script('cmb2-conditionals', plugins_url('/js/cmb2-conditionals.js', __FILE__ ), array('jquery'), '1.0.2', true);
}

/**
 * Hooks the filtering of the data being saved.
 */
function niso_cmb2_conditionals_hook_data_to_save_filtering()
{
	$cmb2_boxes = CMB2_Boxes::get_all();

	foreach($cmb2_boxes as $cmb_id => $cmb2_box) {
		add_action("cmb2_{$cmb2_box->object_type()}_process_fields_{$cmb_id}", 'niso_cmb2_conditional_filter_data_to_save', NISO_CMB2_CONDITIONALS_PRIORITY, 2);
	}
}

/**
 * Filters the data to remove those values which are not suppose to be enabled to edit according to the declared conditionals.
 */
function niso_cmb2_conditional_filter_data_to_save(CMB2 $cmb2, $object_id)
{
	foreach ( $cmb2->prop( 'fields' ) as $field_args ) {
		if(!(array_key_exists('attributes', $field_args) && array_key_exists('data-conditional-id', $field_args['attributes']))) {
			continue;
		}

		$field_id = $field_args['id'];
		$conditional_id = $field_args['attributes']['data-conditional-id'];

		if(
			array_key_exists('data-conditional-value', $field_args['attributes'])
		) {
			$conditional_value = $field_args['attributes']['data-conditional-value'];

			$conditional_value = ($decoded_conditional_value = @json_decode($conditional_value)) ? $decoded_conditional_value : $conditional_value;

			if(!isset($cmb2->data_to_save[$conditional_id])) {
				unset($cmb2->data_to_save[$field_id]);
				continue;
			}

			if(is_array($conditional_value) && !in_array($cmb2->data_to_save[$conditional_id], $conditional_value)) {
				unset($cmb2->data_to_save[$field_id]);
				continue;
			}

			if(!is_array($conditional_value) && $cmb2->data_to_save[$conditional_id] != $conditional_value) {
				unset($cmb2->data_to_save[$field_id]);
				continue;
			}
		}

		if(!isset($cmb2->data_to_save[$conditional_id]) || !$cmb2->data_to_save[$conditional_id]) {
			unset($cmb2->data_to_save[$field_id]);
			continue;
		}
	}
}
