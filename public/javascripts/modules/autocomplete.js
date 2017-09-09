function autocomplete(input, latInput, lngInput) {
  // Skip if there is no input
  if (!input) return;

  const dropdown = new google.maps.places.Autocomplete(input);
  dropdown.addListener("place_changed", () => {
    const place = dropdown.getPlace();
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();
  });

  // Don't submit the form when enter is pressed in the address field
  input.on('keydown', (event) => {
    if(event.keycode === 13) event.preventDefault();
  });
}

export default autocomplete;