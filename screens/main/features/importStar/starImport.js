import { publishStarsRaw} from '../../../main/mainView.js';

let CSV_ROWS = []; //establish blank row array
let CSV_HEADERS = []; //establish blank header array
/*
1. importStarFromCSV()
2. populateselectors()
These functions both work to import stars from CSV
*/
function importStarFromCSV(file) { //function to process csv data
  Papa.parse(file, { //papa parse imported in html
    header: true, //treats first row as column names
    dynamicTyping: true, // automatically converts string/boolean/other to numbers
    transformHeader: h => h.replace(/\uFEFF/g,'').trim(),
    complete: (csv) => {
      CSV_ROWS = (csv.data || []).filter(r => r && Object.keys(r).length); // add row data to the array
      console.log(CSV_ROWS[0].new_id) // check it 
      CSV_HEADERS = csv.meta?.fields?.map(h => h.trim()) || Object.keys(CSV_ROWS[0] || {}); //separate headers
      console.log(CSV_HEADERS[0]) // check it 
      populateSelectors(CSV_HEADERS); //calls earlier function
      document.getElementById('importFileName')?.replaceChildren(
        document.createTextNode(`Parsed ${file.name} `)
      );
    },
    error: err => console.error('Papa parse error:', err)
  });
} //function outputs headers stored in CSV_HEADERS[0-∞] array and data stored in CSV_ROWS[0-∞].(header_name)

function populateSelectors(headers) { 
  const fill = (id) => { 
    const selectElement = document.getElementById(id); //
    if (!selectElement) return; //exit if no element if found
    selectElement.innerHTML = ''; //clear old options
    headers.forEach(h => {
      const option = document.createElement('option');
      option.value = option.text = h; // set value and text 
      selectElement.appendChild(option); // add it to <select>
    });
  };
  fill('raSelect'); //fill each id
  fill('decSelect'); //fill each id
  fill('vmagSelect'); //fill each id
  fill('plxSelect'); //fill each id
} //function output fills html options with header values

document.addEventListener('DOMContentLoaded', () => { //waits for DOM to load
  const importstarbtn  = document.getElementById('importstarsBtn'); //stores this as shortened version
  const csvfile = document.getElementById('csvInput'); //stores this as shortened version

  importstarbtn?.addEventListener('click', () => csvfile?.click()); //when click, open file picker
  csvfile?.addEventListener('change', (e) => { //when file chosen, 
    const f = e.target.files?.[0]; // takes first file 
    if (f) importStarFromCSV(f); //parse data if file exists 
  });

  document.getElementById('generateStarsBtn')?.addEventListener('click', () => {
    if (!CSV_ROWS.length) return alert('No CSV loaded.'); //if 0 rows, return error

    const raKey  = document.getElementById('raSelect')?.value; //store raKey as const
    const decKey = document.getElementById('decSelect')?.value; //store decKey as const
    const magKey = document.getElementById('vmagSelect')?.value; //store magKey as const
    const plxKey = document.getElementById('plxSelect')?.value; //store plxKey as const

    const starsRaw = CSV_ROWS.map(row => ({ // this section maps each row into an array of data for each star
      ra:  parseFloat(row?.[raKey]),
      dec: parseFloat(row?.[decKey]),
      mag: parseFloat(row?.[magKey]),
      plx: parseFloat(row?.[plxKey]),
    })).filter(s => Number.isFinite(s.ra) && Number.isFinite(s.dec));

    publishStarsRaw(starsRaw); //function imported from mainView.js
    // (optional log) console.log(starsRaw[i]);
  });
}); //star data sent to mainView.js