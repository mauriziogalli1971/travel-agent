import { ToolRunner } from './toolRunner';
import { WeatherService } from '../services/weatherService';
import { FlightsService } from '../services/flightsService';
import { HotelsService } from '../services/hotelsService';
import { Logger } from '../logging/logger';
import { CoordinatesService } from '../services/coordinatesService';
import { SupabaseAirportsRepo } from '../repos/supabaseAirportsRepo';

export function toolService(config) {
	const logger = new Logger();
	return new ToolRunner({
		tools: [
			{
				type: 'function',
				function: {
					name: 'getCoordinates',
					description: 'Get coordinates for a given location',
					parameters: {
						type: 'object',
						properties: {
							place: {
								type: 'string',
								description: 'The location for which to get coordinates',
							},
						},
						required: ['place'],
						additionalProperties: false,
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'getNearbyAirports',
					description: 'Get the IATA codes of the nearest airports to given coordinates',
					parameters: {
						type: 'object',
						properties: {
							lat: { type: 'number', description: 'Latitude' },
							lon: { type: 'number', description: 'Longitude' },
						},
						required: ['lat', 'lon'],
						additionalProperties: false,
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'getWeatherData',
					description: 'Get weather data for a given location coordinates',
					parameters: {
						type: 'object',
						properties: {
							lat: { type: 'number', description: 'Latitude' },
							lon: { type: 'number', description: 'Longitude' },
						},
						required: ['lat', 'lon'],
						additionalProperties: false,
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'getFlightsData',
					description:
						'Get flights data for a given origin airport IATA codes and destination airport IATA codes between a start and end date',
					parameters: {
						type: 'object',
						properties: {
							fromIata: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'List of origin airport IATA codes' },
							toIata: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'List of destination airport IATA codes' },
							start: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
							end: { type: 'string', description: 'End date (YYYY-MM-DD)' },
						},
						required: ['fromIata', 'toIata', 'start', 'end'],
						additionalProperties: false,
					},
				},
			},
			{
				type: 'function',
				function: {
					name: 'getHotelsData',
					description: 'Get hotels data for a given destination for a given number of guests between a start and end date',
					parameters: {
						type: 'object',
						properties: {
							to: { type: 'string', description: 'Destination city or place name' },
							travellers: { type: 'number', description: 'Guests (adults)' },
							start: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
							end: { type: 'string', description: 'End date (YYYY-MM-DD)' },
						},
						required: ['to', 'travellers', 'start', 'end'],
						additionalProperties: false,
					},
				},
			},
		],
		toolsMap: {
			getNearbyAirports: async ({ lat, lon }) => {
				return await new SupabaseAirportsRepo({ url: config.SUPABASE_URL, apiKey: config.SUPABASE_API_KEY, logger }).getNearbyAirports({
					lat,
					lon,
				});
			},
			getCoordinates: async ({ place }) => {
				return await new CoordinatesService({ logger }).get(place);
			},
			getWeatherData: async ({ lat, lon }) => {
				return await new WeatherService({ api_key: config.OPENWEATHER_API_KEY, logger }).get({ lat, lon });
			},
			getFlightsData: async ({ fromIata, toIata, start, end }) => {
				return await new FlightsService({ api_key: config.SERPAPI_API_KEY, logger }).get({ fromIata, toIata, start, end });
			},
			getHotelsData: async ({ to, travellers, start, end }) => {
				return await new HotelsService({ api_key: config.SERPAPI_API_KEY, logger }).get({ to, travellers, start, end });
			},
		},
	});
}
