/* eslint-disable */
export const displayMap = (locations) => {
  mapboxgl.accessToken =
  'pk.eyJ1IjoiYjMzYmwzYnJveDQyIiwiYSI6ImNrOXRzOWI4dTA3MTUzaG5vNmM4MzRhd20ifQ.2OGqwt7eIYZRmVt0Ut3W3Q';

  var map = new mapboxgl.Map({
    container: 'map', // put the map on an element with id of 'map'.
    style: 'mapbox://styles/b33bl3brox42/ck9tsrz8u0nz51jqfv5pk1z6v',
    // center: [-118.113491, 34.111745], // lng, then lat
    // zoom: 10,
    // interactive: false,
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((location) => {
    // Create marker
    const element = document.createElement('div');
    element.className = 'marker';

    // add marker
    new mapboxgl.Marker({
      element: element,
      anchor: 'bottom', // bottom of the marker will be placed at the GPS coordinates.
    })
      .setLngLat(location.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(location.coordinates)
      .setHTML(`<p>Day ${location.day}: ${location.description}</p>`)
      .addTo(map);
    // Extends map bound to include current location.
    bounds.extend(location.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });

}

