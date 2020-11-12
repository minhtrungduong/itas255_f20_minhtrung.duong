<?php
namespace FooPlugins\FooBar\Renderers\Items;

use FooPlugins\FooBar\Renderers\Renderer;

/**
 * FooBar CallToAction Item Renderer Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Renderers\Items\CallToAction' ) ) {

	class CallToAction extends ButtonsItem {

		function render_content() {
			echo urldecode( $this->item->bar->get_meta( 'cta_text', '' ) );
		}

		function render_buttons() {
			$bar = $this->item->bar;
			$button_text = urldecode( $bar->get_meta( 'cta_button_text', '' ) );
			if ( !empty( $button_text ) ) {
				$this->render_html_tag( 'a', array(
					'class' => 'fbr-button fbr-button-mobile-100',
					'target' => $bar->get_meta( 'cta_button_target', '_self' ),
					'href' => esc_url( $bar->get_meta( 'cta_button_url', '' ) )
				), $button_text );
			}
		}
	}
}
