import { createClient } from '@supabase/supabase-js';

export class SupabaseAirportsRepo {
	constructor({ url, apiKey, logger }) {
		this.supabase = createClient(url, apiKey);
		this.logger = logger;
	}

	async getNearbyAirports({ lat, lon }) {
		if (lat == null || lon == null) throw new Error('lat/lon required');
		const { data, error } = await this.supabase.rpc('get_nearby_airports', {
			lat,
			lon,
		});

		if (error) {
			this.logger.logInfo({
				msg: `getNearbyAirports`,
				meta: { ...error },
			});
			return [];
		}
		const iataCodes = data.map((item) => item.iata);
		this.logger.logInfo({ msg: `getNearbyAirports`, meta: { iataCodes_len: iataCodes.length } });

		return iataCodes;
	}
}
