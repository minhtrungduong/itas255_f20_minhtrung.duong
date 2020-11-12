(function ($) {
	"use strict";
	$(document).ready(function(){
    $("#carousel_settings_0_carousel_mode1").attr("data-labelauty","Multiple images carousel");
    $("#carousel_settings_0_carousel_mode2").attr("data-labelauty","Single image carousel");
    $("#carousel_settings_0_niso_autoplay1").attr("data-labelauty","Active");
    $("#carousel_settings_0_niso_autoplay2").attr("data-labelauty","Hide");
    $("#carousel_settings_0_niso_autoplay_single1").attr("data-labelauty","Active");
    $("#carousel_settings_0_niso_autoplay_single2").attr("data-labelauty","Hide");

    $("#carousel_settings_0_niso_margin_use1").attr("data-labelauty","Yes");
    $("#carousel_settings_0_niso_margin_use2").attr("data-labelauty","No");

    $("#carousel_settings_0_niso_nav1").attr("data-labelauty","Active");
    $("#carousel_settings_0_niso_nav2").attr("data-labelauty","Hide");

    $("#carousel_settings_0_niso_dots1").attr("data-labelauty","Active");
    $("#carousel_settings_0_niso_dots2").attr("data-labelauty","Hide");

    $("#carousel_settings_0_niso_border_set1").attr("data-labelauty","Active");
    $("#carousel_settings_0_niso_border_set2").attr("data-labelauty","Hide");
    $("#carousel_settings_0_niso_lightbox1").attr("data-labelauty","Active");
    $("#carousel_settings_0_niso_lightbox2").attr("data-labelauty","Hide");


    $("#carousel_settings_0_niso_center_mode1").attr("data-labelauty","Active");
    $("#carousel_settings_0_niso_center_mode2").attr("data-labelauty","Hide");


    $("#carousel_settings_0_niso_arrows_icons1").attr("data-labelauty","<i class=\"icon-left-1\"></i><i class=\"icon-right-1\"></i>");
	
    $("#carousel_settings_0_niso_arrows_icons2").attr("data-labelauty","<i class=\"icon-left-2\"></i><i class=\"icon-right-2\"></i>");
    $("#carousel_settings_0_niso_arrows_icons3").attr("data-labelauty","<i class=\"icon-left-3\"></i><i class=\"icon-right-3\"></i>");
    $("#carousel_settings_0_niso_arrows_icons4").attr("data-labelauty","<i class=\"icon-left-4\"></i><i class=\"icon-right-4\"></i>");
    $("#carousel_settings_0_niso_arrows_icons5").attr("data-labelauty","<i class=\"icon-left-5\"></i><i class=\"icon-right-5\"></i>");
    $("#carousel_settings_0_niso_arrows_icons6").attr("data-labelauty","<i class=\"icon-left-6\"></i><i class=\"icon-right-6\"></i>");
    $("#carousel_settings_0_niso_arrows_icons7").attr("data-labelauty","<i class=\"icon-left-7\"></i><i class=\"icon-right-7\"></i>");
    $("#carousel_settings_0_niso_arrows_icons8").attr("data-labelauty","<i class=\"icon-left-8\"></i><i class=\"icon-right-8\"></i>");
    $("#carousel_settings_0_niso_arrows_icons9").attr("data-labelauty","<i class=\"icon-left-9\"></i><i class=\"icon-right-9\"></i>");
    $("#carousel_settings_0_niso_arrows_icons10").attr("data-labelauty","<i class=\"icon-left-10\"></i><i class=\"icon-right-10\"></i>");
    $("#carousel_settings_0_niso_arrows_icons11").attr("data-labelauty","<i class=\"icon-left-11\"></i><i class=\"icon-right-11\"></i>");
    $("#carousel_settings_0_niso_arrows_icons12").attr("data-labelauty","<i class=\"icon-left-12\"></i><i class=\"icon-right-12\"></i>");
    $("#carousel_settings_0_niso_arrows_icons13").attr("data-labelauty","<i class=\"icon-left-13\"></i><i class=\"icon-right-13\"></i>");

    

	
    $("[name='carousel_settings[0][carousel_mode]']").labelauty({ minimum_width: "80px" });
    $("[name='carousel_settings[0][niso_autoplay_single]']").labelauty({ minimum_width: "80px" });
    $("[name='carousel_settings[0][niso_autoplay]']").labelauty({ minimum_width: "80px" });
    $("[name='carousel_settings[0][niso_nav]']").labelauty({ minimum_width: "80px"});
    $("[name='carousel_settings[0][niso_margin_use]']").labelauty({ minimum_width: "80px"});
    $("[name='carousel_settings[0][niso_dots]']").labelauty({ minimum_width: "80px"});
    $("[name='carousel_settings[0][niso_center_mode]']").labelauty({ minimum_width: "80px"});
    $("[name='carousel_settings[0][niso_arrows_icons]']").labelauty({ minimum_width: "80px"});
    $("[name='carousel_settings[0][niso_border_set]']").labelauty({ minimum_width: "80px"});
    $("[name='carousel_settings[0][niso_lightbox]']").labelauty({ minimum_width: "80px"});

 $('html body #carousel_settings_repeat .cmb2-id-carousel-settings-0-niso-HoverPause-single').addClass('niso-none');

 $('ul.cmb2-radio-list li input#carousel_settings_0_carousel_mode1').on('click', function() { 
 $('.cmb2-id-carousel-settings-0-niso-HoverPause-single').addClass('niso-none'); 
 $('html body #carousel_settings_repeat .cmb2-id-carousel-settings-0-niso-item-margin').removeClass('niso-none'); 
 $('.cmb2-id-carousel-settings-0-autoplaySpeed').removeClass('niso-none');
 $('.cmb2-id-carousel-settings-0-autoplayTimeout').removeClass('niso-none');
 $('.cmb2-id-carousel-settings-0-niso-HoverPause').removeClass('niso-none');
 $('.cmb2-id-carousel-settings-0-niso-scrollimage').removeClass('niso-none');

});   
 $('ul.cmb2-radio-list li input#carousel_settings_0_carousel_mode2').on('click', function() { 
  $('.cmb2-id-carousel-settings-0-autoplaySpeed').addClass('niso-none');
 $('.cmb2-id-carousel-settings-0-autoplayTimeout').addClass('niso-none');
 $('.cmb2-id-carousel-settings-0-niso-HoverPause').addClass('niso-none');
 $('.cmb2-id-carousel-settings-0-niso-scrollimage').addClass('niso-none');
   $('html body #carousel_settings_repeat .cmb2-id-carousel-settings-0-niso-item-margin').addClass('niso-none'); 

 $('.cmb2-id-carousel-settings-0-niso-HoverPause-single').removeClass('niso-none');

}); 
 //notice hide
$('.niso-dismiss').on('click',function(){
            var url = new URL(location.href);
            url.searchParams.append('nhede',1);
            location.href= url;
        });
  
	});
}(jQuery));	