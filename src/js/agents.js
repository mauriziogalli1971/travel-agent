import {
  getCoordinates,
  getFlightsData,
  getHotelsData,
  getNearbyAirports,
  getWeatherData,
} from './utils.js';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;
import { OpenAI } from 'openai';

const client = new OpenAI({
  dangerouslyAllowBrowser: true,
  apiKey: OPENAI_KEY,
});

const config = {
  model: 'gpt-4.1-nano',
  temperature: 0.8,
  frequency_penalty: 0.0,
};

export async function weatherAgent({ to, start, end }) {
  const systemPrompt = `
    You cycle through Thought, Action, PAUSE, Observation. At the end of the loop 
    you output a final Answer. Your final answer should be highly specific to the 
    observations you have from running the actions.
    1. Thought: Describe your thoughts about the question you have been asked.
    2. Action: run one of the actions available to you - then return PAUSE.
    3. PAUSE
    4. Observation: will be the result of running those actions.
  
    Available actions:
    - getWeatherData:
        Input format: a single JSON object with keys lat, lon, start, end.
        Example:
        Action: getWeatherData: {"lat": 51.5085, "lon": -0.12574, "start": "2025-12-06", "end": "2025-12-13"}
    
    - getCoordinates:
        Input format: a single JSON object with key place (city or place name).
        Example:
        Action: getCoordinates: {"place": "London"}
    
    Rules:
    - When calling actions ALWAYS pass a JSON object (not a list, not CSV, not text).
    - Do not add extra commentary on the Action line.
  
    Example session:
    Question: I want to know how will be the weather during my stay period in my destination.
    
    Thought: I should look up the coordinates of the user's destination
    Action: getCoordinates: {"place": "London"}
    PAUSE
    
    You will be called again with something like this:
    Observation: {"lat":51.5073219,"lon":-0.1276474}
    
    Then you loop again:
    Thought: I need the weather for the coordinates and dates.
    Action: getWeatherData: {"lat": 51.5085, "lon": -0.12574, "start": "2025-12-06", "end": "2025-12-13"}
    PAUSE
    
    You'll then be called again with something like this:
    Observation: {
      "latitude": 52.52,
      "longitude": 13.419,
      "elevation": 44.812,
      "generationtime_ms": 2.2119,
      "utc_offset_seconds": 0,
      "timezone": "Europe/Berlin",
      "timezone_abbreviation": "CEST",
      "hourly": {
          "time": ["2022-07-01T00:00", "2022-07-01T01:00", "2022-07-01T02:00", ...],
          "temperature_2m": [13, 12.7, 12.7, 12.5, 12.5, 12.8, 13, 12.9, 13.3, ...]
      },
      "hourly_units": {
          "temperature_2m": "°C"
      }
    }
    
    You then output:
    Answer: You can expect the weather to be quite mild. Low will be 19° and high will be 25°.
    
    Instructions about Answer:
    - Always explicitly prefix your answer with "Answer:".
    - Output the weather forecast in a just one sentence.
    - Use just one adjective to describe the weather. 
    - Always include the minimum and maximum temperatures in Celsius.
    - Do not include any date in the sentence.
    `;

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `What will be the weather during my next trip to ${to} between ${start} and ${end}?`,
    },
  ];
  const MAX_ITERATIONS = 10;
  const availableActions = {
    getWeatherData,
    getCoordinates,
  };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const response = await client.chat.completions.create({
        ...config,
        messages,
      });

      if (!response) {
        throw new Error('No response from OpenAI API');
      }

      const { content } = response.choices[0].message;
      if (!content) {
        throw new Error('No content in response');
      }
      const answerLine = getAnswerLine(content);
      if (answerLine) return getAnswer(answerLine);

      messages.push({
        role: 'assistant',
        content,
      });

      const action = actionLookup(content);
      if (action) {
        let { fn, params } = action;
        if (
          !fn ||
          !Object.prototype.hasOwnProperty.call(availableActions, fn)
        ) {
          messages.push({
            role: 'assistant',
            content: `Observation: Invalid action "${fn}"`,
          });
          continue;
        }

        const parsedParams = parseParams(params);

        try {
          const result = await availableActions[fn](parsedParams);
          messages.push({
            role: 'assistant',
            content: `Observation: ${JSON.stringify(result)}`,
          });
        } catch (error) {
          messages.push({
            role: 'assistant',
            content: `Observation: ${error.message}`,
          });
        }
      } else {
        messages.push({
          role: 'assistant',
          content: `Observation: no action found.`,
        });
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  // Fallback if no Answer produced
  return 'Unable to determine the weather right now.';
}

export async function flightsAgent({ from, to, travellers, start, end }) {
  const systemPrompt = `
    You cycle through Thought, Action, PAUSE, Observation. At the end of the loop 
    you output a final Answer. Your final answer should be highly specific to the 
    observations you have from running the actions.
    1. Thought: Describe your thoughts about the question you have been asked.
    2. Action: run one of the actions available to you - then return PAUSE.
    3. PAUSE
    4. Observation: will be the result of running those actions.
    
    You MUST always output exactly one of: Thought, Action: : , or Answer:. 
    After Action, ALWAYS output PAUSE on the next line. Do not output Answer until at least one Observation has been seen.
  
    Available actions:
    - getCoordinates:
        Input format: a single JSON object with key place (city or place name).
        Example:
        Action: getCoordinates: {"place": "London"}
          
    - getNearbyAirports: 
      Input format: a single JSON object with keys lat, lon.
          Example:
          Action: getNearbyAirports: {"lat": 51.5085, "lon": -0.12574}
          
    - getFlightsData:
      Input format: a single JSON object with keys fromIata, toIata, start, end.
          Example:
          Action: getFlightsData: {"fromIata": ["TRS", "LJU", "VCE", "TSF", "PUY"], "toIata": ["LCY", "LHR", "LGW", "LTN", "STN"], "start": "2025-12-07", "end": "2025-12-14"}
          
    Rules:
    - When calling actions ALWAYS pass a JSON object (not a list, not CSV, not text).
    - Do not add extra commentary on the Action line.
    
    Example session:
    Question: what is the best flight from Trieste to London between 2025-12-07 and 2025-12-14 for 2 adults? 
    
    Thought: I should look up the coordinates of the user's location.
    Action: getCoordinates: Trieste
    PAUSE
    
    You will be called again with something like this:
    Observation: {"lat": 45.6361, "lon": 13.8042}
    
    Then you loop again:
    Thought: I need search the international airports near to user's location.
    Action: getNearbyAirports: {"lat": 45.6361, "lon": 13.8042}
    PAUSE
    
    You will be called again with something like this:
    Observation: {"airports": ["TRS", "LJU", "VCE", "TSF", "PUY"]}
    
    Then you loop again:
    Thought: I should look up the coordinates of the user's destination
    Action: getCoordinates: London
    PAUSE
    
    You will be called again with something like this:
    Observation: {"lat":51.5073219,"lon":-0.1276474}
    
    Then you loop again:
    Thought: I need search the international airports near to user's destination.
    Action: getNearbyAirports: {"lat": 51.5085, "lon": -0.12574}
    PAUSE
    
    You will be called again with something like this:
    Observation: {"airports": ["LCY", "LHR", "LGW", "LTN", "STN"]}
    
    Then you loop again:
    Thought: I need search flights from the airports nearest to user's location to the airports nearest to user's destination.
    Action: getFlightsData: {"fromIata": ["TRS", "LJU", "VCE", "TSF", "PUY"], "toIata": ["LCY", "LHR", "LGW", "LTN", "STN"], "start": "2025-12-07", "end": "2025-12-14"}
    PAUSE
    
    You will be called again with something like this:
    Observation: '[{"flights":[{"departure_airport":{"name":"Trieste Airport","id":"TRS","time":"2025-12-08 14:40"},"arrival_airport":{"name":"Frankfurt Airport","id":"FRA","time":"2025-12-08 16:10"},"duration":90,"airplane":"Embraer 190","airline":"Air Dolomiti","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/EN.png","travel_class":"Economy","flight_number":"EN 8819","ticket_also_sold_by":["Lufthansa"],"legroom":"30 in","extensions":["Average legroom (30 in)","Carbon emissions estimate: 188 kg"]},{"departure_airport":{"name":"Frankfurt Airport","id":"FRA","time":"2025-12-08 18:05"},"arrival_airport":{"name":"Heathrow Airport","id":"LHR","time":"2025-12-08 18:45"},"duration":100,"airplane":"Airbus A320neo","airline":"Lufthansa","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/LH.png","travel_class":"Economy","flight_number":"LH 918","legroom":"29 in","extensions":["Below average legroom (29 in)","In-seat USB outlet","Carbon emissions estimate: 139 kg"]}],"layovers":[{"duration":115,"name":"Frankfurt Airport","id":"FRA"}],"total_duration":305,"carbon_emissions":{"this_flight":328000,"typical_for_this_route":211000,"difference_percent":55},"price":888,"type":"Round trip","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/multi.png","departure_token":"WyJDalJJV2psTGFVb3hkMVJNYTBGQlMyVkJNM2RDUnkwdExTMHRMUzB0TFhsc2Ftd3hOa0ZCUVVGQlIyc3hiMHRaUkdoSFZEWkJFZ3hGVGpnNE1UbDhURWc1TVRnYUN3akF0UVVRQWhvRFJWVlNPQnh3d2FjRyIsW1siVFJTIiwiMjAyNS0xMi0wOCIsIkZSQSIsbnVsbCwiRU4iLCI4ODE5Il0sWyJGUkEiLCIyMDI1LTEyLTA4IiwiTEhSIixudWxsLCJMSCIsIjkxOCJdXV0="},{"flights":[{"departure_airport":{"name":"Trieste Airport","id":"TRS","time":"2025-12-08 11:15"},"arrival_airport":{"name":"Leonardo da Vinci International Airport","id":"FCO","time":"2025-12-08 12:25"},"duration":70,"airplane":"Airbus A220 Passenger","airline":"ITA","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/AZ.png","travel_class":"Economy","flight_number":"AZ 1358","legroom":"30 in","extensions":["Average legroom (30 in)","Wi-Fi for a fee","In-seat USB outlet","Carbon emissions estimate: 124 kg"]},{"departure_airport":{"name":"Leonardo da Vinci International Airport","id":"FCO","time":"2025-12-08 14:20"},"arrival_airport":{"name":"Munich International Airport","id":"MUC","time":"2025-12-08 15:55"},"duration":95,"airplane":"Airbus A321","airline":"Lufthansa","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/LH.png","travel_class":"Economy","flight_number":"LH 1869","legroom":"30 in","extensions":["Average legroom (30 in)","Wi-Fi for a fee","Carbon emissions estimate: 185 kg"]},{"departure_airport":{"name":"Munich International Airport","id":"MUC","time":"2025-12-08 17:35"},"arrival_airport":{"name":"Heathrow Airport","id":"LHR","time":"2025-12-08 18:35"},"duration":120,"airplane":"Airbus A320neo","airline":"Lufthansa","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/LH.png","travel_class":"Economy","flight_number":"LH 2480","legroom":"29 in","extensions":["Below average legroom (29 in)","In-seat USB outlet","Carbon emissions estimate: 174 kg"]}],"layovers":[{"duration":115,"name":"Leonardo da Vinci International Airport","id":"FCO"},{"duration":100,"name":"Munich International Airport","id":"MUC"}],"total_duration":500,"carbon_emissions":{"this_flight":485000,"typical_for_this_route":211000,"difference_percent":130},"price":1358,"type":"Round trip","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/multi.png","departure_token":"WyJDalJJV2psTGFVb3hkMVJNYTBGQlMyVkJNM2RDUnkwdExTMHRMUzB0TFhsc2Ftd3hOa0ZCUVVGQlIyc3hiMHRaUkdoSFZEWkJFaFJCV2pFek5UaDhURWd4T0RZNWZFeElNalE0TUJvTENMaWtDQkFDR2dORlZWSTRISERqMGdrPSIsW1siVFJTIiwiMjAyNS0xMi0wOCIsIkZDTyIsbnVsbCwiQVoiLCIxMzU4Il0sWyJGQ08iLCIyMDI1LTEyLTA4IiwiTVVDIixudWxsLCJMSCIsIjE4NjkiXSxbIk1VQyIsIjIwMjUtMTItMDgiLCJMSFIiLG51bGwsIkxIIiwiMjQ4MCJdXV0="},{"flights":[{"departure_airport":{"name":"Trieste Airport","id":"TRS","time":"2025-12-08 11:15"},"arrival_airport":{"name":"Leonardo da Vinci International Airport","id":"FCO","time":"2025-12-08 12:25"},"duration":70,"airplane":"Airbus A220 Passenger","airline":"ITA","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/AZ.png","travel_class":"Economy","flight_number":"AZ 1358","legroom":"30 in","extensions":["Average legroom (30 in)","Wi-Fi for a fee","In-seat USB outlet","Carbon emissions estimate: 124 kg"]},{"departure_airport":{"name":"Leonardo da Vinci International Airport","id":"FCO","time":"2025-12-08 13:30"},"arrival_airport":{"name":"Frankfurt Airport","id":"FRA","time":"2025-12-08 15:25"},"duration":115,"airplane":"Airbus A321neo","airline":"Lufthansa","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/LH.png","travel_class":"Economy","flight_number":"LH 233","legroom":"29 in","extensions":["Below average legroom (29 in)","In-seat USB outlet","Carbon emissions estimate: 178 kg"],"often_delayed_by_over_30_min":true},{"departure_airport":{"name":"Frankfurt Airport","id":"FRA","time":"2025-12-08 17:05"},"arrival_airport":{"name":"Heathrow Airport","id":"LHR","time":"2025-12-08 17:45"},"duration":100,"airplane":"Airbus A320neo","airline":"Lufthansa","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/LH.png","travel_class":"Economy","flight_number":"LH 916","legroom":"29 in","extensions":["Below average legroom (29 in)","In-seat USB outlet","Carbon emissions estimate: 139 kg"]}],"layovers":[{"duration":65,"name":"Leonardo da Vinci International Airport","id":"FCO"},{"duration":100,"name":"Frankfurt Airport","id":"FRA"}],"total_duration":450,"carbon_emissions":{"this_flight":443000,"typical_for_this_route":211000,"difference_percent":110},"price":1372,"type":"Round trip","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/multi.png","departure_token":"WyJDalJJV2psTGFVb3hkMVJNYTBGQlMyVkJNM2RDUnkwdExTMHRMUzB0TFhsc2Ftd3hOa0ZCUVVGQlIyc3hiMHRaUkdoSFZEWkJFaEpCV2pFek5UaDhURWd5TXpOOFRFZzVNVFlhQ3dpd3J3Z1FBaG9EUlZWU09CeHd3ZDhKIixbWyJUUlMiLCIyMDI1LTEyLTA4IiwiRkNPIixudWxsLCJBWiIsIjEzNTgiXSxbIkZDTyIsIjIwMjUtMTItMDgiLCJGUkEiLG51bGwsIkxIIiwiMjMzIl0sWyJGUkEiLCIyMDI1LTEyLTA4IiwiTEhSIixudWxsLCJMSCIsIjkxNiJdXV0="},{"flights":[{"departure_airport":{"name":"Trieste Airport","id":"TRS","time":"2025-12-08 07:35"},"arrival_airport":{"name":"Milan Linate Airport","id":"LIN","time":"2025-12-08 08:35"},"duration":60,"airplane":"Airbus A220-100 Passenger","airline":"ITA","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/AZ.png","travel_class":"Economy","flight_number":"AZ 1350","legroom":"30 in","extensions":["Average legroom (30 in)","Wi-Fi for a fee","In-seat USB outlet","Carbon emissions estimate: 120 kg"]},{"departure_airport":{"name":"Milan Linate Airport","id":"LIN","time":"2025-12-08 10:45"},"arrival_airport":{"name":"Frankfurt Airport","id":"FRA","time":"2025-12-08 12:00"},"duration":75,"airplane":"Embraer 195","airline":"Air Dolomiti","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/EN.png","travel_class":"Economy","flight_number":"EN 8801","ticket_also_sold_by":["Lufthansa"],"legroom":"30 in","extensions":["Average legroom (30 in)","Carbon emissions estimate: 160 kg"]},{"departure_airport":{"name":"Frankfurt Airport","id":"FRA","time":"2025-12-08 14:05"},"arrival_airport":{"name":"Heathrow Airport","id":"LHR","time":"2025-12-08 14:45"},"duration":100,"airplane":"Airbus A320neo","airline":"Lufthansa","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/LH.png","travel_class":"Economy","flight_number":"LH 908","legroom":"29 in","extensions":["Below average legroom (29 in)","In-seat USB outlet","Carbon emissions estimate: 139 kg"]}],"layovers":[{"duration":130,"name":"Milan Linate Airport","id":"LIN"},{"duration":125,"name":"Frankfurt Airport","id":"FRA"}],"total_duration":490,"carbon_emissions":{"this_flight":420000,"typical_for_this_route":211000,"difference_percent":99},"price":1525,"type":"Round trip","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/multi.png","departure_token":"WyJDalJJV2psTGFVb3hkMVJNYTBGQlMyVkJNM2RDUnkwdExTMHRMUzB0TFhsc2Ftd3hOa0ZCUVVGQlIyc3hiMHRaUkdoSFZEWkJFaE5CV2pFek5UQjhSVTQ0T0RBeGZFeElPVEE0R2dzSW9LY0pFQUlhQTBWVlVqZ2NjSXpyQ2c9PSIsW1siVFJTIiwiMjAyNS0xMi0wOCIsIkxJTiIsbnVsbCwiQVoiLCIxMzUwIl0sWyJMSU4iLCIyMDI1LTEyLTA4IiwiRlJBIixudWxsLCJFTiIsIjg4MDEiXSxbIkZSQSIsIjIwMjUtMTItMDgiLCJMSFIiLG51bGwsIkxIIiwiOTA4Il1dXQ=="},{"flights":[{"departure_airport":{"name":"Trieste Airport","id":"TRS","time":"2025-12-08 13:05"},"arrival_airport":{"name":"Milan Linate Airport","id":"LIN","time":"2025-12-08 14:05"},"duration":60,"airplane":"Airbus A220-100 Passenger","airline":"ITA","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/AZ.png","travel_class":"Economy","flight_number":"AZ 1352","legroom":"30 in","extensions":["Average legroom (30 in)","Wi-Fi for a fee","In-seat USB outlet","Carbon emissions estimate: 120 kg"]},{"departure_airport":{"name":"Milan Linate Airport","id":"LIN","time":"2025-12-08 14:55"},"arrival_airport":{"name":"Paris Charles de Gaulle Airport","id":"CDG","time":"2025-12-08 16:30"},"duration":95,"airplane":"Airbus A320","airline":"Air France","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/AF.png","travel_class":"Economy","flight_number":"AF 1013","legroom":"29 in","extensions":["Below average legroom (29 in)","Wi-Fi for a fee","In-seat USB outlet","Carbon emissions estimate: 147 kg"]},{"departure_airport":{"name":"Paris Charles de Gaulle Airport","id":"CDG","time":"2025-12-08 18:00"},"arrival_airport":{"name":"Heathrow Airport","id":"LHR","time":"2025-12-08 18:20"},"duration":80,"airplane":"Airbus A220-300 Passenger","airline":"Air France","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/AF.png","travel_class":"Economy","flight_number":"AF 1180","legroom":"30 in","extensions":["Average legroom (30 in)","Wi-Fi for a fee","In-seat USB outlet","Carbon emissions estimate: 109 kg"]}],"layovers":[{"duration":50,"name":"Milan Linate Airport","id":"LIN"},{"duration":90,"name":"Paris Charles de Gaulle Airport","id":"CDG"}],"total_duration":375,"carbon_emissions":{"this_flight":378000,"typical_for_this_route":211000,"difference_percent":79},"price":1536,"type":"Round trip","airline_logo":"https://www.gstatic.com/flights/airline_logos/70px/multi.png","departure_token":"WyJDalJJV2psTGFVb3hkMVJNYTBGQlMyVkJNM2RDUnkwdExTMHRMUzB0TFhsc2Ftd3hOa0ZCUVVGQlIyc3hiMHRaUkdoSFZEWkJFaFJCV2pFek5USjhRVVl4TURFemZFRkdNVEU0TUJvTENOU3ZDUkFDR2dORlZWSTRISER4OUFvPSIsW1siVFJTIiwiMjAyNS0xMi0wOCIsIkxJTiIsbnVsbCwiQVoiLCIxMzUyIl0sWyJMSU4iLCIyMDI1LTEyLTA4IiwiQ0RHIixudWxsLCJBRiIsIjEwMTMiXSxbIkNERyIsIjIwMjUtMTItMDgiLCJMSFIiLG51bGwsIkFGIiwiMTE4MCJdXV0="}]'
    
    You then output:
    Answer: Your best option is to fly from Trieste Airport with Air Dolomiti with a layover in Frankfurt.
    
    Instructions about Answer:
    - Always explicitly prefix your answer with "Answer:".
    - Output the recommendation in a just one sentence.
    - Do not include any date in the sentence.
    - Always include the company. 
    - Include layover if any.
  `;

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `what is the best flight from ${from} to ${to} between ${start} and ${end} for ${travellers} adults?`,
    },
  ];
  const MAX_ITERATIONS = 10;
  const availableActions = {
    getCoordinates,
    getNearbyAirports,
    getFlightsData,
  };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const response = await client.chat.completions.create({
        ...config,
        messages,
      });

      const { content } = response.choices[0].message;
      const answerLine = getAnswerLine(content);
      if (answerLine) return getAnswer(answerLine);

      messages.push({
        role: 'assistant',
        content,
      });

      const action = actionLookup(content);
      if (action) {
        let { fn, params } = action;

        if (
          !fn ||
          !Object.prototype.hasOwnProperty.call(availableActions, fn)
        ) {
          messages.push({
            role: 'assistant',
            content: `Observation: invalid action: ${fn}`,
          });
        }

        const parsedParams = JSON.parse(params);

        try {
          const result = await availableActions[fn](parsedParams);
          messages.push({
            role: 'assistant',
            content: `Observation: ${JSON.stringify(result)}`,
          });
        } catch (error) {
          messages.push({
            role: 'assistant',
            content: `Observation: ${error.message}`,
          });
        }
      } else {
        messages.push({
          role: 'assistant',
          content: `Observation: no action found.`,
        });
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  return 'Unable to find a suitable flight. Please try again.';
}

export async function hotelsAgent({ to, travellers, start, end }) {
  const systemPrompt = `
  You cycle through Thought, Action, PAUSE, Observation. At the end of the loop 
    you output a final Answer. Your final answer should be highly specific to the 
    observations you have from running the actions.
    1. Thought: Describe your thoughts about the question you have been asked.
    2. Action: run one of the actions available to you - then return PAUSE.
    3. PAUSE
    4. Observation: will be the result of running those actions.
  
    Available actions:
    - getHotelsData:
      Input format: a single JSON object with keys fromIata, toIata, start, end.
          Example:
          Action: getHotelsData: {"to": "London", "travellers": 2, "start": "2025-12-07", "end": "2025-12-14"}
          
    Rules:
    - When calling actions ALWAYS pass a JSON object (not a list, not CSV, not text).
    - Do not add extra commentary on the Action line.
    
    Example session:
    Question: 
    What is the best hotel in London for 2 adults in the period between ${start} and ${end}?
    
    Thought: I need to collect all the possible hotels in London for 2 in the period between 7-dec-2025 and 14-dec-2025.
    Action: getHotelsData: getHotelsData: {"to": "London", "travellers": 2, "start": "2025-12-07", "end": "2025-12-14"}
    PAUSE
    
    You will be called again with something like this:
    Observation: '{"ads":[{"name":"Holiday Inn Express London - Greenwich by IHG","source":"Holiday Inn Express London - Greenwich by IHG","source_icon":"https://www.gstatic.com/travel-hotels/branding/2905805132092915444.png","link":"https://www.google.com/aclk?sa=l&ai=DChsSEwjyitzFirCRAxVXAwwCHTe3Kq0YACICCAEQDRoCdnU&co=1&ase=2&gclid=EAIaIQobChMI8orcxYqwkQMVVwMMAh03tyqtEA0YASABEgKGtfD_BwE&cid=CAASuwHkaDUXDuTLBPitPDT2S8YwQr1EjdD6XEGEDoEKBXcmSpWMDy87aeXuWs9Hhe-CQdSpbSiqm4W9YnflNco_1IOtbfGEMr_35wQ2Ibrnkw0TNVGrfY_xgd6aUFdh_KdLcW7jvgHYHTuxodUttWkvtjIzOm75BSDYv0Vf2NQBuHB3nTapAkTwKtJzDDr9FGXQFQ3rlp3Y4fk26NBJnnHLkwPVzgAUm4u1zJorqdy-St5eop9TNy7pskQ6ML6-&category=acrcp_v1_48&sig=AOD64_0RdbmUSRlFa4812MWMSb5grFmU6g&adurl=","property_token":"CgoIwtH-yb2QoqNnEAE","serpapi_property_details_link":"https://serpapi.com/search.json?adults=2&check_in_date=2025-12-10&check_out_date=2025-12-11&children=0&currency=EUR&engine=google_hotels&gl=us&hl=en&property_token=CgoIwtH-yb2QoqNnEAE&q=London","gps_coordinates":{"latitude":51.492321999999994,"longitude":0.009975},"hotel_class":3,"thumbnail":"https://lh4.googleusercontent.com/proxy/XR14OC6D4om2wkSSOoiEJnfDu6of7HRjyx7ZutXzZXThsuEj4F4_zG5YIVoTdwLzE-XohIdyvv-u2Joa_2EPBo2Ahf3HmhHYzTnNLJP8LBqNfWLo-t8tesXdhCVahvGiiPPHfBFJt_kAQecN9FM5nDd-j_Q99fg=w225-h150-k-no","overall_rating":4,"reviews":2627,"price":"€257","extracted_price":257,"amenities":["Pet-friendly","Kid-friendly","Bar","Free breakfast","Air conditioning"],"free_cancellation":true},{"name":"Park Hotel Ilford","source":"Booking.com","source_icon":"https://www.gstatic.com/travel-hotels/branding/icon_184.png","link":"https://www.google.com/aclk?sa=l&ai=DChsSEwjyitzFirCRAxVXAwwCHTe3Kq0YACICCAEQBxoCdnU&co=1&ase=2&gclid=EAIaIQobChMI8orcxYqwkQMVVwMMAh03tyqtEA0YAiABEgJEnfD_BwE&cid=CAASuwHkaDUXDuTLBPitPDT2S8YwQr1EjdD6XEGEDoEKBXcmSpWMDy87aeXuWs9Hhe-CQdSpbSiqm4W9YnflNco_1IOtbfGEMr_35wQ2Ibrnkw0TNVGrfY_xgd6aUFdh_KdLcW7jvgHYHTuxodUttWkvtjIzOm75BSDYv0Vf2NQBuHB3nTapAkTwKtJzDDr9FGXQFQ3rlp3Y4fk26NBJnnHLkwPVzgAUm4u1zJorqdy-St5eop9TNy7pskQ6ML6-&category=acrcp_v1_48&sig=AOD64_18rIThO1aN7L9IVZumlGlHTB0CJQ&adurl=","property_token":"CgsI4vzxuqCwltrWARAB","serpapi_property_details_link":"https://serpapi.com/search.json?adults=2&check_in_date=2025-12-10&check_out_date=2025-12-11&children=0&currency=EUR&engine=google_hotels&gl=us&hl=en&property_token=CgsI4vzxuqCwltrWARAB&q=London","gps_coordinates":{"latitude":51.567637,"longitude":0.064979},"hotel_class":2,"thumbnail":"https://lh3.googleusercontent.com/proxy/z1URsvJgaijy8vxw9dMMc5PfW4XBDKLJvP-k-zghEcXhVoYb-nXeF5B2CcdNtI2Ud0BLEDwGfUgFEa36nJRFR5eo3RkPQI3TGMTscB57xytt4_5ESg3yqj8mQ_5xsx_NXihfH5GSEjmklozJGUy-czG-FyB03zM=w225-h150-k-no","overall_rating":2.9,"reviews":384,"price":"€38","extracted_price":38,"amenities":["Kid-friendly","Restaurant","Free breakfast","Air conditioning"]}]}'
    
    You then output:
    Answer: We recommend you stay at the Park Hotel Ilford in central London.
    
    Instructions about Answer:
    - Always explicitly prefix your answer with "Answer:".
    - Include only the name of the hotel, the rating, the reviews and the price.  
    - Do not include any date in the sentence or accompanying information.
    - Output the recommendation in a just one sentence.
  `;

  const messages = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: `What is the best hotel in ${to} for ${travellers} in the period between ${start} and ${end}?`,
    },
  ];
  const MAX_ITERATIONS = 10;
  const availableActions = {
    getHotelsData,
  };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    try {
      const response = await client.chat.completions.create({
        ...config,
        messages,
      });

      const { content } = response.choices[0].message;
      const answerLine = getAnswerLine(content);
      if (answerLine) return getAnswer(answerLine);

      messages.push({
        role: 'assistant',
        content,
      });

      const action = actionLookup(content);
      if (action) {
        let { fn, params } = action;

        if (
          !fn ||
          !Object.prototype.hasOwnProperty.call(availableActions, fn)
        ) {
          messages.push({
            role: 'assistant',
            content: `Observation: invalid action: ${fn}`,
          });
        }

        const parsedParams = JSON.parse(params);

        try {
          const result = await availableActions[fn](parsedParams);
          messages.push({
            role: 'assistant',
            content: `Observation: ${JSON.stringify(result)}`,
          });
        } catch (error) {
          messages.push({
            role: 'assistant',
            content: `Observation: ${error.message}`,
          });
        }
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  return 'Unable to find a suitable hotel. Please try again.';
}

function actionLookup(content) {
  const split = content.split('\n');
  const actionRegex = /^\s*Action\s*:\s*([\w-]+)\s*:\s*(.+)\s*$/i;
  for (const line of split) {
    const match = line.match(actionRegex);
    if (match) return { fn: match[1], params: match[2] };
  }
}

function getAnswerLine(content) {
  return content
    .split('\n')
    .find((l) => l.trim().toLowerCase().startsWith('answer:'));
}

function getAnswer(answerLine) {
  return answerLine.split(/answer:\s*/i)[1].trim();
}

function parseParams(params) {
  if (typeof params !== 'string') return params;
  const trimmed = params.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
}
