<?php

/**
 * An settings container that will house fields
 */

namespace FooPlugins\FooBar\Admin\FooFields;

if ( ! class_exists( __NAMESPACE__ . '\SettingsPage' ) ) {

	abstract class SettingsPage extends Container {

		protected $settings_id;
		protected $page_title;
		protected $menu_parent_slug;
		protected $menu_title;
		protected $capability;
		protected $menu_position;

		function __construct( $config ) {
			parent::__construct( $config );

			$this->settings_id = $this->config['settings_id'];
			$this->page_title = isset( $this->config['page_title'] ) ? $this->config['page_title'] : __( 'Settings', $this->text_domain );
			$this->menu_parent_slug = isset( $this->config['menu_parent_slug'] ) ? $this->config['menu_parent_slug'] : 'options-general.php';
			$this->menu_title = isset( $this->config['menu_title'] ) ? $this->config['menu_title'] : __( 'Settings', $this->text_domain );
			$this->capability = isset( $this->config['capability'] ) ? $this->config['capability'] : 'manage_options';
			$this->menu_position = isset( $this->config['position'] ) ? $this->config['capability'] : null;

			//add the menu for the settings page
			add_action( 'admin_menu', array( $this, 'add_menu' ) );

			//enqueue assets needed for this metabox
			add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );

			//register settings
			add_action( 'admin_init', array( $this, 'init_settings' ) );
		}

		/**
		 * Validate the config to ensure we have everything for a metabox
		 */
		function validate_config() {
			parent::validate_config();

			if ( !isset( $this->config['settings_id'] ) ) {
				$this->add_config_validation_error( __( 'ERROR : There is no "settings_id" value set for the settings page, which means nothing will be saved!' ) );
			}
		}

		/**
		 * Get the data saved in the options table
		 *
		 * @return array|mixed
		 */
		function get_state() {
			if ( !isset( $this->state ) ) {

				//get the state from the post meta
				$state = get_option( $this->container_id() );

				if ( ! is_array( $state ) ) {
					$state = array();
				}

				$state = $this->apply_filters( 'get_state', $state );

				$this->state = $state;
			}

			return $this->state;
		}

		/**
		 * Builds up a simple identifier for the container
		 * @return mixed|string
		 */
		function container_id() {
			return $this->config['settings_id'] . '-settings';
		}

		/**
		 * Add menu to the tools menu
		 */
		public function add_menu() {
			add_submenu_page(
				$this->menu_parent_slug,
				$this->page_title,
				$this->menu_title,
				$this->capability,
				$this->container_id(),
				array( $this, 'render_settings_page' ),
				$this->menu_position
			);
		}

		/**
		 * Renders the contents for the settings page
		 */
		public function render_settings_page() {
			?>
			<div class="wrap">
				<h2><?php echo esc_html( $this->page_title ); ?></h2>
				<?php if ( function_exists( 'settings_errors' ) ) {
					settings_errors();
				} ?>
				<form action="options.php" method="post">
				<?php settings_fields( $this->container_id() ); ?>

					<?php $this->render_container(); ?>

					<p class="submit">
						<input name="submit" class="button-primary" type="submit"
						       value="<?php _e( 'Save Changes', $this->text_domain ); ?>"/>
						<input name="<?php echo $this->container_id(); ?>[reset-defaults]"
						       onclick="return confirm('<?php _e( 'Are you sure you want to restore all settings back to their default values?', $this->text_domain ); ?>');"
						       class="button-secondary" type="submit"
						       value="<?php _e( 'Restore Defaults', $this->text_domain ); ?>"/>
					</p>
				</form>
			</div>
<?php
		}

		/***
		 * Enqueue the assets needed by the metabox
		 *
		 * @param $hook_suffix
		 */
		function enqueue_assets( $hook_suffix ) {
			$screen = get_current_screen();

			//make sure we are on the correct post type page
			if ( is_object( $screen ) && strpos( $screen->id, $this->container_id() ) > 0 ) {
				// Register, enqueue scripts and styles here

				$this->enqueue_all();
			}
		}

		/**
		 * Override the container classes for metaboxes
		 *
		 * @return array
		 */
		function get_container_classes() {
			$classes = parent::get_container_classes();

			$classes[] = 'foofields-style-settings';

			return $classes;
		}

		/**
		 * Register settings
		 */
		function init_settings() {
			register_setting( $this->container_id(), $this->container_id(), array( 'sanitize_callback' => array($this, 'sanitize_callback') ) );
		}

		// validate our settings
		function sanitize_callback($input) {

			//check to see if the options were reset
			if ( isset ($input['reset-defaults']) ) {
				delete_option( $this->container_id() );
				add_settings_error(
					'reset',
					'reset_error',
					__( 'Settings restored to default values', $this->text_domain ),
					'updated'
				);

				return false;
			}

			return $input;
		}
	}
}
