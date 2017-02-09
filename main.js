var map; // map object
var info_window; // info displayed when marker is clicked
var bar_array = []; // results are stored from search
var input = $('#location_input'); //
var radius = 8047; // initial radius
var zoom  = 4; // initial zoom
var latitude = 39; // initial latitude displayed when page loads
var longitude = -97; // initial longitude displayed when page loads
var current_place = {}; // used to store the place object you clicked on when viewing an info_window. current_place will be stored in our array if we click add
var route_path = []; // stores lat/lng for each location that we have added to our list
var geocoder = new google.maps.Geocoder(); //  creates geocoder object, used to convert locations to lat/lng
var coordinates; // stores location information for address that was input into search bar

google.maps.event.addDomListener(window, 'load', initMap); //loads map after window has been loaded

$(document).ready(function() {
    event_handlers();
});


function event_handlers() {
    $('#map_canvas').on('click', '.place_add_button', add_bar_to_array); // click handler for add button on info_window
}


// takes info input into search field and returns lat/lng. info is then sent to initialize the map.
function get_coordinates() {
    var input_address = $('.search_bar').val();
    var address = {
        address: input_address
    };

    geocoder.geocode(address, function(result, status){
        if (status === 'OK') {
            coordinates = result[0].geometry.location;
            latitude = coordinates.lat();
            longitude = coordinates.lng();
            zoom = 13;
            initMap();
            bars_to_dom();
        }
        else {
            console.log('geocoding not working')
        }
    });
}

// adds bar to bars_added array when "add" is clicked on info_window. also plots route on the map when there is more than one location chosen.
function add_bar_to_array() {
    // if statement blocks ability to add same bar twice in a row
    if (current_place == bars_added[bars_added.length - 1]) {
        return;
    }
    bars_added.push(current_place);
    var current_lat = current_place.geometry.location.lat();
    var current_lng = current_place.geometry.location.lng();
    var current_place_coordinates = new google.maps.LatLng(current_lat, current_lng);
    route_path.push(current_place_coordinates);
    //  if statement used to plot route between last two items in route_path array
    if (route_path.length > 1) {
        for (var i = route_path.length-1; i < route_path.length; i++) {
            create_route(route_path[i-1], route_path[i])
        }
    }
}

// generates map using center, radius, lat, lng
function initMap() {
    var center = {lat: latitude, lng: longitude};
    map = new google.maps.Map(document.getElementById('map_canvas'), {
        center: center,
        zoom: zoom
    });

    var request = {
        location: center,
        radius: radius,
        types: ['bar'] //specifies what type of results we want displayed
    };

    info_window = new google.maps.InfoWindow(); // info_window displays popup company info when clicking on marker. specific info is defined below

    var service = new google.maps.places.PlacesService(map); // creates a Google Places object

    service.nearbySearch(request, callback); // nearBy search method called on Google Places object with request. Results are sent to callback function below.

    //results are stored into bar_array and plotted on map using createMarker function
    function callback(results, status) {
        bar_array = results;
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i=0; i < results.length; i++) {
                createMarker(results[i]);
            }
        }
    }

    function createMarker(place) {
        debugger;
        var placeLoc = place.geometry.location; // stores lat and lng for current bar
        var marker = new google.maps.Marker({ // markers created and placed onto map using placeLoc
            map: map,
            position: placeLoc,
            icon: 'http://maps.google.com/mapfiles/kml/pal2/icon19.png'
        });

        google.maps.event.addListener(marker, 'click', function() { // click handlers added to each marker to display info_window
            info_window.setContent(bar_info_window(place));
            info_window.open(map, this);
        })
    }
}

// function called to create HTML for bar_info_window
function bar_info_window(place) {
    current_place = place;
    var content =
        '<div class="place_title">' + place.name + '</div>' +
        '<div class="place_address">' + place.vicinity + '</div>' +
        '<div class="place_review">Rating: ' + place.rating + '</div>' +
        '<div class="place_button_div"><button class="place_add_button">Add</button></div>';
    return content;
}


// TODO add multiple travel modes = walking, driving, etc
// function used to create route and render it on the map
function create_route(origin, destination) {
    console.log('create route called');
    var directions_service = new google.maps.DirectionsService();
    var directions_renderer = new google.maps.DirectionsRenderer({
        preserveViewport : true, // disables zoom in when creating route
        map: map,
        suppressMarkers: true // removes markers that are created on top of current markers when plotting route.

    });
    var request = {
        origin: origin,
        destination: destination,
        travelMode: 'DRIVING'
    };
    directions_service.route(request, function(response, status) {
        if (status == 'OK') {
            directions_renderer.setDirections(response);
        }
    })
}











