import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import polyline from 'polyline'; // Import polyline library

// Fix missing default marker icon in Leaflet
const customIcon = new L.Icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Function to calculate route using OSRM and get polyline geometry and time
const getRoute = async (origin, destination) => {
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline&steps=false`;

  try {
    const response = await axios.get(osrmUrl);
    const data = response.data;

    if (data.routes && data.routes[0]) {
      const geometry = data.routes[0].geometry; // Polyline geometry in encoded format
      const duration = data.routes[0].duration; // Duration in seconds
      const distance = data.routes[0].distance; // Distance in meters
      const decodedPath = polyline.decode(geometry); // Decode the polyline using polyline library
      return { route: decodedPath.map(([lat, lng]) => new L.LatLng(lat, lng)), distance, duration }; // Return polyline, distance, and duration
    } else {
      console.error('Error fetching route from OSRM:', data);
      return null;
    }
  } catch (error) {
    console.error('Error with OSRM request:', error);
    return null;
  }
};

// Component to handle map click events
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng); // Capture click position
    },
  });
  return null; // This component does not render anything
}

function TestMap() {
  const [markers, setMarkers] = useState([]); // Store marker positions
  const [roadDistance, setRoadDistance] = useState(null); // Store road distance result
  const [roadTime, setRoadTime] = useState(null); // Store road time result
  const [route, setRoute] = useState([]); // Store route coordinates for polyline

  // Function to add a new marker when the map is clicked
  const handleMapClick = (latlng) => {
    setMarkers((prevMarkers) => [...prevMarkers, latlng]); // Append new marker
  };

  // Function to remove a marker when "Remove" button is clicked
  const handleRemoveMarker = (index, event) => {
    event.stopPropagation(); // Prevents the map click event from triggering
    const newMarkers = markers.filter((_, i) => i !== index); // Remove selected marker
    setMarkers(newMarkers);

    // Recalculate the route if there are at least two markers remaining
    if (newMarkers.length >= 2) {
      getRoute(newMarkers[0], newMarkers[1]).then((result) => {
        if (result) {
          setRoute(result.route); // Update the route for the polyline
          const distanceInKm = (result.distance / 1000).toFixed(2); // Convert to kilometers
          const timeInMinutes = (result.duration / 60).toFixed(2); // Convert time to minutes
          setRoadDistance(`Distance: ${distanceInKm} km`); // Show distance in km
          setRoadTime(`Time: ${timeInMinutes} minutes`); // Show time
        }
      });
    } else {
      // If there are fewer than 2 markers, clear the route and distance
      setRoute([]);
      setRoadDistance(null);
      setRoadTime(null);
    }
  };

  // Function to calculate distance and route between the first two markers
  const handleCalculateDistance = async () => {
    if (markers.length >= 2) {
      const [markerA, markerB] = markers;
      const result = await getRoute(markerA, markerB);
      if (result) {
        setRoute(result.route); // Set the route for the polyline
        const distanceInKm = (result.distance / 1000).toFixed(2); // Convert to kilometers
        const timeInMinutes = (result.duration / 60).toFixed(2); // Duration in minutes
        setRoadDistance(`Distance: ${distanceInKm} km`); // Show accurate distance
        setRoadTime(`Time: ${timeInMinutes} minutes`); // Show accurate time
      }
    } else {
      alert('Please add at least two markers.');
    }
  };

  return (
    <div>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100vh', width: '100%' }}
      >
        {/* Google Maps Tile Layer */}
        {/* Hybrid: s,h;
            Satellite: s;
            Streets: m;
            Terrain: p;*/}
        <TileLayer
          url="http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          maxZoom={20}
        />

        {/* Click event handler */}
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Render all markers */}
        {markers.map((position, index) => (
          <Marker key={index} position={position} icon={customIcon}>
            <Popup>
              <div>
                <p>Marker at {position.lat.toFixed(4)}, {position.lng.toFixed(4)}</p>
                <button onClick={(e) => handleRemoveMarker(index, e)}>Remove Marker</button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render polyline if we have a route */}
        {route.length > 0 && <Polyline positions={route} color="blue" weight={4} />}

      </MapContainer>

      {/* Button to trigger distance calculation */}
      <button
        onClick={handleCalculateDistance}
        className="calculate-distance-button" // Use CSS class
      >
        Calculate Distance
      </button>

      {/* Display the road distance */}
      {roadDistance && (
        <div className="road-distance-result"> {/* Use CSS class */}
          {roadDistance}
        </div>
      )}

      {/* Display the road time */}
      {roadTime && (
        <div className="road-time-result"> {/* Use CSS class */}
          {roadTime}
        </div>
      )}
    </div>
  );
}

export default TestMap;
