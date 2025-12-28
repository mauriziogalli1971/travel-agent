import { useEffect, useRef, useState } from 'react';
import incrementIcon from '../assets/increment.svg';
import decrementIcon from '../assets/decrement.svg';
import { Trip } from './Trip.jsx';

const dateTimeFormat = new Intl.DateTimeFormat(navigator.language, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export default function Settings() {
  const MIN_TRAVELLERS = 1;
  const MAX_TRAVELLERS = 10;
  const [travellers, setTravellers] = useState(1);

  const [from, setFrom] = useState('Trieste');
  const [to, setTo] = useState('London');

  const ONE_DAY = 1000 * 60 * 60 * 24;
  const MIN_STAY = 7 * ONE_DAY;
  const TODAY = new Date();
  const TOMORROW = new Date(TODAY.getTime() + ONE_DAY);
  const MAX_DATE = new Date(TODAY.getTime() + 30 * ONE_DAY);
  const [start, setStart] = useState(formatDate(new Date(TOMORROW.getTime())));
  const [end, setEnd] = useState(
    formatDate(new Date(TOMORROW.getTime() + MIN_STAY))
  );
  const [budget, setBudget] = useState(1000);
  const loader = useRef({});
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    // loader.current = document.querySelector('.loader');
    navigator.geolocation.getCurrentPosition((position) => {
      const userLocation = {
        lat: 0,
        lon: 0,
      };
      userLocation.lat = position.coords.latitude;
      userLocation.lon = position.coords.longitude;
      getLocationName(userLocation)
        .then((location) => {
          setFrom(location.address.city);
        })
        .catch((error) => {
          console.error(error);
          setFrom('');
        });
    });
  }, []);

  return !trip ? (
    <form className="view form" onSubmit={callTravelAgentWorker}>
      <div className="loader" ref={loader}></div>
      <div className="form-control-wrapper">
        <label htmlFor="travellers">Number of travellers</label>
        <div className="form-control">
          <button type="button" className="spinner" onClick={removeTraveller}>
            <img src={decrementIcon} width="100" height="100" alt="decrement icon"></img>
          </button>
          <input
            id="travellers"
            name="travellers"
            type="text"
            readOnly
            value={travellers}
          />
          <button type="button" className="spinner" onClick={addTraveller}>
            <img src={incrementIcon} width="100" height="100" alt="increment icon"></img>
          </button>
        </div>
      </div>

      <div className="form-control-wrapper mt-3">
        <label htmlFor="from">Flying from</label>
        <div className="form-control">
          <input
            id="from"
            name="from"
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
      </div>

      <div className="form-control-wrapper">
        <label htmlFor="to">Flying to</label>
        <div className="form-control">
          <input
            id="to"
            name="to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="form-control-wrapper mt-3">
        <label htmlFor="start">From date</label>
        <div className="form-control">
          <input
            id="start"
            name="start"
            type="date"
            min={start}
            max={MAX_DATE}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
      </div>

      <div className="form-control-wrapper">
        <label htmlFor="end">To date</label>
        <div className="form-control">
          <input
            id="end"
            name="end"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="form-control-wrapper mt-3">
        <label htmlFor="budget">Budget (EUR)</label>
        <div className="form-control">
          <input
            id="budget"
            name="budget"
            type="text"
            value={budget}
            onChange={(e) => setBudget(+e.target.value)}
          />
        </div>
      </div>

      <button className="form-control" onClick={() => void null}>
        Plan my trip!
      </button>
    </form>
  ) : (
    <Trip {...trip} />
  );

  function addTraveller() {
    if (travellers >= MAX_TRAVELLERS) return;
    return setTravellers(travellers + 1);
  }

  function removeTraveller() {
    if (travellers <= MIN_TRAVELLERS) return;
    return setTravellers(travellers - 1);
  }

  function formatDate(date) {
    return dateTimeFormat
      .formatToParts(date)
      .filter((item) => item.type !== 'literal')
      .reverse()
      .map((part) => part.value)
      .join('-');
  }

  async function getLocationName({ lat, lon }) {
    const baseUrl = import.meta.env.DEV
      ? '/nominatim'
      : 'https://nominatim.openstreetmap.org';
    const nominatimUrl = `${baseUrl}/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    try {
      const response = await fetch(nominatimUrl);
      return await response.json();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async function callTravelAgentWorker(e) {
    e.preventDefault();

    loader.current.classList.add('loading');
    try {
      const workerUrl = import.meta.env.DEV
        ? 'http://localhost:8787/'
        : 'https://travel-agent-worker.mauriziogalli1971.workers.dev/';

      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, travellers, start, end, budget }),
      });

      const tripData = await response.json();
      if (!tripData)
        throw new Error(
          'No trip data returned from the worker. Please check the logs for more details.'
        );

      setTrip(tripData);
    } catch (error) {
      return <h1>{error.message}</h1>;
    }
  }
}
