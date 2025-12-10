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
