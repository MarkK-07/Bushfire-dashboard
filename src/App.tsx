import { useState } from 'react'

interface Coordinates {
  lat: number
  lon: number
  name: string
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

function App() {
  const [suburb, setSuburb] = useState('')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)

  async function handleSearch() {
    const coords = await getCoordinates(suburb)
    setCoordinates(coords)
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
    </div>
  )
}

export default App