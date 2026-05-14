const RUNNERS_KEY = "tropi-runners-club:runners";
const RUNS_KEY = "tropi-runners-club:runs";
const BAR_COLORS = ["#0ea5e9", "#14b8a6", "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#06b6d4"];

const runnerForm = document.querySelector("#runner-form");
const runnerEditIdInput = document.querySelector("#runner-edit-id");
const runnerNameInput = document.querySelector("#runner-name");
const runnerJoinDateInput = document.querySelector("#runner-join-date");
const runnerPhotoInput = document.querySelector("#runner-photo");
const runnerSubmitButton = document.querySelector("#runner-submit");
const runnerCancelButton = document.querySelector("#runner-cancel");
const runnerList = document.querySelector("#runner-list");
const runnerEmpty = document.querySelector("#runner-empty");

const runForm = document.querySelector("#run-form");
const runEditIdInput = document.querySelector("#run-edit-id");
const runRunnerSelect = document.querySelector("#run-runner");
const runDateInput = document.querySelector("#run-date");
const runHoursInput = document.querySelector("#run-hours");
const runMinutesInput = document.querySelector("#run-minutes");
const runSecondsInput = document.querySelector("#run-seconds");
const runKilometresInput = document.querySelector("#run-kilometres");
const runSubmitButton = document.querySelector("#run-submit");
const runCancelButton = document.querySelector("#run-cancel");
const runEmpty = document.querySelector("#run-empty");
const runTableWrap = document.querySelector("#run-table-wrap");
const runTableBody = document.querySelector("#run-table-body");

const teamKmOutput = document.querySelector("#team-km");
const teamRunsOutput = document.querySelector("#team-runs");
const teamPaceOutput = document.querySelector("#team-pace");
const teamTimeOutput = document.querySelector("#team-time");
const runnerBars = document.querySelector("#runner-bars");
const speedBars = document.querySelector("#speed-bars");
const contributionBar = document.querySelector("#contribution-bar");
const contributionLegend = document.querySelector("#contribution-legend");
const toast = document.querySelector("#toast");
const accordionPanels = Array.from(document.querySelectorAll("details.accordion"));

let runners = loadRunners();
let runs = loadRuns();
let toastTimer;

setDefaultDates();
setupAccordion();
setupCrossTabSync();
renderAll();

runnerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const runnerName = runnerNameInput.value.trim();
  const editId = runnerEditIdInput.value;

  if (!runnerName || !runnerJoinDateInput.value) {
    showToast("Runner name and join date are required.");
    return;
  }

  let photoData = editId
    ? (runners.find((runner) => runner.id === editId)?.photoData || null)
    : null;

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
    id: editId || createId("runner"),
    name: runnerName,
    joinDate: runnerJoinDateInput.value,
    photoData
  };

  if (editId) {
    runners = runners.map((item) => item.id === editId ? runner : item);
  } else {
    runners.push(runner);
  }

  saveRunners();
  renderAll();
  resetRunnerForm();
  showToast(editId ? "Runner updated." : "Runner added to Tropi Runners Club.");
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
  const editId = runEditIdInput.value;
  const durationSeconds = (hours * 3600) + (minutes * 60) + seconds;

  if (!runnerId || !date || kilometres <= 0 || durationSeconds <= 0) {
    showToast("Select runner, add valid time, and kilometres.");
    return;
  }

  const run = {
    id: editId || createId("run"),
    runnerId,
    date,
    durationSeconds,
    kilometres
  };

  if (editId) {
    runs = runs.map((item) => item.id === editId ? run : item);
  } else {
    runs.push(run);
  }

  saveRuns();
  renderAll();
  resetRunForm();
  showToast(editId ? "Run updated." : "Run logged.");
});

runnerCancelButton.addEventListener("click", () => {
  resetRunnerForm();
  showToast("Runner edit cancelled.");
});

runCancelButton.addEventListener("click", () => {
  resetRunForm();
  showToast("Run edit cancelled.");
});

runnerList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const runnerId = button.dataset.id;
  const action = button.dataset.action;
  const runner = runners.find((item) => item.id === runnerId);

  if (!runner) {
    return;
  }

  if (action === "edit") {
    startRunnerEdit(runner);
    showToast("Editing runner.");
    return;
  }

  if (action === "delete") {
    const relatedRuns = runs.filter((run) => run.runnerId === runnerId).length;
    const confirmed = window.confirm(
      `Delete ${runner.name}? This will also delete ${relatedRuns} run(s).`
    );
    if (!confirmed) {
      return;
    }

    runners = runners.filter((item) => item.id !== runnerId);
    runs = runs.filter((run) => run.runnerId !== runnerId);
    saveRunners();
    saveRuns();

    if (runnerEditIdInput.value === runnerId) {
      resetRunnerForm();
    }

    if (runRunnerSelect.value === runnerId) {
      resetRunForm();
    }

    renderAll();
    showToast("Runner deleted.");
  }
});

runTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const runId = button.dataset.id;
  const action = button.dataset.action;
  const run = runs.find((item) => item.id === runId);

  if (!run) {
    return;
  }

  if (action === "edit") {
    startRunEdit(run);
    showToast("Editing run entry.");
    return;
  }

  if (action === "delete") {
    runs = runs.filter((item) => item.id !== runId);
    saveRuns();

    if (runEditIdInput.value === runId) {
      resetRunForm();
    }

    renderAll();
    showToast("Run deleted.");
  }
});

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
      content.className = "runner-main";

      const title = document.createElement("h3");
      const meta = document.createElement("p");
      const actions = document.createElement("div");
      const editButton = document.createElement("button");
      const deleteButton = document.createElement("button");

      title.textContent = runner.name;
      meta.className = "runner-meta";
      meta.textContent = `Joined ${formatDate(runner.joinDate)}`;

      actions.className = "runner-actions";
      editButton.className = "button button--secondary button--small";
      editButton.type = "button";
      editButton.dataset.action = "edit";
      editButton.dataset.id = runner.id;
      editButton.textContent = "Edit";

      deleteButton.className = "button button--danger button--small";
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete";
      deleteButton.dataset.id = runner.id;
      deleteButton.textContent = "Delete";

      actions.append(editButton, deleteButton);
      content.append(title, meta);
      item.append(avatar, content, actions);
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

function createRunnerIdentity(runner, options = {}) {
  const compact = options.compact === true;
  const identity = document.createElement("div");
  identity.className = compact ? "runner-identity runner-identity--compact" : "runner-identity";

  const avatar = createAvatar(runner);
  if (compact) {
    avatar.classList.add("avatar--small");
  }

  const name = document.createElement("strong");
  name.textContent = runner.name;

  identity.append(avatar, name);
  return identity;
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
      createRunnerCell(runner),
      createCell(formatDate(run.date)),
      createCell(formatDuration(run.durationSeconds)),
      createCell(`${formatNumber(run.kilometres)} km`),
      createCell(`${formatPace(pace)} /km`),
      createRunActionsCell(run.id)
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
  teamTimeOutput.textContent = formatDuration(totalDurationSeconds);
  teamPaceOutput.textContent = totalKm > 0
    ? `${formatPace(totalDurationSeconds / totalKm)} /km`
    : "--:-- /km";

  const summaryByRunner = runners.map((runner) => {
    const runnerRuns = safeRuns.filter((run) => run.runnerId === runner.id);
    const runnerTime = runnerRuns.reduce((sum, run) => sum + run.durationSeconds, 0);
    const speedKmh = runnerTime > 0 ? (runnerRuns.reduce((sum, run) => sum + run.kilometres, 0) / (runnerTime / 3600)) : 0;

    return {
      id: runner.id,
      name: runner.name,
      photoData: runner.photoData,
      totalKm: runnerRuns.reduce((sum, run) => sum + run.kilometres, 0),
      runsCount: runnerRuns.length,
      speedKmh,
      contribution: totalKm > 0 ? (runnerRuns.reduce((sum, run) => sum + run.kilometres, 0) / totalKm) * 100 : 0
    };
  });

  summaryByRunner.sort((first, second) => second.totalKm - first.totalKm);
  renderRunnerBars(summaryByRunner);
  renderSpeedBars(summaryByRunner);
  renderContribution(summaryByRunner);
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

    const identity = createRunnerIdentity(item, { compact: true });

    const value = document.createElement("span");
    value.textContent = `${item.totalKm.toFixed(2)} km (${item.runsCount} runs)`;

    label.append(identity, value);

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

function renderSpeedBars(summaryByRunner) {
  speedBars.replaceChildren();
  const maxSpeed = Math.max(1, ...summaryByRunner.map((item) => item.speedKmh));

  const activeRunners = summaryByRunner.filter((item) => item.runsCount > 0);
  if (!activeRunners.length) {
    speedBars.append(createNote("No speed data yet. Add runs to compare speed."));
    return;
  }

  activeRunners
    .slice()
    .sort((first, second) => second.speedKmh - first.speedKmh)
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "bar-row";

      const label = document.createElement("div");
      label.className = "bar-label";

      const identity = createRunnerIdentity(item, { compact: true });

      const value = document.createElement("span");
      value.textContent = `${item.speedKmh.toFixed(2)} km/h`;

      label.append(identity, value);

      const track = document.createElement("div");
      track.className = "bar-track";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${(item.speedKmh / maxSpeed) * 100}%`;

      track.append(fill);
      row.append(label, track);
      speedBars.append(row);
    });
}

function renderContribution(summaryByRunner) {
  contributionBar.replaceChildren();
  contributionLegend.replaceChildren();

  const activeRunners = summaryByRunner.filter((item) => item.totalKm > 0);
  if (!activeRunners.length) {
    contributionLegend.append(createNote("No contribution split yet. Log runs first."));
    return;
  }

  activeRunners.forEach((item, index) => {
    const color = BAR_COLORS[index % BAR_COLORS.length];

    const segment = document.createElement("div");
    segment.className = "contribution-segment";
    segment.style.width = `${item.contribution}%`;
    segment.style.background = color;
    segment.title = `${item.name}: ${item.contribution.toFixed(1)}%`;
    contributionBar.append(segment);

    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";

    const identity = createRunnerIdentity(item, { compact: true });

    const text = document.createElement("span");
    text.textContent = `${item.totalKm.toFixed(2)} km (${item.contribution.toFixed(1)}%)`;

    legendItem.append(identity, text);
    contributionLegend.append(legendItem);
  });
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function createRunnerCell(runner) {
  const cell = document.createElement("td");
  if (!runner) {
    cell.textContent = "Unknown";
    return cell;
  }

  const identity = createRunnerIdentity(runner, { compact: true });
  identity.classList.add("runner-inline");
  cell.append(identity);
  return cell;
}

function createNote(text) {
  const note = document.createElement("p");
  note.className = "team-note";
  note.textContent = text;
  return note;
}

function createRunActionsCell(runId) {
  const cell = document.createElement("td");
  const wrap = document.createElement("div");
  const editButton = document.createElement("button");
  const deleteButton = document.createElement("button");

  wrap.className = "table-actions";

  editButton.className = "button button--secondary button--small";
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.dataset.id = runId;
  editButton.textContent = "Edit";

  deleteButton.className = "button button--danger button--small";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = runId;
  deleteButton.textContent = "Delete";

  wrap.append(editButton, deleteButton);
  cell.append(wrap);
  return cell;
}

function setDefaultDates() {
  const today = toDateInputValue(new Date());
  runnerJoinDateInput.value = today;
  runDateInput.value = today;
}

function renderAll() {
  renderRunnerList();
  renderRunnerSelect();
  renderRuns();
  renderDashboard();
}

function setupAccordion() {
  if (!accordionPanels.length) {
    return;
  }

  let hasOpenPanel = false;
  accordionPanels.forEach((panel, index) => {
    if (panel.open && !hasOpenPanel) {
      hasOpenPanel = true;
    } else {
      panel.open = false;
    }

    if (!hasOpenPanel && index === 0) {
      panel.open = true;
      hasOpenPanel = true;
    }

    panel.addEventListener("toggle", () => {
      if (!panel.open) {
        return;
      }

      accordionPanels.forEach((otherPanel) => {
        if (otherPanel !== panel) {
          otherPanel.open = false;
        }
      });
    });
  });
}

function setupCrossTabSync() {
  window.addEventListener("storage", (event) => {
    if (event.key && event.key !== RUNNERS_KEY && event.key !== RUNS_KEY) {
      return;
    }

    runners = loadRunners();
    runs = loadRuns();

    if (runnerEditIdInput.value && !runners.some((runner) => runner.id === runnerEditIdInput.value)) {
      resetRunnerForm();
    }

    if (runEditIdInput.value && !runs.some((run) => run.id === runEditIdInput.value)) {
      resetRunForm();
    }

    renderAll();
  });
}

function startRunnerEdit(runner) {
  runnerEditIdInput.value = runner.id;
  runnerNameInput.value = runner.name;
  runnerJoinDateInput.value = runner.joinDate;
  runnerPhotoInput.value = "";
  runnerSubmitButton.textContent = "Update runner";
  runnerCancelButton.hidden = false;
}

function resetRunnerForm() {
  runnerForm.reset();
  runnerEditIdInput.value = "";
  runnerSubmitButton.textContent = "Add runner";
  runnerCancelButton.hidden = true;
  runnerJoinDateInput.value = toDateInputValue(new Date());
}

function startRunEdit(run) {
  const hours = Math.floor(run.durationSeconds / 3600);
  const minutes = Math.floor((run.durationSeconds % 3600) / 60);
  const seconds = run.durationSeconds % 60;

  runEditIdInput.value = run.id;
  runRunnerSelect.value = run.runnerId;
  runDateInput.value = run.date;
  runHoursInput.value = String(hours);
  runMinutesInput.value = String(minutes);
  runSecondsInput.value = String(seconds);
  runKilometresInput.value = String(run.kilometres);
  runSubmitButton.textContent = "Update run";
  runCancelButton.hidden = false;
}

function resetRunForm() {
  runForm.reset();
  runEditIdInput.value = "";
  runSubmitButton.textContent = "Log run";
  runCancelButton.hidden = true;
  runHoursInput.value = "0";
  runMinutesInput.value = "0";
  runSecondsInput.value = "0";
  runDateInput.value = toDateInputValue(new Date());
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
