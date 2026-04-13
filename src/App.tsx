import {useState} from 'react'

function App() {
  const [suburb, setSuburb] = useState('')

    return (
    <div>
      <h1>Bushfire Risk Dashboard</h1>
      <input
        type="text"
        placeholder="Enter your suburb or postcode"
        value={suburb}
        onChange={(e) => setSuburb(e.target.value)}
      />
      <button onClick={() => console.log(suburb)}>
        Check Risk
      </button>
    </div>
  )
}
export default App