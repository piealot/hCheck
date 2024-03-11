import { ChangeEvent, useState } from 'react'
import './App.css'

function App() {
  type Status = "idle" | "loading" | "success" | "error";
  const [cMinutes, setCMinutes] = useState(0);
  const [rate, setRate] = useState(63.5)
  const [file, setFile] = useState<File>();
  const [state, setState] = useState<Status>('idle');

  async function fetchData(startDate: string, endDate: string, airports: string[], urlArg?: string): Promise<any> {

    const airportsForUrl = airports.join("%2C");

    const url = urlArg || `https://flight-info-api.p.rapidapi.com/schedules?version=v2&DepartureDateTime=${startDate}%2F${endDate}&CarrierCode=FR&DepartureAirport=${airportsForUrl}&ArrivalAirport=${airportsForUrl}&CodeType=iata`;
    // const url = "https://mp12b1ae507eddf4c1bc.free.beeceptor.com/data"
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.API_KEY || "",
        'X-RapidAPI-Host': 'flight-info-api.p.rapidapi.com'
      }
    };

    try {
      const response = await fetch(url, options);
      const content = await response.json();
      const { paging } = content

      if (paging.next) {
        content.data.push(...await fetchData("", "", [], paging.next))
      }
      console.log(content.data)
      return content.data;

    } catch (e) {
      console.log({ e })
      setState('error');
    }
  }

  interface itemObj {
    [key: string]: string;
  }

  const handleButton = () => {
    setState('loading')
    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      if (target && typeof target.result === 'string') {
        const contents = target.result;
        const lines = contents.split("\n");
        const header = lines[0].split(",");
        const parsedData: itemObj[] = [];

        for (let i = 1; i < lines.length; i++) {
          if (lines[i] !== "") {
            const line = lines[i].split(",");
            const item: itemObj = {};

            for (let j = 0; j < header.length; j++) {
              const key = header[j].trim();
              const value = line[j]?.trim();
              item[key] = value;
            }
            parsedData.push(item);
          }
        }
        const initialDate = parsedData[0]["DATE"];
        const endDate = parsedData[parsedData.length - 1]["DATE"];
        const airports: string[] = [];

        for (const record of parsedData) {
          const depAirport = record["DEPARTURE_AIRPORT"];
          const arrAirport = record["ARRIVAL_AIRPORT"];

          if (!airports.includes(depAirport)) {
            airports.push(depAirport);
          }
          if (!airports.includes(arrAirport)) {
            airports.push(arrAirport);
          }
        }
        const data = await fetchData(initialDate, endDate, airports)
        const minutes = parsedData.reduce((acc: any, record) => {
          const depAirport = record["DEPARTURE_AIRPORT"];
          const arrAirport = record["ARRIVAL_AIRPORT"];
          const date = record["DATE"];

          for (const dataRecord of data) {
            if (dataRecord["departure"]["airport"]["iata"] === depAirport && dataRecord["arrival"]["airport"]["iata"] === arrAirport && dataRecord["departure"]["date"]["utc"] === date) {
              return acc + dataRecord["elapsedTime"]
            }
          }
          console.log(depAirport, arrAirport, date, "not found")
          return acc;
        }, 0)
        setCMinutes(minutes)
        setState('success')

      }


    };
    if (file) {
      reader.readAsText(file);
    } else {
      setState('error')
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {

    if (e.target.files) {
      setFile(e.target.files[0])
    }

  }

  return (
    <>
      <div className='prose flex flex-col justify-center items-center text-center p-5 pb-0'>
        <h1>Check your SBH</h1>
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input file-input-bordered file-input-primary w-full max-w-s" />
        <label className="input input-bordered flex items-center w-full max-w-s gap-2 m-5">
          Rate
          <input type="number" step="0.5" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="grow" placeholder="Enter your rate per SBH" />
        </label>
        <button onClick={handleButton} className="btn btn-primary w-full">Check</button>
        <progress className={`progress m-2 max-w-xs w-full ${state === 'loading' ? "visible" : "invisible"}`}></progress>
      </div>
      <div className={`prose result text-center ${state === 'success' ? "visible" : "invisible"}`}>
        <p className='text-center text-2xl m-auto'>Total SBH: {Math.floor(cMinutes / 60)}h {cMinutes % 60}min</p>
        <p className='text-center text-2xl m-auto'>Total pay: {(cMinutes / 60 * rate).toFixed(2)}</p>
      </div>

    </>
  )
}

export default App
