export function Trip({ start, end, from, to, weather, flight, hotel }) {
  return (
    <div className="view trip">
      <h1>Your Trip</h1>
      <div className="row">
        <div className="col item item-dates text-center">→ {start}</div>
        <div className="col item item-dates text-center">{end} ←</div>
      </div>

      <div className="item item-dates text-center">
        <h3>
          {from} → {to}
        </h3>
      </div>

      <div>
        <h2>Weather</h2>
        <div className="item text-left fw-normal fs-small">{weather}</div>
      </div>

      <div>
        <h2>Flights</h2>
        <div className="form-control-wrapper item text-left fw-normal fs-small">
          {flight}
          <button className="form-control mt-1">Book</button>
        </div>
      </div>

      <div>
        <h2>Hotel</h2>
        <div className="form-control-wrapper item text-left fw-normal fs-small">
          {hotel}
          <button className="form-control mt-1">Book</button>
        </div>
      </div>
    </div>
  );
}
