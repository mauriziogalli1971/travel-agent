import { createClient } from '@supabase/supabase-js';

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const SERPAPI_KEY = import.meta.env.VITE_SERPAPI_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_API_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const dateTimeFormat = new Intl.DateTimeFormat(navigator.language, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatDate(date) {
  return dateTimeFormat
    .formatToParts(date)
    .filter((item) => item.type !== 'literal')
    .reverse()
    .map((part) => part.value)
    .join('-');
}

export async function getNearbyAirports({ lat, lon }) {
  if (lat == null || lon == null) throw new Error('lat/lon required');
  const { data, error } = await supabase.rpc('get_nearby_airports', {
    lat,
    lon,
  });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map((item) => item.iata);
}

export async function getCoordinates({ place }) {
  const geocodingApiUrl = `/openweather/geo/1.0/direct?q=${place}&limit=1&appid=${OPENWEATHER_KEY}`;
  const coordinates = { lat: 0, lon: 0 };
  try {
    const response = await fetch(geocodingApiUrl);
    const coords = await response.json();
    coordinates.lat = coords[0].lat;
    coordinates.lon = coords[0].lon;
    return coordinates;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getLocationName({ lat, lon }) {
  const nominatimUrl = `/nominatim/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  try {
    const response = await fetch(nominatimUrl);
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getWeatherData({ lat, lon, start, end }) {
  const weatherApiUrl = `/open-meteo/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation&start_date=${start}&end_date=${end}&timezone=auto`;
  try {
    const response = await fetch(weatherApiUrl);
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getFlightsData({ fromIata, toIata, start, end }) {
  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: fromIata,
    arrival_id: toIata,
    hl: 'en',
    currency: 'EUR',
    outbound_date: start,
    return_date: end,
    api_key: SERPAPI_KEY,
  });
  try {
    const response = await fetch(`/serpapi/search.json?${params.toString()}`);
    const { best_flights, other_flights } = await response.json();
    return { best_flights, other_flights };
  } catch (err) {
    // Optionally log or add context here if needed
    console.error(err);
    throw err;
  }
}

export async function getHotelsData({ to, travellers, start, end }) {
  try {
    const params = new URLSearchParams({
      engine: 'google_hotels',
      q: to,
      hl: 'en',
      currency: 'EUR',
      check_in_date: start,
      check_out_date: end,
      adults: travellers,
      children: 0,
      api_key: SERPAPI_KEY,
    });
    const response = await fetch(`/serpapi/search.json?${params.toString()}`);
    const { ads } = await response.json();
    console.log(ads);
    return { ads };
  } catch (error) {
    console.error(error);
    throw error;
  }
}
