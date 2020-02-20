import axios from 'axios';
import { $ } from './bling';

const mapOptions = {
    center: { lat: 43.2, lng: -79.8 },
    zoom: 8
}

function loadPlaces(map, lat = 43.2, lng = -79.8) {
    axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
        .then(res => {
            const places = res.data;
            if (!places.length) {
                alert('No places found');
                return;
            }
            // create a bounds
            const bounds = new google.maps.LatLngBounds();
            const infoWindow = new google.maps.InfoWindow();

            const markers = places.map(place => {
                const [placeLng, placeLat] = place.location.coordinates; // db: lng lat
                const position = { lat: placeLat, lng: placeLng }  // google: lat lng
                bounds.extend(position); // sets bounds to include each marker
                const marker = new google.maps.Marker({ map, position }); //marker goes: (on the map, at the position)
                marker.place = place;
                return marker;
            });

            // show marker detail when marker is clicked
            markers.forEach(marker => marker.addListener('click', function () {
                console.log(this.place)
                const html = `
                    <div class="popup">
                        <a href="/store/${this.place.slug}">
                            <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}"} />
                            <p>${this.place.name} - ${this.place.location.address}</p>
                        </a>
                    </div>
                `
                infoWindow.setContent(html);
                infoWindow.open(map, this); // (open in the map, at the marker)
            }));

            // zoom the map to fit all the markers
            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);
        });
}

function makeMap(mapDiv) {
    if (!mapDiv) return;
    // make map
    const map = new google.maps.Map(mapDiv, mapOptions); // (where map goes, options)
    loadPlaces(map);

    const input = $('[name="geolocate"]');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
    });
}

export default makeMap;