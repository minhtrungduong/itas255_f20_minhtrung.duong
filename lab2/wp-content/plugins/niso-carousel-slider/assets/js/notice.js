;(function($){
	$(document).ready(function(){
    	$('.niso-dismiss').on('click',function(){
            var url = new URL(location.href);
            url.searchParams.append('nhede',1);
            location.href= url;
        });
    	$('.nothanks-dismiss').on('click',function(){
            var url = new URL(location.href);
            url.searchParams.append('dismissed',1);
            location.href= url;
        });
	});
})(jQuery);