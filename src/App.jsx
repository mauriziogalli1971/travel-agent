import { Start } from "./components/Start.jsx";
import Settings from "./components/Settings.jsx";
import { useState } from "react";

function App() {
  const [intro, setIntro] = useState(true);

  return (
    <div className="container">
      {intro ? <Start setIntro={setIntro} /> : <Settings />}
    </div>
  );
}

export default App;
