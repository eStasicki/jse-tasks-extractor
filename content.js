let isDebugging = false;

// Funkcja do włączania/wyłączania trybu debugowania
function toggleDebugMode(enable) {
  isDebugging = enable;

  if (enable) {
    document.body.style.cursor = "crosshair";
    document.addEventListener("click", debugClick, true);
    console.log(
      "Tryb debugowania włączony. Kliknij na elementy, aby zobaczyć ich zawartość."
    );
  } else {
    document.body.style.cursor = "default";
    document.removeEventListener("click", debugClick, true);
    console.log("Tryb debugowania wyłączony.");
  }
}

// Funkcja obsługująca kliknięcia w trybie debugowania
function debugClick(e) {
  e.preventDefault();
  e.stopPropagation();

  const element = e.target;
  console.log("Kliknięty element:", element);
  console.log("HTML:", element.outerHTML);
  console.log("Klasy:", element.className);

  // Sprawdź rodzica wiersza
  const row = element.closest(".public_fixedDataTable_bodyRow");
  if (row) {
    console.log("Wiersz:", row);

    // Znajdź klucz zadania w tym wierszu
    const keyElement = row.querySelector("a");
    if (keyElement) {
      console.log("Klucz zadania:", keyElement.textContent);
    }

    // Znajdź wszystkie komórki z czasem
    const timeCells = row.querySelectorAll(
      ".public_fixedDataTableCell_cellContent"
    );
    console.log("Komórki z czasem:", timeCells);
    timeCells.forEach((cell, index) => {
      console.log(`Komórka ${index}:`, cell.textContent);
    });
  }

  return false;
}

function findTasks(selectedDate) {
  const tasks = document.querySelectorAll(
    ".fixedDataTableRowLayout_rowWrapper .public_fixedDataTable_bodyRow"
  );

  if (!tasks || tasks.length === 0) {
    return {
      success: false,
      message:
        "Nie znaleziono zadań. Upewnij się, że jesteś na stronie Tempo timesheet.",
    };
  }

  const tasksList = Array.from(tasks)
    .map((task) => {
      try {
        const keyElement = task.querySelector(".tempo-reports-key");
        const issueKey = keyElement?.textContent?.trim();

        if (!issueKey) {
          return null;
        }

        let targetCell;

        if (selectedDate === "today") {
          targetCell = task.querySelector(
            ".cell-today .public_fixedDataTableCell_cellContent"
          );
        } else {
          const daysAgo = selectedDate === "-1" ? -1 : parseInt(selectedDate);
          const today = new Date();
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + daysAgo);

          const year = targetDate.getFullYear();
          const month = String(targetDate.getMonth() + 1).padStart(2, "0");
          const day = String(targetDate.getDate()).padStart(2, "0");
          const dateString = `${year}-${month}-${day}`;

          const cells = task.querySelectorAll('[data-testid="grid-cell"]');
          for (const cell of cells) {
            const name = cell.getAttribute("name");
            if (name && name.includes(dateString)) {
              const content = cell.querySelector(
                ".public_fixedDataTableCell_cellContent"
              );
              const timeValue = content?.textContent?.trim();
              if (timeValue && timeValue !== "0" && timeValue !== "0h") {
                targetCell = content;
                break;
              }
            }
          }
        }

        if (!targetCell) {
          return null;
        }

        const time = targetCell.textContent?.trim();

        if (!time || time === "0" || time === "0h") {
          return null;
        }

        return {
          id: issueKey,
          time: time,
        };
      } catch (error) {
        return null;
      }
    })
    .filter((task) => task !== null);

  return {
    success: true,
    data: tasksList,
  };
}

function createModal() {
  // Usuń istniejący modal jeśli istnieje
  const existingModal = document.getElementById("task-extractor-modal");
  if (existingModal) {
    existingModal.remove();
  }

  // Stwórz elementy modalu
  const modalOverlay = document.createElement("div");
  modalOverlay.id = "task-extractor-modal";
  modalOverlay.className =
    "fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50";

  const modalContent = document.createElement("div");
  modalContent.className =
    "relative w-[400px] bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl shadow-xl";

  // Dodaj przycisk zamykania
  const closeButton = document.createElement("button");
  closeButton.className =
    "absolute top-4 right-4 text-indigo-400 hover:text-indigo-600 transition-colors";
  closeButton.innerHTML = "✕";
  closeButton.onclick = () => modalOverlay.remove();

  modalContent.appendChild(closeButton);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  return modalContent;
}

function renderTasksInModal(tasks) {
  const modalContent = createModal();
  let tasksHTML = tasks
    .map(
      (task) => `
        <div class="flex items-center justify-between py-3 px-2 border-b border-indigo-100 hover:bg-white rounded-lg transition-colors ${
          task.excluded ? "opacity-50 bg-gray-50" : ""
        }">
          <div class="flex-1 flex justify-between items-center mr-3">
            <span class="font-semibold text-indigo-900">${task.id}</span>
            <span class="text-indigo-600 font-medium">${task.time}h</span>
          </div>
          <button 
            class="w-7 h-7 flex items-center justify-center border border-indigo-200 rounded-lg
            hover:bg-indigo-50 hover:border-indigo-300 transition-colors
            ${
              task.excluded
                ? "bg-indigo-100 text-indigo-600"
                : "bg-white text-indigo-400"
            }"
            data-id="${task.id}"
            onclick="this.closest('.flex').classList.toggle('opacity-50')"
          >
            ×
          </button>
        </div>
      `
    )
    .join("");

  const totalHours = tasks
    .reduce((sum, task) => {
      const hours = parseFloat(task.time) || 0;
      return sum + hours;
    }, 0)
    .toFixed(2);

  const taskIds = tasks.map((task) => task.id).join(", ");

  modalContent.innerHTML = `
    <div class="mb-6 bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
      ${tasksHTML}
      <div class="flex justify-between items-center mt-4 pt-4 border-t-2 border-indigo-100">
        <span class="text-indigo-900 font-semibold">Suma godzin:</span>
        <span class="text-indigo-600 font-bold text-lg">${totalHours}h</span>
      </div>
    </div>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
      <div class="text-indigo-900 font-semibold mb-2">Lista ID zadań:<br /><br /></div>
      <div class="font-mono text-indigo-600 break-words leading-relaxed">
        ${taskIds}
      </div>
    </div>
  `;

  // Dodaj przycisk zamykania na końcu
  const closeButton = document.createElement("button");
  closeButton.className =
    "absolute top-4 right-4 text-indigo-400 hover:text-indigo-600 transition-colors";
  closeButton.innerHTML = "✕";
  closeButton.onclick = () => modalContent.parentElement.remove();
  modalContent.appendChild(closeButton);
}

// Zmodyfikuj obsługę wiadomości
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTasks") {
    let attempts = 0;
    const maxAttempts = 3;

    function tryGetTasks() {
      const result = findTasks(request.date);
      if (result.data.length > 0 || attempts >= maxAttempts) {
        sendResponse(result);
      } else {
        attempts++;
        setTimeout(tryGetTasks, 1000);
      }
    }

    setTimeout(tryGetTasks, 1000);
    return true;
  } else if (request.action === "toggleDebug") {
    toggleDebugMode(request.enable);
    sendResponse({ success: true });
    return true;
  }
});
