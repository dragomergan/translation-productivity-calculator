let textData = []; // Array to store text data
let timers = []; // Array to store timers for each row

document.getElementById('fileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    // get file type
    const fileType = file.name.split(".")[file.name.split(".").length -1];
    const data = new Uint8Array(e.target.result);
    // use different code based on filetype
    if (fileType.toUpperCase() === "XLSX") {
      
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      textData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    } else if (fileType.toUpperCase().includes("XLIFF")) {

      // code for reading xliff content
      const decoder = new TextDecoder();
      const fileContent = decoder.decode(e.target.result);
      
      const parsedXML = xmlParser(fileContent);
      const transUnits = parsedXML.querySelectorAll("xliff trans-unit");

      transUnits.forEach (unit => {
        const sourceUnits = unit.querySelectorAll("source");
        const targetUnits = unit.querySelectorAll("target");
        const unitID = unit.getAttribute("id");
        sourceUnits.forEach((sourceUnit, i) => {
          textData.push([unitID, sourceUnit.innerHTML, targetUnits[i].innerHTML])
        })
        
      })

    }
    
    displayTable();
  };
  reader.readAsArrayBuffer(file);
});

function calculateEditDistance(string1, string2) {
  var matrix = [];
  var i, j;

  // Initialize matrix with appropriate dimensions
  for (i = 0; i <= string1.length; i++) {
    matrix[i] = [i];
  }

  for (j = 0; j <= string2.length; j++) {
    matrix[0][j] = j;
  }

  // Calculate edit distance using dynamic programming
  for (i = 1; i <= string1.length; i++) {
    for (j = 1; j <= string2.length; j++) {
      if (string1.charAt(i - 1) == string2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[string1.length][string2.length];
}

function displayTable() {
  const dataBody = document.getElementById('dataBody');
  dataBody.innerHTML = ''; // Clear existing table rows
  timers = []; // Clear timers array

  textData.forEach((row, index) => {
    const timer = {
      start: 0,
      end: 0,
      elapsed: 0,
    };
    timers.push(timer); // Initialize timer for each row

    const newRow = document.createElement('div');
    newRow.classList.add('table-row');
    newRow.innerHTML = `
      <div class="table-cell">${row[0]}</div>
      <div class="table-cell">${row[1]}</div>
      <div class="table-cell">${row[2]}</div>
      <div class="table-cell"><button class="clear-btn">Clear</button></div>
      <div class="table-cell"><button class="start-btn">Start</button></div>
      <div class="table-cell editable-cell">${row[2]}</div>
      <div class="table-cell">0</div>
      <div class="table-cell edit-distance"></div>
    `;
    dataBody.appendChild(newRow);

    const clearBtn = newRow.querySelector('.clear-btn');
    const startBtn = newRow.querySelector('.start-btn');
    const yourVersionCell = newRow.querySelector('.editable-cell'); // Get the "Your Version" cell in the same row
    const timeSpentCell = newRow.querySelector('.table-cell:nth-last-child(2)'); // Get the time spent cell in the same row
    const editDistanceCell = newRow.querySelector('.edit-distance');

    clearBtn.addEventListener('click', function () {
      yourVersionCell.textContent = '';
    });

    startBtn.addEventListener('click', function () {
      const rowIndex = Array.from(newRow.parentNode.children).indexOf(newRow); // Get the index of this row

      if (startBtn.textContent === 'Start') {
        startBtn.textContent = 'Save';
        yourVersionCell.contentEditable = true; // Make the cell editable
        yourVersionCell.focus(); // Set focus to the editable cell
        timers[rowIndex].start = new Date().getTime();
      } else {
        timers[rowIndex].end = new Date().getTime();
        const elapsedTime = Math.floor((timers[rowIndex].end - timers[rowIndex].start) / 1000);
        timers[rowIndex].elapsed += elapsedTime; // Accumulate time spent
        timeSpentCell.textContent = timers[rowIndex].elapsed; // Update time spent cell
        startBtn.textContent = 'Start';
        yourVersionCell.contentEditable = false; // Make the cell non-editable

        // Calculate and display edit distance
        const firstVersion = row[2]; // First Version (3rd column)
        const yourVersion = yourVersionCell.textContent; // Your Version (6th column)
        const editDistance = yourVersion!== ''? calculateEditDistance(firstVersion, yourVersion) : 100;
        editDistanceCell.textContent = `${editDistance}%`;
      }
    });
  });
}

// function to be used for parsing xliff content
function xmlParser(xmlcontent) {
	let parser = new DOMParser;
	let xmldoc = parser.parseFromString(xmlcontent, "text/xml");
	return xmldoc;
}

// Function to download table as HTML
document.getElementById('downloadButton').addEventListener('click', function () {
  const userName = prompt('Please enter your name:');
  if (!userName) return;

  const dataBody = document.getElementById('dataBody');
  const rows = dataBody.querySelectorAll('.table-row');

  let html = '<table>';
  html += '<thead><tr>';
  html += '<th>Task Name</th>';
  html += '<th>English</th>';
  html += '<th>First Version</th>';
  html += '<th>Your Version</th>';
  html += '<th>Time Spent</th>';
  html += `<th>Edit Distance</th>`;
  html += '<th>User</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  rows.forEach(row => {
    const cells = row.querySelectorAll('.table-cell');
    const taskName = cells[0].textContent;
    const english = cells[1].textContent;
    const firstVersion = cells[2].textContent;
    const yourVersion = cells[5].textContent;
    const timeSpent = cells[6].textContent;
    const editDistance = cells[7].textContent;

    html += '<tr>';
    html += `<td>${taskName}</td>`;
    html += `<td>${english}</td>`;
    html += `<td>${firstVersion}</td>`;
    html += `<td>${yourVersion}</td>`;
    html += `<td>${timeSpent}</td>`;
    html += `<td>${editDistance}</td>`;
    html += `<td>${userName}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'table.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});