'use strict';


var CharitableCampaignElementorWidget = window.CharitableCampaignElementorWidget || ( function( document, window, $ ) {

	var vars = {};

	var app = {

		init: function() {
			app.events();
		},

		events: function() {

			$( window ).on('elementor/frontend/init', function ( $scope ) {

				//elementorFrontend.hooks.addAction('frontend/element_ready/charitable_campaign.default', app.frontendWidgetInit);
				if( 'undefined' !== typeof elementor ){
					elementor.hooks.addAction( 'panel/open_editor/widget/charitable_campaign', app.widgetPanelOpen );
				}

			});

		},

		CharitableInitWidget: function() {

		},



		frontendWidgetInit : function( $scope ){
			app.CharitableInitWidget();
		},

		findFeedSelector: function( event ) {

			vars.$select = event && event.$el ?
				event.$el.closest( '#elementor-controls' ).find( 'select[data-setting="campaign_id"]' ) :
				window.parent.jQuery( '#elementor-controls select[data-setting="campaign_id"]' );
		},


		selectFeedInPreview : function( event ){

			vars.campaignId = $( this ).val();

			app.findFeedSelector();

			vars.$select.val( vars.campaignId ).trigger( 'change' );

		},


		widgetPanelOpen: function( panel, model ) {
			panel.$el.find( '.elementor-control.elementor-control-campaign_id' ).find( 'select' ).on( 'change', function(){
				setTimeout(function(){
					app.CharitableInitWidget();
				}, 4000)
			});
		},



	};

	return app;



}( document, window, jQuery ) );


CharitableCampaignElementorWidget.init();