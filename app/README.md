# Travel Agent (React + OpenAI)

An interactive trip planner that orchestrates multiple “agents” to help plan your travel:

- Weather agent: summarizes expected weather for a destination and date range.
- Flights agent: suggests a flight option based on nearby airports and availability.
- Hotels agent: recommends a hotel with key details.

Built with React and Vite, and powered by the OpenAI API plus public data sources for weather, geocoding, flights, and
hotels.

## Features

- Multi-agent orchestration (Weather, Flights, Hotels)
- Iterative Thought/Action/Observation loops to call tools (APIs) and refine answers
- Final one-sentence answers suitable for UI display
- Client-side app with minimal setup

## Tech Stack

- React 19
- Vite
- OpenAI JavaScript SDK
- Fetch-based utilities to call external APIs
- ESLint and Prettier for code quality

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys:
    - OpenAI API key (required)
    - OpenWeather API key (for geocoding; if your utilities use OpenWeather)
    - Any other keys if you extend data sources

### Installation

1. Clone the repo
2. Install dependencies

```shell script
npm install
```

3. Create a .env file (at project root) and set:

```shell script
VITE_OPENAI_API_KEY=your_openai_key_here
   VITE_OPENWEATHER_API_KEY=your_openweather_key_here
```

Ensure the variable names match what your code reads.

### Run Dev Server

```shell script
npm run dev
```

Open the URL printed in the terminal (typically http://localhost:5173).

### Build for Production

```shell script
npm run build
npm run preview
```

## Project Structure

- src/js/agents.js
    - weatherAgent: gets coordinates then weather and returns a one-sentence forecast.
    - flightsAgent: finds nearby airports and searches flights, returns a one-sentence suggestion.
    - hotelsAgent: fetches available hotels and returns a single-sentence recommendation.
- src/js/utils.js
    - getWeatherData, getCoordinates, getFlightsData, getNearbyAirports, getHotelsData utilities (fetch wrappers).
- src/components, src/css, src/img
    - UI components, styles, and assets.
- App.jsx / main.jsx
    - App bootstrap and routing.

## How It Works

- The UI collects trip info: from, to, travellers, start, end, budget.
- The app runs agents in parallel (Promise.all).
- Each agent:
    - Prompts the model with system instructions describing Thought → Action → Observation loops.
    - Extracts an Action from the model output.
    - Calls the corresponding utility function (tool).
    - Feeds the Observation (tool result) back to the conversation.
    - Stops when an Answer is produced (one concise sentence per agent).

## Environment Variables

- VITE_OPENAI_API_KEY: OpenAI API key (required).
- VITE_OPENWEATHER_API_KEY: OpenWeather key if used by your geocoding/forecast utilities.
- Add more variables as needed for other data providers.

Note: Vite exposes environment variables prefixed with VITE_ to the client code.

## Development Notes

- Use npm scripts:
    - npm run dev: start dev server
    - npm run build: production build
    - npm run preview: preview production build
    - npm run lint: run ESLint (if configured in scripts)
- The OpenAI client is configured for browser usage. Ensure you understand the security implications of exposing API
  keys in client-side apps. In production, proxy sensitive calls via a backend where possible.

## Customization

- Adjust system prompts and rules in src/js/agents.js to change agent behaviors.
- Extend utils.js to add/replace data sources.
- Modify the UI (components and styles) to match your brand.

## Troubleshooting

- No answer returned:
    - Check console for errors.
    - Ensure environment variables are set correctly.
    - Increase agent MAX_ITERATIONS if necessary.
- API errors:
    - Verify API keys and rate limits.
    - Inspect network requests in DevTools (CORS, non-200 responses).
- Formatting issues:
    - Prettier settings are in .prettierrc.
    - Run your formatter and linter to keep consistent style.

## License

MIT License. Use at your own risk.