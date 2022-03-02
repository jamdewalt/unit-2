// This program makes a map showing deaths in major mountains, mostly in Asia.
//data sources: https://www.oregonlive.com/pacific-northwest-news/2014/06/at_least_400_people_have_died.html
//https://en.wikipedia.org/wiki/List_of_deaths_on_eight-thousanders#Deaths_per_mountain

//declare global variables
var map;
var minValue;

function createMap(){

    //create the map, center on Nepal/Pakistan
    map = L.map('map', {
        center: [32, 70],
        zoom: 5
    });

    //add OSM base tilelayer. Need to update to better one later
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    //call getData function
    getData(map);
};

function calcMinValue(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each mountain. Pretty sure this is messed up somehow
    for(var Mountain of data.features){
        //loop through each year
        for(var year = 2015; year <= 2021; year+=1){
              //get number of deaths for current year
              var value = Mountain.properties["year_"+ String(year)];
              //add value to array
              if (value&&value >0){
              allValues.push(value)};
        }
    }
    //get minimum value of our array
    var minValue = Math.min(...allValues)
console.log(minValue);
    return minValue;
}

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    if (attValue === 0){
        return 0;}
    else{
         //constant factor adjusts symbol sizes evenly
        var minRadius = 5;
        //Flannery Apperance Compensation formula. May need adjustment due to zeros
        var radius = 1.0083 * Math.pow(attValue/minValue,0.5715) * minRadius;

    return radius;

    }
    
   
};

//function to convert markers to circle markers and add popups
function pointToLayer(feature, latlng,attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //check
    console.log(attribute);

    //create marker options
    var options = {
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string starting with each mountain...Example 2.1 line 24
    var popupContent = "<p><b>Mountain:</b> " + feature.properties.Mountain + "</p>";

    //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Total Deaths in " + year + ":</b> " + feature.properties[attribute];

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
          offset: new L.Point(0,-options.radius)
      });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){
    map.eachLayer(function(layer){
        if (layer.feature ){
          //access feature properties
           var props = layer.feature.properties;

           //update each feature's radius based on new attribute values
           var radius = calcPropRadius(props[attribute]);
           layer.setRadius(radius);

           //add each mountain to popup content string
           var popupContent = "<p><b>Mountain:</b> " + props.Mountain + "</p>";

           //add formatted attribute to panel content string
           var year = attribute.split("_")[1];
           popupContent += "<p><b>Total Deaths in " + year + ":</b> " + props[attribute];

           //update popup with new content
           popup = layer.getPopup();
           popup.setContent(popupContent).update();

        };
    });
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with year values
        if (attribute.indexOf("year") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};

//Step 1: Create new sequence controls
function createSequenceControls(attributes){
    //create range input element (slider)
    var slider = "<input class='range-slider' type='range'></input>";
    document.querySelector("#panel").insertAdjacentHTML('beforeend',slider);

    //set slider attributes
    document.querySelector(".range-slider").max = 6;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    //add some step buttons
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="reverse">Reverse</button>');
    document.querySelector('#panel').insertAdjacentHTML('beforeend','<button class="step" id="forward">Forward</button>');

    //this replaces the button content with images
    document.querySelector('#reverse').insertAdjacentHTML('beforeend',"<img src='img/reverse.png'>") // image from P Thanga Vignesh
    document.querySelector('#forward').insertAdjacentHTML('beforeend',"<img src='img/forward.png'>") //image from Dharma Prasetya

    var steps = document.querySelectorAll('.step');

    steps.forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;
            //Step 6: go forwards or backwards depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 6 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 6 : index;
            };

            //Step 8: update slider
            document.querySelector('.range-slider').value = index;

            //Step 9: pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
        })
    })

    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){
        //Step 6: get the new index value
        var index = this.value;

        //Step 9: pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
};

function getData(map){
    //load the data using a fetch. 
    fetch("data/mountaindeaths.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            var attributes = processData(json);
            minValue = calcMinValue(json);
            //call function to create proportional symbols
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
        })
};

document.addEventListener('DOMContentLoaded',createMap)