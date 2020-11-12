<?php
namespace FooPlugins\FooBar\Renderers\Items;

use FooPlugins\FooBar\Renderers\Renderer;

/**
 * FooBar Message Item Renderer Class
 */

if ( !class_exists( 'FooPlugins\FooBar\Renderers\Items\Message' ) ) {

	class Message extends Item {
		function render( $args = null ) {
			$bar = $this->item->bar;

			$content = urldecode( $bar->get_meta( 'message_text', '' ) );

			$this->render_html_tag( 'span', array( 'class' => 'fbr-message' ), $content, false);

			if ( $bar->get_meta( 'message_show_link', 'yes' ) === 'yes' ) {
				$message_link_text = urldecode( $bar->get_meta( 'message_link_text' ) );

				if ( false !== $message_link_text ) {
					echo ' ';
					$this->render_html_tag( 'a', array(
						'target' => $bar->get_meta( 'message_link_target', '_self' ),
						'href' => esc_url( $bar->get_meta( 'message_link_url', '#' ) )
					), $message_link_text );
				}
			}

			echo '</span>';
		}
	}
}
