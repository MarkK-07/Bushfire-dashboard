import { useState } from 'react'

interface Coordinates {
  lat: number
  lon: number
  name: string
}

interface CurrentConditions {
  temperature: number
  humidity: number
  windSpeed: number
  precipitation: number
}

interface PeakConditions {
  maxTemperature: number
  maxHumidity: number
  maxWindSpeed: number
  precipitation: number
  droughtFactor: number
}

interface WeatherData {
  current: CurrentConditions
  peak: PeakConditions
  droughtFactor: number
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

async function getCurrentConditions(name: string): Promise<CurrentConditions | null> {
  try {
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(name)}?format=j1`
    )
    const data = await response.json()
    const current = data.current_condition[0]
    return {
      temperature: parseFloat(current.temp_C),
      humidity: parseFloat(current.humidity),
      windSpeed: parseFloat(current.windspeedKmph),
      precipitation: parseFloat(current.precipMM)
    }
  } catch {
    return null
  }
}

function calculateDroughtFactor(dailyRainfall: number[]): number {
  const weights = dailyRainfall.map((_, i) => Math.exp(-0.1 * i))
  const weightedRain = dailyRainfall.reduce(
    (sum, rain, i) => sum + rain * weights[i], 0
  )
  const maxPossible = weights.reduce((sum, w) => sum + w * 10, 0)
  const wetness = Math.min(weightedRain / maxPossible, 1)
  return parseFloat((10 * (1 - wetness)).toFixed(1))
}

async function getPeakConditions(lat: number, lon: number): Promise<PeakConditions> {
  const today = new Date()
  const endDate = today.toISOString().split('T')[0]
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 30)
  const startDateStr = startDate.toISOString().split('T')[0]

  const [forecastResponse, historicalResponse] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,relative_humidity_2m_max,wind_speed_10m_max,precipitation_sum&forecast_days=1&timezone=Australia/Sydney`
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum&start_date=${startDateStr}&end_date=${endDate}&timezone=Australia/Sydney`
    )
  ])

  const forecastData = await forecastResponse.json()
  const historicalData = await historicalResponse.json()

  const dailyRainfall: number[] = [...historicalData.daily.precipitation_sum]
    .reverse()
    .map((v: number) => v ?? 0)

  const droughtFactor = calculateDroughtFactor(dailyRainfall)

  return {
    maxTemperature: forecastData.daily.temperature_2m_max[0],
    maxHumidity: forecastData.daily.relative_humidity_2m_max[0],
    maxWindSpeed: forecastData.daily.wind_speed_10m_max[0],
    precipitation: forecastData.daily.precipitation_sum[0],
    droughtFactor
  }
}

async function getWeatherData(coords: Coordinates): Promise<WeatherData> {
  const [current, peak] = await Promise.all([
    getCurrentConditions(coords.name),
    getPeakConditions(coords.lat, coords.lon)
  ])

  const fallbackCurrent: CurrentConditions = {
    temperature: peak.maxTemperature,
    humidity: peak.maxHumidity,
    windSpeed: peak.maxWindSpeed,
    precipitation: peak.precipitation
  }

  return {
    current: current ?? fallbackCurrent,
    peak,
    droughtFactor: peak.droughtFactor
  }
}

function App() {
  const [suburb, setSuburb] = useState('')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    setLoading(true)
    const coords = await getCoordinates(suburb)
    const weatherData = await getWeatherData(coords)
    setWeather(weatherData)
    setLoading(false)
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

      {loading && <p>Loading weather data...</p>}

      {!loading && weather && (
        <div>
          <h2>Current Conditions (BOM Observed)</h2>
          <p>Temperature: {weather.current.temperature}°C</p>
          <p>Humidity: {weather.current.humidity}%</p>
          <p>Wind Speed: {weather.current.windSpeed} km/h</p>
          <p>Precipitation: {weather.current.precipitation}mm</p>

          <h2>Today's Peak Forecast (FFDI Inputs)</h2>
          <p>Max Temperature: {weather.peak.maxTemperature}°C</p>
          <p>Max Humidity: {weather.peak.maxHumidity}%</p>
          <p>Max Wind Speed: {weather.peak.maxWindSpeed} km/h</p>
          <p>Drought Factor: {weather.droughtFactor} / 10</p>
        </div>
      )}
    </div>
  )
}

export default App