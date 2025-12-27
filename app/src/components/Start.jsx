import logo from "/logo.png";

export function Start({ setIntro }) {
  return (
    <div className="view start">
      <div className="form-control-wrapper">
        <img src={logo} alt="logo" width="300" height="300" />
        <button className="form-control" onClick={() => setIntro(false)}>
          Start
        </button>
      </div>
    </div>
  );
}
