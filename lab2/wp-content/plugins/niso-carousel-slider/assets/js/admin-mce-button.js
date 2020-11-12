(function() {
	tinymce.PluginManager.add('niso_sbutton', function( editor, url ) {
		editor.addButton( 'niso_sbutton', {
			text: '',
			icon: 'nc-icon',
			type: 'menubutton',
			menu: [
					{
						text: 'Add carousel',
						onclick: function() {
							editor.windowManager.open( {
							title: 'Insert your carousel shortcode',
							body: [
								{
									type: 'listbox',
									name: 'select_carousel',
									label: 'select carousel',
									values: post_id
								}
							
								
								
									],
									onsubmit: function( e ) {
										editor.insertContent(e.data.select_carousel );
									}
								});
							}
						}

						
			]
		});
	});
})();
