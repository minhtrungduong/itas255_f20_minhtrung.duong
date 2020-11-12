<?php
namespace FooPlugins\FooBar\Renderers\Items;

use FooPlugins\FooBar\Renderers\Renderer;

/**
 * FooBar Cookie Item Renderer Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Renderers\Items\Cookie' ) ) {

	class Cookie extends ButtonsItem {

		function render_content() {
			$bar = $this->item->bar;
			echo urldecode( $bar->get_meta( 'cookie_notice', '' ) );
			if ( $bar->get_meta( 'cookie_show_policy_link', 'yes' ) === 'yes' ) {
				$cookie_policy_link_text = urldecode( $bar->get_meta( 'cookie_policy_link_text' ) );

				if ( false !== $cookie_policy_link_text ) {
					$this->render_html_tag( 'a', array(
						'target' => $bar->get_meta( 'cookie_policy_link_target', '_self' ),
						'href' => esc_url( $bar->get_meta( 'cookie_policy_link_url', '#' ) )
					), $cookie_policy_link_text );
				}
			}
		}

		function render_buttons() {
			$bar = $this->item->bar;
			$button_text = urldecode( $bar->get_meta( 'cookie_button_text', __( 'Accept', 'foobar' ) ) );

			if ( !empty( $button_text ) ) {
				$this->render_html_tag( 'a', array(
					'class' => 'fbr-button',
					'href' => '#accept',
					'data-foobar-action' => 'close'
				), $button_text );
			}
		}
	}
}
