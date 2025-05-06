const runDataKey = 'runData';

function getRunData() {
  return JSON.parse(localStorage.getItem(runDataKey) || '[]');
}

function saveRun() {
  const date = document.getElementById('date').value;
  const distance = parseFloat(document.getElementById('distance').value);
  const time = parseFloat(document.getElementById('time').value);
  const type = document.getElementById('type').value;
  const notes = document.getElementById('notes').value;

  if (!date || isNaN(distance) || isNaN(time) || distance <= 0 || time <= 0) {
    alert('Please fill out all fields with valid values.');
    return;
  }

  const runs = getRunData();
  const existingIndex = runs.findIndex(r => r.date === date);
  if (existingIndex !== -1) {
    if (!confirm("You've already logged a run for this day. Overwrite it?")) {
      return;
    }
    runs[existingIndex] = { date, distance, time, type, notes };
  } else {
    runs.push({ date, distance, time, type, notes });
  }

  localStorage.setItem(runDataKey, JSON.stringify(runs));
  updateStats();
}

function deleteRun(date) {
  const runs = getRunData().filter(r => r.date !== date);
  localStorage.setItem(runDataKey, JSON.stringify(runs));
  updateStats();
}

function editRun(date) {
  const runs = getRunData();
  const run = runs.find(r => r.date === date);
  if (!run) return;
  document.getElementById('date').value = run.date;
  document.getElementById('distance').value = run.distance;
  document.getElementById('time').value = run.time;
  document.getElementById('type').value = run.type || '';
  document.getElementById('notes').value = run.notes || '';
}

function updateStats() {
  const runs = getRunData().sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
  const totalTime = runs.reduce((sum, r) => sum + r.time, 0);
  const pace = totalDistance > 0 ? (totalTime / totalDistance).toFixed(2) : 0;

  document.getElementById('run-count').textContent = runs.length;
  document.getElementById('total-distance').textContent = totalDistance.toFixed(2);
  document.getElementById('total-time').textContent = totalTime.toFixed(0);
  document.getElementById('average-pace').textContent = pace;

  const today = new Date();
  const weekStart = new Date();
  weekStart.setDate(today.getDate() - 6);
  const recentRuns = runs.filter(r => new Date(r.date) >= weekStart);
  const weekDistance = recentRuns.reduce((sum, r) => sum + r.distance, 0);
  const weekTime = recentRuns.reduce((sum, r) => sum + r.time, 0);
  const weekPace = weekDistance > 0 ? (weekTime / weekDistance).toFixed(2) : 0;

  document.getElementById('avg-distance-week').textContent = recentRuns.length > 0 ? (weekDistance / recentRuns.length).toFixed(2) : 0;
  document.getElementById('avg-time-week').textContent = recentRuns.length > 0 ? (weekTime / recentRuns.length).toFixed(0) : 0;
  document.getElementById('avg-pace-week').textContent = weekPace;

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const hasRun = runs.some(r => r.date === key);
    if (hasRun) {
      streak++;
    } else {
      break;
    }
  }
  document.getElementById('current-streak').textContent = streak;

  const daysLogged = runs.map(r => r.date).sort().reverse().slice(0, 10);
  document.getElementById('days-logged').textContent = daysLogged.join(', ');

  const historyContainer = document.getElementById('run-history');
  if (historyContainer) {
    historyContainer.innerHTML = '';
    const recent = runs.slice(-10).reverse();
    for (const run of recent) {
      const div = document.createElement('div');
      div.className = 'run-entry';
      div.innerHTML = `
        <strong>${run.date}</strong> - ${run.distance} km in ${run.time} mins 
        (${(run.time / run.distance).toFixed(2)} min/km)
        <br><em>${run.type || ''}</em> - ${run.notes || ''}
        <br>
        <button onclick="editRun('${run.date}')">Edit</button>
        <button onclick="deleteRun('${run.date}')">Delete</button>
      `;
      historyContainer.appendChild(div);
    }
  }

  updateChart(runs);
  updateHeatmap(runs);
}

function updateChart(runs) {
  const ctx = document.getElementById('distanceChart').getContext('2d');
  const labels = runs.map(r => r.date);
  const data = runs.map(r => r.distance);

  if (window.distanceChart) window.distanceChart.destroy();
  window.distanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Distance (km)',
        data,
        fill: false,
        borderColor: '#0066cc',
        tension: 0.1
      }]
    }
  });
}

function updateHeatmap(runs) {
  const map = document.getElementById('heatmap');
  map.innerHTML = '';
  const days = new Set(runs.map(r => r.date));
  const today = new Date();
  for (let i = 0; i < 42; i++) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const div = document.createElement('div');
    div.className = 'heat-day';
    if (days.has(iso)) div.classList.add('logged');
    map.appendChild(div);
  }
}

function exportData() {
  const runs = getRunData();
  const blob = new Blob([JSON.stringify(runs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'runData.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const fileInput = document.getElementById('importFile');
  if (fileInput.files.length === 0) return alert('Please select a JSON file to import.');

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error();
      localStorage.setItem(runDataKey, JSON.stringify(imported));
      updateStats();
    } catch {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(fileInput.files[0]);
}

document.getElementById('date').valueAsDate = new Date();
updateStats();
