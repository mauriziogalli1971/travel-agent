Here’s a pragmatic, clean-architecture strategy to improve this worker.

High-level goals

- Clear separation of concerns (HTTP, application/use-cases, domain, infrastructure).
- Deterministic, testable logic with minimal side effects.
- Explicit contracts and error handling.
- Observability and configurability.

Proposed architecture

- Entry (HTTP adapter)
    - Responsibility: parse/validate request, call application service, map results to HTTP response, handle CORS and
      errors.
    - Tools: lightweight validator (e.g., zod) or manual schema.
- Application layer (use-cases)
    - Orchestrates the flow: run agents, aggregate results.
    - Pure logic; depends on abstracted services via interfaces.
    - Use dependency injection to pass service implementations.
- Domain layer
    - Types and value objects: TripRequest, TripResult, WeatherSummary, FlightOption, HotelOption, Coordinates,
      AirportIata.
    - Domain policies (e.g., final message constraints).
- Infrastructure layer
    - OpenAI client service (chat, tool-call loop).
    - Supabase repository (RPC wrapper).
    - HTTP clients for external APIs (open-meteo, serpapi, openweathermap).
    - Logging.
    - Configuration.

Key refactors

- Request validation
    - Validate input shape and domain invariants (date format, start <= end, travellers > 0).
    - Normalize locations, trim strings.
- Config management
    - Centralize env loading/validation at startup with explicit errors: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_API_KEY,
      OPENWEATHER_API_KEY, SERPAPI_API_KEY, GATEWAY_URL.
- Logging/observability
    - Single logger with levels and request correlation ID.
    - Structured logs; no console.log scattered.
    - Wrap external calls with timing and status metrics.
- Error model
    - Typed errors: ValidationError, DependencyError, RemoteApiError, ToolExecutionError, UnexpectedError.
    - HTTP adapter maps errors to 4xx/5xx consistently.
- Tool execution engine
    - Isolate “tool-call loop” as a reusable utility:
        - Accepts tools registry (name -> function).
        - Accepts messages, runs until no tool_calls or max-steps.
        - Appends tool results automatically.
        - Configurable safety (max steps, per-tool timeout).
    - Parse function arguments robustly; reject unsafe JSON.
- Agents as pure orchestrations
    - WeatherAgent: step plan -> ask coords -> weather -> summarize.
    - FlightsAgent: origin airports -> destination airports -> flights -> summarize.
    - HotelsAgent: hotels -> summarize.
    - Each returns a well-typed result (domain DTO), not a free-form string; do final “one-sentence” formatting at
      adapter or a dedicated presenter.
- External services abstraction
    - CoordinatesService.get(place): { lat, lon }.
    - AirportsService.nearby(lat, lon): AirportIata[].
    - WeatherService.get(lat, lon, start, end): RawWeather -> WeatherSummary.
    - FlightsService.search(fromIata[], toIata[], start, end): FlightOption[].
    - HotelsService.search(to, travellers, start, end): HotelOption[].
    - AIService.chat(messages, tools, config) to hide provider specifics (baseURL, model, tool schema differences).
- Concurrency
    - Run agents concurrently in the application layer with Promise.allSettled to avoid collapsing the entire response
      if one fails; provide partial results with errors list.
- Determinism and retries
    - Timeouts and retries with backoff for external HTTP calls.
    - Idempotent tool functions (pure from inputs).
- Security and resilience
    - Input sanitation.
    - Limit tool loop steps to avoid runaway calls.
    - Clamp arrays length (IATA lists) and payload sizes.
- CORS and HTTP semantics
    - Consistent CORS headers and OPTIONS handling.
    - JSON error body with code and message.

Concrete restructuring (files/modules)

- http/
    - handler.js (fetch adapter, CORS, error mapping)
    - validators.js (request schema)
- app/
    - planTrip.js (orchestrator calling 3 agents in parallel)
    - agents/
        - weatherAgent.js
        - flightsAgent.js
        - hotelsAgent.js
- domain/
    - types.js (TripRequest, TripResult, WeatherSummary, FlightOption, HotelOption)
    - errors.js
    - presenters.js (final one-liners formatting)
- infra/
    - ai/
        - openaiService.js (chat, tool-runner)
        - toolRunner.js (loop)
    - http/
        - fetchClient.js (with timeouts, retries, logging)
    - repos/
        - supabaseAirportsRepo.js
    - services/
        - coordinatesService.js
        - weatherService.js
        - flightsService.js
        - hotelsService.js
    - logging/
        - logger.js
    - config/
        - env.js (read/validate env, expose config object)
- index.js
    - Only wires dependencies and exports fetch.

Behavioral improvements

- Tool schema alignment
    - Ensure tool parameter schemas match runtime implementations (e.g., arrays vs strings for IATA in serpapi: convert
      arrays to comma-separated if API needs strings).
- Output consistency
    - Agents return structured data; final presenter constructs the single-sentence summaries.
- Robust tool argument parsing
    - Strict JSON parsing; reject non-JSON when schema expects object.
- Supabase RPC hardening
    - Validate RPC result shape; map null/empty to domain-empty with a warning.
- Error-tolerant aggregation
    - If one agent fails, include error in result and continue others.

Testing strategy

- Unit tests
    - Agents with mocked services.
    - ToolRunner with mocked AI responses (tool_calls sequences).
    - Services: parse and map external API payloads to domain models.
- Integration tests
    - Happy-path flow using mocked fetch.
    - Error-paths (timeouts, invalid inputs, partial failures).
- Contract tests
    - Tool schema vs implementation arguments.

Performance considerations

- Avoid await in array creation (remove unnecessary await before creating Promises).
- Use Promise.all for independent calls; allSettled for resilience.
- Cache coordinates and nearby airports per request to reduce duplicate calls.

Example focused edits you can make next

- Extract config and logger; add requestId.
- Replace agents returning strings with structured results and a presenter to format the one-liners.
- Implement a reusable toolRunner with maxSteps and per-call try/catch.
- Convert the three agent invocations to run concurrently with Promise.allSettled and aggregate.

Deployment/runtime

- Validate env at startup and fail-fast.
- Keep logs structured for Cloudflare analytics.
- Guard external calls with fetch timeout via AbortController.

Outcome

- Easier testing and maintenance, clearer boundaries, safer tool execution, better error handling, and cleaner,
  deterministic behavior.
