export function isValid({ start, end, from, to, travellers, budget }) {
	return (
		isValidDateRange(start, end) && isValidTravellers(travellers) && isValidLocation(from) && isValidLocation(to) && isValidBudget(budget)
	);
}

export function isValidCoords(lat, lon) {
	if (lat == null || lon == null) return false;
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
	if (lat < -90 || lat > 90) return false;
	return !(lon < -180 || lon > 180);
}

export function isValidTravellers(travellers) {
	return Number.isFinite(travellers) && travellers > 0;
}

export function isValidLocation(location) {
	// Location cannot contain special characters or digits
	if (/[^a-zA-Z ]/g.test(location)) return false;
	return typeof location === 'string' && location.length > 0;
}

export function isValidDateRange(start, end) {
	if (!start || !end) return false;
	if (!isValidDate(start) || !isValidDate(end)) return false;
	// Range dates are valid if they are both valid dates and start is before end
	return Date.parse(start) < Date.parse(end);
}

export function isValidDate(date) {
	return !isNaN(Date.parse(date)) && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function isValidBudget(budget) {
	return Number.isFinite(budget) && budget > 0;
}
