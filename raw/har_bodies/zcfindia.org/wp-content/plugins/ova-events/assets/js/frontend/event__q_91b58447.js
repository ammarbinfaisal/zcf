(function($){
 "use strict";
 $(document).ready(function(){

    /***** Map *****/
    function initialize() {

       var lat = parseFloat( $("#location").data('lat') );
       var lng = parseFloat( $("#location").data('lng') );
       var address = $("#location").data('address');
       var zoom = parseInt( $("#location").data('zoom') );

       var infoWindow = new google.maps.InfoWindow();

       var loc = {lat: lat, lng: lng};

       var map = new google.maps.Map(document.getElementById('location'), {
        zoom: zoom,
        center: loc,
        scrollwheel: false
      });

       var marker = new google.maps.Marker({
        position: loc,
        map: map
      });    

       google.maps.event.addListener(marker, 'click', (function(marker) {
        return function() {
         infoWindow.setContent(address);
         infoWindow.open(map, marker);
       }
     })(marker));

   }


   if( typeof google !== 'undefined' && $(".single-event #location").length > 0 ){ 
     google.maps.event.addDomListener(window, "load", initialize);
   }



   /***** Gallery PrettyPhoto *****/
   if( $(".gallery-items a[data-gal^='prettyPhoto']").length > 0 ){
    $("a[data-gal^='prettyPhoto']").prettyPhoto({hook: 'data-gal', theme: 'facebook',slideshow:5000, autoplay_slideshow:true});
   }


   /***** Date Time Picker *****/
   $(".ovaev_start_date_search, .ovaev_end_date_search").each(function(){
     if($().datetimepicker) {
      var date = $(this).data('date');
      var lang = $(this).data('lang');
      $(this).datetimepicker({
       format: date,
       timepicker:false
     });
      $.datetimepicker.setLocale(lang);
    }
  });

    /* slide-event-feature*/
   $(".slide-event-feature").each(function(){
      var data = {
        loop:true,
        margin:80,
        nav:false,
        dots:false,
        autoplay:true,
        autoplayTimeout:4000,
        autoplayHoverPause:true,
        responsive:{
          0:{
            items:1
          },
          600:{
            items:1
          },
          1000:{
            items:1
          }
        }
      }
      $(this).owlCarousel(data);
      $(window).resize(function() {
        var items = $('.slide-event-feature');

        items.trigger('destroy.owl.carousel');
        items.owlCarousel(data);
      });
  });

  /* Select2*/
   $('.search_archive_event #ovaev_type').on('change', function(){
   $(this).closest('.search_archive_event').find('.select2-selection__rendered').css('color', '#333');
   });

    if ($('.ovaev_type').length > 0) {
      $('.ovaev_type').select2();
    };
       /*   Tab Pane*/

   function activeTab(obj){

      $('.tab-Location ul li ').removeClass('active');
      $(obj).addClass('active');
      var id = $(obj).find('a').data('href');
      $('.event_tab-pane').hide();
      $(id) .show();

    }

    $('.event_nav-tabs li').on( 'click', function(){

      activeTab(this);
      return false;

    });

    activeTab( $( '.event_nav-tabs li:first-child' ) );
    
    //calendar

     var calendars = {};
      $('.ovaev_simple_calendar').each( function( e){
        var thisMonth = moment().format('YYYY-MM');

        var events = $(this).attr('events');

        if( events && events.length > 0 ){
           events = JSON.parse( events );
        }
        // Events to load into calendar

        calendars.clndr1 = $(this).find('.ovaev_events_simple_calendar').clndr({
            events: events,
            clickEvents: {
                click: function (target) {
                    var eve =  target.events;
                    location.assign(eve[0].url);
                },
                
            },

            multiDayEvents: {
                singleDay: 'date',
                endDate: 'endDate',
                startDate: 'startDate'
            },
            showAdjacentMonths: true,
            adjacentDaysChangeMonth: false
        
        });

         $(document).keydown( function(e) {
            // Left arrow
            if (e.keyCode == 37) {
                calendars.clndr1.back();
            }

            // Right arrow
            if (e.keyCode == 39) {
                calendars.clndr1.forward();
            }
        });

      });
    //end calender

    //silde
    $(".ovaev-slide").each(function(){
      var owlsl = $(this) ;
      var owlsl_ops = owlsl.data('options') ? owlsl.data('options') : {};

      var responsive_value = {
          0:{
            items:1,
            nav:false
          },
          576:{
            items:1

          },
          992:{
            items:2,
            nav:false
          },
          1170:{
            items:owlsl_ops.items
          }
      };
      
      owlsl.owlCarousel({
        autoWidth: owlsl_ops.autoWidth,
        margin: owlsl_ops.margin,
        items: owlsl_ops.items,
        loop: owlsl_ops.loop,
        autoplay: owlsl_ops.autoplay,
        autoplayTimeout: owlsl_ops.autoplayTimeout,
        center: owlsl_ops.center,
        nav: owlsl_ops.nav,
        dots: owlsl_ops.dots,
        thumbs: owlsl_ops.thumbs,
        autoplayHoverPause: owlsl_ops.autoplayHoverPause,
        slideBy: owlsl_ops.slideBy,
        smartSpeed: owlsl_ops.smartSpeed,
        navText:[
        '<i class="arrow_carrot-left" ></i>',
        '<i class="arrow_carrot-right" ></i>'
        ],
        responsive: responsive_value,
      });

    });
    //end slide

    //event ajax
    $(".ovapo_project_grid").each(function() {

      var slide = $(this).find('.grid');
      var data  = slide.data('owl');
      if ( slide.length > 0 ) {
        slide.owlCarousel(data);
      }

      $(this).find('.button-filter button:first-child').addClass('active');
      
      $(this).find('.button-filter').each(function() {

        var $ovapo_project_grid = $(this).closest('.ovapo_project_grid');

        $(this).on('click', 'button', function(e) {
          $(this).parent().find('.active').removeClass('active');
          $(this).addClass('active');

          e.preventDefault();
          var filter                = $(this).data('filter');
          var order                 = $(this).data('order');
          var orderby               = $(this).data('orderby');
          var number_post           = $(this).data('number_post');
          var layout                = $(this).data('layout');
          var first_term            = $(this).data('first_term');
          var term_id_filter_string = $(this).data('term_id_filter_string');
          var show_featured         = $(this).data('show_featured');

          $ovapo_project_grid.find('.wrap_loader').fadeIn(100);
        
          $.ajax({
             url: ajax_object.ajax_url,
             type: 'POST',
             data: ({
                action: 'filter_elementor_grid',
                filter: filter,
                order: order,
                orderby: orderby,
                number_post: number_post,
                layout: layout,
                first_term: first_term,
                term_id_filter_string: term_id_filter_string,
                show_featured: show_featured,
             }),
             success: function(response){

                $ovapo_project_grid.find('.wrap_loader').fadeOut(200);

                var items = $ovapo_project_grid.find('.items');
                items.html( response ).fadeIn(300);
                items.trigger('destroy.owl.carousel');
                items.owlCarousel(data);
             },
          })
        });
      });
    });
    //end event ajax

    //full calendar
    $('.ovaev_fullcalendar').each( function( e){

          var events = $(this).attr('full_events');
          var fullCalendar = $(this).find('.ovaev_events_fullcalendar')[0];

          var lang  = $(this).data('lang');
          var button_text = $(this).data('button-text');
          var no_events_text = $(this).data('no-events-text');
          var all_day_text = $(this).data('all-day-text');
          var first_day = $(this).data('first-day');

          if( events && events.length > 0 ){
            events = JSON.parse( events );
          }

          //filter event
          
          var srcCalendar = new FullCalendar.Calendar(fullCalendar, {
          
            eventDidMount: function(info) {
              var tooltip = new Tooltip(info.el, {
                title: info.event.extendedProps.desc,
                placement: 'top',
                trigger: 'hover',
                container: 'body',
                html:true
              });
            },
            buttonText: button_text,
            noEventsText: no_events_text,
            allDayText: all_day_text,
            firstDay: first_day,
            locale: lang,
            timeZone: 'local',
            editable: true,
            navLinks: true,
            dayMaxEvents: true,
            events: events,
            eventColor: '#ff3514',
            contentHeight: 'auto',
            headerToolbar: {
               left: 'prev,next today',
               center: 'title',
               right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',

            },
          });
          srcCalendar.render();

          //filter event
          var datetime = Date.now();
          var calendar_filter_event = $(this).find("#calendar_filter_event").val();

          var events_filter = [];
          $(this).find('#calendar_filter_event').on('change',function () {

            calendar_filter_event = $(this).val();
            srcCalendar.getEvents().forEach( event => event.remove() );

            if ( calendar_filter_event == 'all' ) {
              $.each( events, function( key, value ) {
                srcCalendar.addEvent(value);
              });
            } else if ( calendar_filter_event == 'past_event' ) {
              $.each( events, function( key, value ) {
                var end_date = new Date(value['end']).getTime();
                if ( end_date < datetime ) {
                  srcCalendar.addEvent(value);
                }
              });
            } else if ( calendar_filter_event == 'upcoming_event' ) {
              $.each( events, function( key, value ) {
                var start_date = new Date(value['start']).getTime();
                if ( start_date > datetime ) {
                  srcCalendar.addEvent(value);
                }
              });
            } else {
              $.each( events, function( key, value ) {
                var special = value['special'];
                if ( special == 'checked' ) {
                  srcCalendar.addEvent(value);
                }
              });
            }
          });
        });
    //end full calendar

    //Search Ajax
    $('.ovaev-wrapper-search-ajax').each( function(e){
      var that = $(this);

      var search_ajax = that.find('.search-ajax-content');
      var data_events = that.find('.data-events');
      var pagination  = that.find('.search-ajax-pagination-wrapper');
      var search_form = that.find('.ovaev-search-ajax-form');
      var select      = that.find('.ovaev_type');
      if ( select.length > 0 ) {
        select.select2();
      };

      // When form change
      search_form.on('change', function(e) {
        e.preventDefault();

        var form = $(this);

        var start_date  = form.find('input[name="ovaev_start_date_search"]').val();
        var end_date    = form.find('input[name="ovaev_end_date_search"]').val();
        var category    = form.find('select[name="ovaev_type"]').val();
        var layout      = data_events.data('layout');
        var column      = data_events.data('column');
        var per_page    = data_events.data('per-page');
        var order       = data_events.data('order');
        var orderby     = data_events.data('orderby');
        var cat_slug    = data_events.data('category-slug');
        var time_event  = data_events.data('time-event');

        that.find('.wrap_loader').fadeIn(100);

        $.ajax({
          url: ajax_object.ajax_url,
          type: 'POST',
          data: ({
            action: 'search_ajax_events',
            start_date: start_date,
            end_date  : end_date,
            category  : category,
            layout    : layout,
            column    : column,
            per_page  : per_page,
            order     : order,
            orderby   : orderby,
            cat_slug  : cat_slug,
            time_event: time_event,
          }),
          success: function(response){
            var data = JSON.parse(response);

            that.find('.wrap_loader').fadeOut(200);

            search_ajax.html('').append(data['result']).fadeIn(300);
            pagination.html('').append(data['pagination']).fadeIn(300);
          },
        });
      });

      // When click pagination
      $(document).on( 'click', '.ovaev-wrapper-search-ajax .search-ajax-pagination-wrapper .search-ajax-pagination .page-numbers', function(e) {
        e.preventDefault();

        var page = $(this);
        var that_page     = page.closest('.ovaev-wrapper-search-ajax');
        var current       = page.closest('.search-ajax-pagination').find('.current').data('paged');
        var current_page  = page.closest('.search-ajax-pagination').find('.current');
        var offset        = page.attr('data-paged');
        var total_page    = page.closest('.search-ajax-pagination').data('total-page');

        if ( offset != current ) {
          var start_date  = page.closest('.ovaev-wrapper-search-ajax').find('input[name="ovaev_start_date_search"]').val();
          var end_date    = page.closest('.ovaev-wrapper-search-ajax').find('input[name="ovaev_end_date_search"]').val();
          var category    = page.closest('.ovaev-wrapper-search-ajax').find('select[name="ovaev_type"]').val();
          var layout      = page.closest('.ovaev-wrapper-search-ajax').find('.data-events').data('layout');
          var column      = page.closest('.ovaev-wrapper-search-ajax').find('.data-events').data('column');
          var per_page    = page.closest('.ovaev-wrapper-search-ajax').find('.data-events').data('per-page');
          var order       = page.closest('.ovaev-wrapper-search-ajax').find('.data-events').data('order');
          var orderby     = page.closest('.ovaev-wrapper-search-ajax').find('.data-events').data('orderby');
          var cat_slug    = page.closest('.ovaev-wrapper-search-ajax').find('.data-events').data('category-slug');
          var time_event  = page.closest('.ovaev-wrapper-search-ajax').find('.data-events').data('time-event');

          that_page.find('.wrap_loader').fadeIn(100);

          $.ajax({
            url: ajax_object.ajax_url,
            type: 'POST',
            data: ({
              action: 'search_ajax_events_pagination',
              start_date: start_date,
              end_date  : end_date,
              category  : category,
              layout    : layout,
              column    : column,
              per_page  : per_page,
              order     : order,
              orderby   : orderby,
              cat_slug  : cat_slug,
              time_event: time_event,
              offset    : offset,
            }),
            success: function(response){
              var data = JSON.parse(response);

              that_page.find('.wrap_loader').fadeOut(200);
              that_page.find('.search-ajax-content').html('').append(data['result']).fadeIn(300);

              page.closest('.search-ajax-pagination').find('.page-numbers').removeClass('current');

              if ( page.hasClass('next') ) {
                current_page.closest('li').next().children('.page-numbers').addClass('current');
              } else if ( page.hasClass('prev') ) {
                current_page.closest('li').prev().children('.page-numbers').addClass('current');
              } else {
                page.addClass('current');
              }

              if ( parseInt(offset) > 1 ) {
                page.closest('.search-ajax-pagination').find('.prev').attr('data-paged', parseInt(offset)-1);
                page.closest('.search-ajax-pagination').find('.prev').css('display', 'inline-flex');
              } else {
                page.closest('.search-ajax-pagination').find('.prev').attr('data-paged', 0);
                page.closest('.search-ajax-pagination').find('.prev').css('display', 'none');
              }
              
              if ( parseInt(offset) == parseInt(total_page) ) {
                page.closest('.search-ajax-pagination').find('.next').attr('data-paged', parseInt(offset));
                page.closest('.search-ajax-pagination').find('.next').css('display', 'none');
              } else {
                page.closest('.search-ajax-pagination').find('.next').attr('data-paged', parseInt(offset)+1);
                page.closest('.search-ajax-pagination').find('.next').css('display', 'inline-flex');
              }
            },
          });
        }
      });
      // End pagination
    });
    //End Search Ajax

  });
    
})(jQuery);