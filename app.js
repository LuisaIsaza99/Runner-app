const RUNNERS_KEY = "tropi-runners-club:runners";
const RUNS_KEY = "tropi-runners-club:runs";
const TEAM_GOAL_KM = 100;

const runnerForm = document.querySelector("#runner-form");
const runnerNameInput = document.querySelector("#runner-name");
const runnerJoinDateInput = document.querySelector("#runner-join-date");
const runnerPhotoInput = document.querySelector("#runner-photo");
const runnerList = document.querySelector("#runner-list");
const runnerEmpty = document.querySelector("#runner-empty");

const runForm = document.querySelector("#run-form");
const runRunnerSelect = document.querySelector("#run-runner");
const runDateInput = document.querySelector("#run-date");
const runHoursInput = document.querySelector("#run-hours");
const runMinutesInput = document.querySelector("#run-minutes");
const runSecondsInput = document.querySelector("#run-seconds");
const runKilometresInput = document.querySelector("#run-kilometres");
const runEmpty = document.querySelector("#run-empty");
const runTableWrap = document.querySelector("#run-table-wrap");
const runTableBody = document.querySelector("#run-table-body");

const teamKmOutput = document.querySelector("#team-km");
const teamRunsOutput = document.querySelector("#team-runs");
const teamPaceOutput = document.querySelector("#team-pace");
const runnerBars = document.querySelector("#runner-bars");
const teamBarWrap = document.querySelector("#team-bar-wrap");
const toast = document.querySelector("#toast");

let runners = loadRunners();
let runs = loadRuns();
let toastTimer;

setDefaultDates();
renderAll();

runnerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const runnerName = runnerNameInput.value.trim();
  if (!runnerName || !runnerJoinDateInput.value) {
    showToast("Runner name and join date are required.");
    return;
  }

  let photoData = null;
  const photoFile = runnerPhotoInput.files[0];

  if (photoFile) {
    try {
      photoData = await readFileAsDataUrl(photoFile);
    } catch (error) {
      console.warn("Could not read selected image.", error);
      showToast("Photo upload failed. Try another image.");
      return;
    }
  }

  const runner = {
    id: createId("runner"),
    name: runnerName,
    joinDate: runnerJoinDateInput.value,
    photoData
  };

  runners.push(runner);
  saveRunners();
  renderAll();
  runnerForm.reset();
  runnerJoinDateInput.value = toDateInputValue(new Date());
  showToast("Runner added to Tropi Runners Club.");
});

runForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!runners.length) {
    showToast("Add at least one runner first.");
    return;
  }

  const runnerId = runRunnerSelect.value;
  const date = runDateInput.value;
  const hours = Number(runHoursInput.value);
  const minutes = Number(runMinutesInput.value);
  const seconds = Number(runSecondsInput.value);
  const kilometres = Number(runKilometresInput.value);
  const durationSeconds = (hours * 3600) + (minutes * 60) + seconds;

  if (!runnerId || !date || kilometres <= 0 || durationSeconds <= 0) {
    showToast("Select runner, add valid time, and kilometres.");
    return;
  }

  const run = {
    id: createId("run"),
    runnerId,
    date,
    durationSeconds,
    kilometres
  };

  runs.push(run);
  saveRuns();
  renderRuns();
  renderDashboard();
  runHoursInput.value = "0";
  runMinutesInput.value = "0";
  runSecondsInput.value = "0";
  runKilometresInput.value = "";
  showToast("Run logged.");
});

function renderAll() {
  renderRunnerList();
  renderRunnerSelect();
  renderRuns();
  renderDashboard();
}

function renderRunnerList() {
  runnerList.replaceChildren();
  runnerEmpty.hidden = runners.length > 0;
  runnerList.hidden = runners.length === 0;

  runners
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name))
    .forEach((runner) => {
      const item = document.createElement("li");
      item.className = "runner-item";

      const avatar = createAvatar(runner);
      const content = document.createElement("div");
      const title = document.createElement("h3");
      const meta = document.createElement("p");

      title.textContent = runner.name;
      meta.className = "runner-meta";
      meta.textContent = `Joined ${formatDate(runner.joinDate)}`;

      content.append(title, meta);
      item.append(avatar, content);
      runnerList.append(item);
    });
}

function createAvatar(runner) {
  const avatar = document.createElement("div");
  avatar.className = "avatar";

  if (runner.photoData) {
    const image = document.createElement("img");
    image.src = runner.photoData;
    image.alt = `${runner.name} profile photo`;
    avatar.append(image);
    return avatar;
  }

  const initials = runner.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  avatar.textContent = initials || "RN";
  return avatar;
}

function renderRunnerSelect() {
  const currentValue = runRunnerSelect.value;
  runRunnerSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = runners.length ? "Choose a runner" : "Add runners first";
  runRunnerSelect.append(placeholder);

  runners
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name))
    .forEach((runner) => {
      const option = document.createElement("option");
      option.value = runner.id;
      option.textContent = runner.name;
      runRunnerSelect.append(option);
    });

  runRunnerSelect.value = runners.some((runner) => runner.id === currentValue) ? currentValue : "";
  runRunnerSelect.disabled = runners.length === 0;
}

function renderRuns() {
  const sortedRuns = runs
    .slice()
    .filter((run) => runners.some((runner) => runner.id === run.runnerId))
    .sort((first, second) => second.date.localeCompare(first.date));

  runTableBody.replaceChildren();
  runEmpty.hidden = sortedRuns.length > 0;
  runTableWrap.hidden = sortedRuns.length === 0;

  sortedRuns.forEach((run) => {
    const row = document.createElement("tr");
    const runner = runners.find((item) => item.id === run.runnerId);
    const pace = run.durationSeconds / run.kilometres;

    row.append(
      createCell(runner ? runner.name : "Unknown"),
      createCell(formatDate(run.date)),
      createCell(formatDuration(run.durationSeconds)),
      createCell(`${formatNumber(run.kilometres)} km`),
      createCell(`${formatPace(pace)} /km`)
    );

    runTableBody.append(row);
  });
}

function renderDashboard() {
  const safeRuns = runs.filter((run) => runners.some((runner) => runner.id === run.runnerId));
  const totalKm = safeRuns.reduce((sum, run) => sum + run.kilometres, 0);
  const totalDurationSeconds = safeRuns.reduce((sum, run) => sum + run.durationSeconds, 0);

  teamKmOutput.textContent = `${totalKm.toFixed(2)} km`;
  teamRunsOutput.textContent = String(safeRuns.length);
  teamPaceOutput.textContent = totalKm > 0
    ? `${formatPace(totalDurationSeconds / totalKm)} /km`
    : "--:-- /km";

  const summaryByRunner = runners.map((runner) => {
    const runnerRuns = safeRuns.filter((run) => run.runnerId === runner.id);
    return {
      id: runner.id,
      name: runner.name,
      totalKm: runnerRuns.reduce((sum, run) => sum + run.kilometres, 0),
      runsCount: runnerRuns.length
    };
  });

  summaryByRunner.sort((first, second) => second.totalKm - first.totalKm);
  renderRunnerBars(summaryByRunner);
  renderTeamBar(totalKm);
}

function renderRunnerBars(summaryByRunner) {
  runnerBars.replaceChildren();
  const maxKm = Math.max(1, ...summaryByRunner.map((item) => item.totalKm));

  if (!summaryByRunner.length) {
    runnerBars.append(createNote("No runners to compare yet."));
    return;
  }

  summaryByRunner.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("div");
    label.className = "bar-label";

    const name = document.createElement("strong");
    name.textContent = item.name;

    const value = document.createElement("span");
    value.textContent = `${item.totalKm.toFixed(2)} km (${item.runsCount} runs)`;

    label.append(name, value);

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${(item.totalKm / maxKm) * 100}%`;

    track.append(fill);
    row.append(label, track);
    runnerBars.append(row);
  });
}

function renderTeamBar(totalKm) {
  teamBarWrap.replaceChildren();

  const row = document.createElement("div");
  row.className = "bar-row";

  const label = document.createElement("div");
  label.className = "bar-label";

  const title = document.createElement("strong");
  title.textContent = "Team progress";

  const value = document.createElement("span");
  value.textContent = `${totalKm.toFixed(2)} / ${TEAM_GOAL_KM} km`;

  label.append(title, value);

  const track = document.createElement("div");
  track.className = "bar-track";

  const fill = document.createElement("div");
  fill.className = "bar-fill";
  fill.style.width = `${Math.min(100, (totalKm / TEAM_GOAL_KM) * 100)}%`;
  track.append(fill);

  const note = createNote(
    totalKm >= TEAM_GOAL_KM
      ? "Goal reached! Team is performing above target."
      : `${(TEAM_GOAL_KM - totalKm).toFixed(2)} km left to reach team goal.`
  );

  row.append(label, track);
  teamBarWrap.append(row, note);
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function createNote(text) {
  const note = document.createElement("p");
  note.className = "team-note";
  note.textContent = text;
  return note;
}

function setDefaultDates() {
  const today = toDateInputValue(new Date());
  runnerJoinDateInput.value = today;
  runDateInput.value = today;
}

function loadRunners() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RUNNERS_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((runner) => runner && runner.id && runner.name && runner.joinDate)
      .map((runner) => ({
        id: String(runner.id),
        name: String(runner.name),
        joinDate: String(runner.joinDate),
        photoData: typeof runner.photoData === "string" ? runner.photoData : null
      }));
  } catch (error) {
    console.warn("Could not load runners from storage.", error);
    return [];
  }
}

function loadRuns() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RUNS_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((run) => run && run.id && run.runnerId && run.date)
      .map((run) => ({
        id: String(run.id),
        runnerId: String(run.runnerId),
        date: String(run.date),
        durationSeconds: Number(run.durationSeconds),
        kilometres: Number(run.kilometres)
      }))
      .filter((run) => run.durationSeconds > 0 && run.kilometres > 0);
  } catch (error) {
    console.warn("Could not load runs from storage.", error);
    return [];
  }
}

function saveRunners() {
  localStorage.setItem(RUNNERS_KEY, JSON.stringify(runners));
}

function saveRuns() {
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatPace(secondsPerKm) {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes;
  const normalizedSeconds = seconds === 60 ? 0 : seconds;
  return `${normalizedMinutes}:${String(normalizedSeconds).padStart(2, "0")}`;
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}
