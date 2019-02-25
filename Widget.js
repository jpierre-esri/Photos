define(['dojo/_base/declare', 'dojo/dom-construct', 'dojo/dom-attr', 'dojo/fx', 'dojo/query',
'jimu/BaseWidget', 'dojo/_base/lang', 'dojo/_base/connect', 'dojo/on', 'jimu/PanelManager', 'dojo/request',
'esri/geometry/webMercatorUtils', 'esri/dijit/Popup'],
  function(declare, domConstruct, attr, fx, query, BaseWidget, lang, connect, on, PanelManager, request, webMercatorUtils, Popup) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-mywidget',

      //this property is set by the framework when widget is loaded.
      //name: 'CustomWidget',


      //methods to communication with app container:

      // postCreate: function() {
      //   this.inherited(arguments);
      //   console.log('postCreate');
      // },

      startup: function() {
       this.inherited(arguments);
       this.own(on(this.map, "click", lang.hitch(this,this.onMapClick)));
       this.own(on(this.carouselBackButton,"click", lang.hitch(this,this.carouselTurn)));
       this.own(on(this.carouselForwardButton,"click", lang.hitch(this,this.carouselTurn)));
       dojo.style(dojo.byId(this.id+'_panel'),"display","none");
       PanelManager.getInstance().closePanel(this.id+'_panel');
      },

      onMapClick: function(event) {
        this.inherited(arguments);
        dojo.style(dojo.byId(this.id+'_panel'),"display","none");
        PanelManager.getInstance().closePanel(this.id+'_panel');
        var flickrUrl = 'https://api.flickr.com/services/rest';
        var flickrKey = this.config['flickrKey'];
        var flickrCarousel = this.flickrCarousel;
        var clickedFeatureType = null;
        var groupId = this.config['groupId'];
        var map = this.map;
        // var clickedCoords = webMercatorUtils.xyToLngLat(event.mapPoint.x, event.mapPoint.y);
        // var lowerLeft, upperRight;
        this.featureDetails.innerHTML = '';

        // check click, if a line or poly is returned, get extents
        // if a point or nothing is selected, run it as a radius query (DISABLED)

        // get the extents of a clicked feature, may use this to query images as a bbox
        
        var popup = map.infoWindow;
        var selectedObj = popup.getSelectedFeature();
        
        if (selectedObj) {
          var layerName = selectedObj['_sourceLayer']['name'];
          if (this.config['attributeConfig'] && layerName in this.config['attributeConfig']) {
            PanelManager.getInstance().openPanel(this.id+'_panel');
            this.getPanel()._makeOriginalBox();
            console.log(layerName);
            var extent = selectedObj['_extent'];
            clickedFeatureType = selectedObj['geometry'].declaredClass;
            if (clickedFeatureType == 'esri.geometry.Polygon' || clickedFeatureType == 'esri.geometry.Polyline') {
              lowerLeft = webMercatorUtils.xyToLngLat(extent['xmin'], extent['ymin']);
              upperRight = webMercatorUtils.xyToLngLat(extent['xmax'], extent['ymax']);
            }
            // populate feature stats
            if (selectedObj['attributes']['Shape__Length']) {
              this.featureDetails.innerHTML += "<span class = 'attrName'>Length: </span>";
              this.featureDetails.innerHTML += "<span class = 'attrValue'>" + selectedObj['attributes']['Shape__Length'].toFixed(2) + ' km</span><br>';
              this.featureDetails.innerHTML += "<hr class = 'lightLine'>";
            }
            for (var i in selectedObj['attributes']) {
              if (selectedObj['attributes']) {
                if (i in this.config['attributeConfig'][layerName]) {
                  if (this.config['attributeConfig'][layerName][i]['display']){
                    this.featureDetails.innerHTML += "<span class = 'attrName'>" + this.config['attributeConfig'][layerName][i]['alias'] + ": </span>";
                    this.featureDetails.innerHTML += "<span class = 'attrValue'>" + selectedObj['attributes'][i] + '</span><br>';
                    this.featureDetails.innerHTML += "<hr class = 'lightLine'>";
                  }
                  else if (this.config['attributeConfig'][layerName][i]['title']) {
                    this.widgetTitle.innerHTML = selectedObj['attributes'][i];
                  }
                }
              }
            }
          // create an extent for map clicks or point geometries (DISABLED)
          // if (!lowerLeft) {
          //   lowerLeft = [clickedCoords[0]-0.01, clickedCoords[1]-0.01]
          //   upperRight = [clickedCoords[0]+0.01, clickedCoords[1]+0.01]
          // }
          var flickrExtent = lowerLeft[0] + "," + lowerLeft[1] + "," + upperRight[0] + "," + upperRight[1];

          // capture clicked x y, convert to 4326 and get the flickr place id for it (DISABLED)
          // request.post(flickrUrl, {
          //   data: {
          //     api_key: this.config['flickrKey'],
          //     method: 'flickr.places.findByLatLon',
          //     lat: clickedCoords[1],
          //     lon: clickedCoords[0]
          //   },
          //   headers: {"X-Requested-With": null}
          // }).then(function(response){
          //   parser = new DOMParser();
          //   xmlDoc = parser.parseFromString(response,"text/xml");
          //   var place = xmlDoc.getElementsByTagName("place");
          // });

          // query group by extent
          
          request_data = {
            api_key: flickrKey,
            user_id: groupId,
            method: 'flickr.photos.search',
            extras: 'url_m, geo, description, tags',
            bbox: flickrExtent
          }
          
          request.post(flickrUrl, {
            data: request_data,
            headers: {"X-Requested-With": null}
          }).then(function(response){
            flickrCarousel.innerHTML = '';
            parser = new DOMParser();
            xmlDoc = parser.parseFromString(response,"text/xml");
            var photos = xmlDoc.getElementsByTagName("photo");

            // load the carousel
            for (var i in photos) {
              if (typeof photos[i].getAttribute === "function") { 
                flickrCarousel.innerHTML += "<img class = 'carouselCard' id = 'carouselCard_" + i + "'src='" + photos[i].getAttribute('url_m') + "'>";
              }
            }
            if (photos.length > 0) dojo.style(dojo.byId('carouselCard_0'),"display","block");
            // show carousel buttons if more than one 
            if (photos.length >1) query('.carouselButton').style("visibility","visible");
            else query('.carouselButton').style("visibility","hidden");
          });
          
          // only show the widget if a response is returned or if a feature is clicked
          if (flickrCarousel.childNodes.length>0 || selectedObj) dojo.style(dojo.byId(this.id + '_panel'),"display","inline");
           
      }}
      },

      carouselTurn: function(event){
        this.inherited(arguments);
        var direction = dojo.getAttr(event['target'],'data-dojo-attach-point');
        for (var i = 0; i <= this.flickrCarousel.childNodes.length - 1 ; i++) {
          if (this.flickrCarousel.children[i].style && this.flickrCarousel.children[i].style.display == 'block') {
            var activeCard = i;
            dojo.style(dojo.byId('carouselCard_' + activeCard),"display","none");
            }
        }
        activeCard = parseInt(activeCard);
        if (direction == 'carouselForwardButton') activeCard += 1;
        else activeCard -= 1;
        if (activeCard > this.flickrCarousel.childNodes.length-1) activeCard = 0;
        if (activeCard < 0)  activeCard = this.flickrCarousel.childNodes.length - 2;
        dojo.style(dojo.byId('carouselCard_' + activeCard),"display","block");
      },

      _onFeedbackClicked: function(event) {
        this.inherited(arguments);
        var map = this.map;
        var popup = map.infoWindow;
        var selectedObj = popup.getSelectedFeature();
        console.log(selectedObj['_extent']);
      },

      _onExploreClicked: function(event) {
        this.inherited(arguments);
      },

      _onDownloadClicked: function(event) {
        this.inherited(arguments);
      },

      _onCustomClicked: function(event) {
        this.inherited(arguments);
      },

      _onZoomToClicked: function(event) {
        this.inherited(arguments);
        var map = this.map;
        var popup = map.infoWindow;
        var selectedObj = popup.getSelectedFeature();
        if (selectedObj) map.setExtent(selectedObj['_extent']);
      }
      // onOpen: function(){
      //  
      // },

      // onClose: function(){
      //   console.log('onClose');
      // },

      // onMinimize: function(){
      //   console.log('onMinimize');
      // },

      // onMaximize: function(){
      //   console.log('onMaximize');
      // },

      // onSignIn: function(credential){
      //   /* jshint unused:false*/
      //   console.log('onSignIn');
      // },

      // onSignOut: function(){
      //   console.log('onSignOut');
      // }

      // onPositionChange: function(){
      //   console.log('onPositionChange');
      // },

      // resize: function(){
      //   console.log('resize');
      // }

      //methods to communication between widgets:

    });
  });