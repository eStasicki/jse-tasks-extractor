// popup.js
// Funkcja do automatycznego przeładowania w trybie developerskim
function reloadOnChange() {
  if (chrome.runtime.getManifest().version === "1.0") {
    // Sprawdzamy czy to wersja developerska
    const timestamp = new Date().getTime();
    const scripts = document.getElementsByTagName("script");
    for (let script of scripts) {
      if (script.src && !script.src.includes("?")) {
        script.src = script.src + "?t=" + timestamp;
      }
    }
  }
}

// Uruchamiamy przeładowanie co 2 sekundy w trybie developerskim
setInterval(reloadOnChange, 2000);

// @charset UTF-8

document.addEventListener("DOMContentLoaded", function () {
  const resultDiv = document.getElementById("result");
  const dateSelector = document.getElementById("dateSelector");
  let tasks = [];

  function updateView() {
    const tasksHTML = `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID zadania</th>
              <th style="text-align: right">Czas</th>
              <th style="width: 30px"></th>
            </tr>
          </thead>
          <tbody>
            ${tasks
              .map(
                (task) => `
                  <tr class="${task.excluded ? "excluded" : ""}">
                    <td class="task-id">${task.id}</td>
                    <td class="task-time">${task.time}h</td>
                    <td style="text-align: center">
                      <button class="exclude-button" data-id="${task.id}">
                        ${task.excluded ? "✓" : "×"}
                      </button>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr>
              <td>Suma</td>
              <td colspan="2" style="text-align: right">
                ${tasks
                  .filter((task) => !task.excluded)
                  .reduce((sum, task) => {
                    const hours = parseFloat(task.time) || 0;
                    return sum + hours;
                  }, 0)
                  .toFixed(2)}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="task-ids">
        <div class="task-ids-title">Lista ID zadań:</div>
        <div class="task-ids-list">
          ${tasks
            .filter((task) => !task.excluded)
            .map((task) => task.id)
            .join(", ")}
        </div>
      </div>
    `;

    resultDiv.innerHTML = tasksHTML;

    document.querySelectorAll(".exclude-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const taskId = e.target.dataset.id;
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          task.excluded = !task.excluded;
          updateView();
        }
      });
    });
  }

  function loadTasks(selectedDate) {
    resultDiv.innerHTML = "Ładowanie zadań...";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: "getTasks",
          date: selectedDate,
        },
        function (response) {
          if (!response || !response.success) {
            resultDiv.innerHTML =
              response?.message || "Wystąpił błąd podczas pobierania zadań.";
            return;
          }

          if (response.data.length === 0) {
            resultDiv.innerHTML = "Nie znaleziono zadań dla wybranego dnia.";
            return;
          }

          tasks = response.data.map((task) => ({
            ...task,
            excluded: false,
          }));

          updateView();
        }
      );
    });
  }

  dateSelector.addEventListener("change", (e) => {
    loadTasks(e.target.value);
  });

  loadTasks(dateSelector.value);
});
