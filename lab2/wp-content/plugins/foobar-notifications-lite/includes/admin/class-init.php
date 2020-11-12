<?php
namespace FooPlugins\FooBar\Admin;

/**
 * FooBar Admin Init Class
 * Runs all classes that need to run in the admin
 */

if ( !class_exists( 'FooPlugins\FooBar\Admin\Init' ) ) {

	class Init {

		/**
		 * Init constructor.
		 */
		function __construct() {
			new namespace\Updates();
			new namespace\Settings();
			new namespace\Help();

			new namespace\Notification\Columns();
			new namespace\Notification\Preview();

			new namespace\Notification\MetaboxTypes();
			new namespace\Notification\MetaboxSettingsMessage();
			new namespace\Notification\MetaboxSettingsCallToAction();
			new namespace\Notification\MetaboxSettingsCookie();

			new namespace\Notification\MetaboxShortcode();
			new namespace\Notification\MetaboxPreview();
		}
	}
}
