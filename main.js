var map; // map object
var info_window; // info displayed when marker is clicked
var bar_array = []; // results are stored from search
//var input = $('#location_input'); //
var radius = 8047; // initial radius
var zoom  = 4; // initial zoom
var latitude = 39; // initial latitude displayed when page loads
var longitude = -97; // initial longitude displayed when page loads
var current_place = {}; // used to store the place object you clicked on when viewing an info_window. current_place will be stored in our array if we click add
var route_path = []; // stores lat/lng for each location that we have added to our list
var geocoder = new google.maps.Geocoder(); //  creates geocoder object, used to convert locations to lat/lng
var coordinates; // stores location information for address that was input into search bar
var bars_listed = [];
var bars_added = [];


google.maps.event.addDomListener(window, 'load', initMap); //loads map after window has been loaded

$(document).ready(function() {
    event_handlers();
    $('.bar-main-container').on('click', '.btn-success', function(){
        console.log("Add To List button works");
        var delete_button = $('<button>', {
            text: 'Delete Bar',
            class: 'btn btn-danger navbar-btn delete-btn'
        });

        // To replace cloned 'Add To List' button to delete button
        $(this).parent().parent().clone().appendTo('.modal-body');
        $('.modal-body').find('button').replaceWith(delete_button);
        $('.delete-btn').click(remove_a_bar);
    });


    $('#lnkPrint').click(function()
    {
        window.print();
    });

});


function event_handlers() {
    $('#map_canvas').on('click', '.place_add_button', add_bar_to_array); // click handler for add button on info_window
    $('.search_button').click(get_coordinates);
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
            zoom = 11;
            pull_data_from_yelp($('.search_bar').val());
            setTimeout(function() {
                process_businesses(bar_array);
                update_bars()
            }, 1500)
        }
        else {
            console.log('geocoding not working')
        }
    });
}

// adds bar to bars_added array when "add" is clicked on info_window.
function add_bar_to_array() {
    // if statement blocks ability to add same bar twice in a row
    if (current_place == bars_added[bars_added.length - 1]) {
        return;
    }
    bars_added.push(current_place);

    //  if statement used to plot route between last two items in route_path array
    if (bars_added.length > 1) {
        create_route(bars_added)
    }
}

// generates map using center, radius, lat, lng
function initMap() {
    var center = {lat: latitude, lng: longitude};
    map = new google.maps.Map(document.getElementById('map_canvas'), {
        center: center,
        zoom: zoom,
        radius: radius
    });

    info_window = new google.maps.InfoWindow(); // info_window displays popup company info when clicking on marker. specific info is defined below
}

// function called to create HTML for bar_info_window
function bar_info_window(place) {
    current_place = place;
    var content =
        '<div class="place_title">' + place.name + '</div>' +
        '<div class="place_address">' + place.location.address + '</div>' +
        '<div class="place_review">Rating: ' + place.rating + '</div>' +
        '<div class="place_button_div"><button class="place_add_button btn btn-success">Add</button></div>';
    return content;
}


// TODO add multiple travel modes = walking, driving, etc
// function used to create route and render it on the map
function create_route(bars_added) {
    console.log('create route called');
    var directions_service = new google.maps.DirectionsService();
    var directions_renderer = new google.maps.DirectionsRenderer({
        preserveViewport : true, // disables zoom in when creating route
        map: map,
        suppressMarkers: true // removes markers that are created on top of current markers when plotting route.
    });

    for (var i = 0; i < bars_added.length-1; i++) {

        var start_lat = bars_added[i].location.coordinate.latitude;
        var start_lng = bars_added[i].location.coordinate.longitude;
        var start_coordinates = new google.maps.LatLng(start_lat, start_lng);

        var end_lat = bars_added[i+1].location.coordinate.latitude;
        var end_lng = bars_added[i+1].location.coordinate.longitude;
        var end_coordinates = new google.maps.LatLng(end_lat, end_lng);

        var request = {
            origin: start_coordinates,
            destination: end_coordinates,
            travelMode: 'DRIVING'
        };

        directions_service.route(request, function (response, status) {
            if (status == 'OK') {
                directions_renderer.setDirections(response);
            }
        })
    }
}



function pull_data_from_yelp(near) {
    var auth = {
        consumerKey : "azhNPdiWoW26hRe13Pk_nw",
        consumerSecret : "Ms0KV6fWvMKC67c6dd0vx1Tyxdk",
        accessToken : "k9M1RIB8lN5IkCImbjr_5zZruIhKJVat",
        accessTokenSecret : "gaj-OJVo9JIRN3uozMtn20fq32w",
        serviceProvider : {
            signatureMethod : "HMAC-SHA1"
        }
    };

    var accessor = {
        consumerSecret : auth.consumerSecret,
        tokenSecret : auth.accessTokenSecret
    };

    var parameters = [];
    parameters.push(['term', 'bar']);
    parameters.push(['location',near]);
    parameters.push(['callback', 'cb']);
    parameters.push(['oauth_consumer_key', auth.consumerKey]);
    parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
    parameters.push(['oauth_token', auth.accessToken]);
    parameters.push(['oauth_signature_method', 'HMAC-SHA1']);

    var message = {
        'action' : 'https://api.yelp.com/v2/search',
        'method' : 'GET',
        'parameters' : parameters
    };

    OAuth.setTimestampAndNonce(message);
    OAuth.SignatureMethod.sign(message, accessor);

    var parameterMap = OAuth.getParameterMap(message.parameters);

    $.ajax({
        'url' : message.action,
        'data' : parameterMap,
        'dataType' : 'jsonp',
        'jsonpCallback' : 'cb',
        'cache': true,
        'success': function(results) {
            console.log('yelp data pulled');
            console.log(results);
            bar_array = results;

        }
    })
}

function process_businesses(results) {
    //results are stored into bar_array and plotted on map using createMarker function
    initMap();
    for (var i=0; i < results.businesses.length; i++) {
        createMarker(results.businesses[i]);
    }

    function createMarker(place) {
        var current_coordinates = { // stores lat and lng for current bar
            lat: place.location.coordinate.latitude,
            lng: place.location.coordinate.longitude
        };
        var marker = new google.maps.Marker({ // markers created and placed onto map using placeLoc
            map: map,
            position: current_coordinates,
            icon: 'http://maps.google.com/mapfiles/kml/pal2/icon19.png'
        });

        google.maps.event.addListener(marker, 'click', function() { // click handlers added to each marker to display info_window
            info_window.setContent(bar_info_window(place));
            info_window.open(map, this);
        })
    }

}



//create DOM elements for page 2
function bars_to_dom(addBarObj) {

    var bar_container = $('<div>').addClass('barListItem media');
    var bar_image_container = $('<div>').addClass('media-left media-middle');
    var bar_image = $('<img>').attr('src', addBarObj.image_url).addClass('media-object');

    var bar_info_container = $('<div>').addClass('media-body');
    var bar_name = $('<h4>').text(addBarObj.name).addClass('media-heading');

    var bar_info_list = $('<div>').addClass('col-md-8 pull-left');
    var address = $('<h5>').text('Address: ' + addBarObj.location.display_address[0] + ', ' + addBarObj.location
            .display_address[1]);//TODO need span with in hv?
    // var hours = $('<h5>').text('Hours: ' +);//TODO need span with in hv?
    if (addBarObj.price_level === undefined){

    }
    var phone = $('<h5>').text('Phone: ' + addBarObj.phone);
    var price = $('<h5>').text('Price Level: ' + addBarObj.price_level);//TODO need span with in hv?
    var rating = $('<h5>').text('Rating: ' + addBarObj.rating + ' Reviews: ' + addBarObj.review_count);//TODO need span with in hv?

    var add_button = $('<button>', {
        text: 'Add To List',
        class: 'btn btn-success navbar-btn'
    });

    bar_info_list.append(address, phone, price, rating);
    bar_info_container.append(bar_name, bar_info_list, add_button);
    bar_image_container.append(bar_image);

    bar_container.append(bar_image_container, bar_info_container);
    bar_container.appendTo('.bar-main-container');

}


/**
 * function will update bars that will be posted on page 2 when loaded, bar removed from list, or added to list.
 */
function update_bars() {
    console.log('update_bars has been loaded. ');
    $('.bar-main-container').html('');
    for (var i =0; i < bar_array.businesses.length; i++){
        bars_to_dom(bar_array.businesses[i]);
    }
}

/**
 * function will remove any bars that have been added to the users to-do list once the (RED) button is clicked
 */

function remove_a_bar() {
    console.log('delete bar has been clicked');
    var selection = $(event.target).parent().parent();
    selection.remove();

}

//////////////////////////////////////This code is for the FB share button.
window.fbAsyncInit = function() {
    FB.init({
        appId      : 'your-app-id',
        xfbml      : true,
        version    : 'v2.8'
    });
    FB.AppEvents.logPageView();
};

(function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

/////////////////////////////////////////////////

var printList = $("#barList").printElement();

$('#lnkPrint').append(printList);




//TODO update radius level to work with radio buttons
//TODO add enter key to submitting location
//TODO remove info_window after clicking add
//TODO remove sample data from check bar list



