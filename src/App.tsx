import { useState } from 'react'

interface Coordinates {
  lat: number
  lon: number
  name: string
}

interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  precipitation: number
}

function isPostcode(query: string): boolean {
  return /^\d{4}$/.test(query)
}

async function getCoordinates(query: string): Promise<Coordinates> {
  if (isPostcode(query)) {
    const postcodeResponse = await fetch(`https://api.zippopotam.us/au/${query}`)
    const postcodeData = await postcodeResponse.json()
    const suburbName = postcodeData.places[0]['place name']
    const lat = parseFloat(postcodeData.places[0].latitude)
    const lon = parseFloat(postcodeData.places[0].longitude)
    return { lat, lon, name: suburbName }
  }

  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&country=AU`
  )
  const data = await response.json()
  return {
    lat: data.results[0].latitude,
    lon: data.results[0].longitude,
    name: data.results[0].name
  }
}

async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,relative_humidity_2m_max,wind_speed_10m_max,precipitation_sum&forecast_days=1&timezone=Australia/Sydney`
  const response = await fetch(url)
  const data = await response.json()
  return {
    temperature: data.daily.temperature_2m_max[0],
    humidity: data.daily.relative_humidity_2m_max[0],
    windSpeed: data.daily.wind_speed_10m_max[0],
    precipitation: data.daily.precipitation_sum[0]
  }
}

function App() {
  const [suburb, setSuburb] = useState('')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)

  async function handleSearch() {
    const coords = await getCoordinates(suburb)
    setCoordinates(coords)
    const weatherData = await getWeather(coords.lat, coords.lon)
    setWeather(weatherData)
  }

  return (
    <div>
      <h1>Bushfire Risk Dashboard</h1>
      <input
        type="text"
        placeholder="Enter your suburb or postcode"
        value={suburb}
        onChange={(e) => setSuburb(e.target.value)}
      />
      <button onClick={handleSearch}>
        Check Risk
      </button>
      {coordinates && (
        <p>{coordinates.name}: {coordinates.lat}, {coordinates.lon}</p>
      )}
      {weather && (
        <div>
          <p>Temperature: {weather.temperature}°C</p>
          <p>Humidity: {weather.humidity}%</p>
          <p>Wind Speed: {weather.windSpeed} km/h</p>
          <p>Precipitation: {weather.precipitation}mm</p>
        </div>
      )}
    </div>
  )
}

export default App