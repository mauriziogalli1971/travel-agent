import { ValidationError } from './errors.js';
import { isValidBudget, isValidDate, isValidDateRange, isValidLocation, isValidTravellers } from '../utils/validators';

export class TripData {
	constructor(props) {
		this.from = props.from;
		this.to = props.to;
		this.travellers = props.travellers;
		this.start = props.start;
		this.end = props.end;
		this.budget = props.budget;
	}

	static create(raw) {
		const errors = [];

		const from = String(raw.from || '').trim();
		const to = String(raw.to || '').trim();
		const travellers = Number(raw.travellers || 1);
		const start = String(raw.start || '').trim();
		const end = String(raw.end || '').trim();
		const budget = Number(raw.budget || 0);

		if (!isValidLocation(from)) errors.push('Invalid from location: ' + from);
		if (!isValidLocation(to)) errors.push('Invalid to location: ' + to);
		if (!isValidTravellers(travellers)) errors.push('Invalid travellers: ' + travellers);
		if (!isValidDate(start)) errors.push('Invalid start date: ' + start);
		if (!isValidDate(end)) errors.push('Invalid end date: ' + end);
		if (!isValidDateRange(start, end)) errors.push('Invalid dates: "start" "date must be before "end" date');
		if (!isValidBudget(budget)) errors.push('Budget must be a number greater than 0.');

		if (errors.length) {
			throw new ValidationError('Invalid TripRequest', { fields: errors });
		}

		return new TripData({ from, to, travellers, start, end, budget });
	}
}
