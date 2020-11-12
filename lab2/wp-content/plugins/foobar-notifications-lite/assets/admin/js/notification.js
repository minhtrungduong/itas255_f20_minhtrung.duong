"use strict";

(function (_, _utils) {
  _utils.ready(function ($) {
    //On notification edit/add pages, when the bar type change, store the type
    $('#foobar_notification-types_type-field input:radio').change(function (e) {
      var barType = $(this).val(),
          previousBarType = $('#foobar_notification-types_type-field').data('type');
      $('#foobar_notification-settings-' + previousBarType).hide();
      $('#foobar_notification-settings-' + barType).show();
      $('#foobar_notification-types_type-field').data('type', barType);
    }); //when a foobar shortcode is clicked on

    $('.foobar-shortcode').click(function () {
      try {
        //select the contents
        this.select(); //copy the selection

        document.execCommand('copy'); //show the copied message

        $(this).siblings('.foobar-shortcode-message').show();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('Oops, unable to copy!');
      }
    }); //when a foobar preview link is clicked

    $('.foobar-admin-preview').click(function (e) {
      e.preventDefault();
      var $this = $(this),
          $row = $this.parents('tr:first'),
          foobarId = $this.data('foobar-id'),
          foobarUId = $this.data('foobar-uid'),
          data = {
        'action': 'foobar_admin_preview',
        'id': foobarId,
        '_wpnonce': $this.data('foobar-preview-nonce'),
        '_wp_http_referer': encodeURIComponent($('input[name="_wp_http_referer"]').val())
      };
      $row.addClass("foobar-preview-loading"); //do a postback to get the bar content

      $.ajax({
        type: 'POST',
        url: ajaxurl,
        data: data,
        cache: false,
        success: function success(html) {
          // dismiss all existing bars - dismissing is more extreme than destroy;
          // destroy leaves markup in place
          // dismiss removes everything from the page
          FooBar.dismissAll(true); //append the bar content to end of body

          $('body').append(html); //init the bar

          var bar = FooBar.create(foobarUId);

          if (bar instanceof FooBar.Bar) {
            bar.init();
          }
        }
      }).always(function () {
        $row.removeClass("foobar-preview-loading");
      });
    });
  }); // eslint-disable-next-line no-undef

})(FooBar, FooBar.utils);