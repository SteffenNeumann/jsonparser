// JSON File Visualizer - JavaScript Funktionalität mit Spalten-Management
class JSONVisualizer {
	constructor() {
		this.originalData = [];
		this.filteredData = [];
		this.currentSort = { column: null, direction: "asc" };
		this.visibleColumns = [];
		this.columnOrder = [];
		this.columnTypes = {};
		this.init();
	}

	init() {
		this.setupEventListeners();
		this.setupDragAndDrop();
	}

	setupEventListeners() {
		// File Input Event
		document.getElementById("fileInput").addEventListener("change", (e) => {
			this.handleFileSelect(e.target.files[0]);
		});

		// Search Input Event
		document.getElementById("searchInput").addEventListener("input", (e) => {
			this.filterData(e.target.value);
		});

		// Column Filter Events
		document.getElementById("columnFilter").addEventListener("change", (e) => {
			this.applyColumnFilter();
		});

		// Filter Operator Change
		document
			.getElementById("filterOperator")
			.addEventListener("change", (e) => {
				this.toggleSecondInput(e.target.value);
				this.applyColumnFilter();
			});

		document
			.getElementById("columnSearchInput")
			.addEventListener("input", (e) => {
				this.applyColumnFilter();
			});

		document
			.getElementById("columnSearchInput2")
			.addEventListener("input", (e) => {
				this.applyColumnFilter();
			});

		// Export Button
		document.getElementById("exportBtn").addEventListener("click", () => {
			this.exportToCSV();
		});

		// Clear Filters Button
		document.getElementById("clearFiltersBtn").addEventListener("click", () => {
			this.clearFilters();
		});

		// Clear Button
		document.getElementById("clearBtn").addEventListener("click", () => {
			this.clearData();
		});

		// Column Manager Button
		document
			.getElementById("columnManagerBtn")
			.addEventListener("click", () => {
				this.toggleColumnManager();
			});

		// Column Manager Controls
		document
			.getElementById("selectAllColumns")
			.addEventListener("click", () => {
				this.selectAllColumns();
			});

		document
			.getElementById("deselectAllColumns")
			.addEventListener("click", () => {
				this.deselectAllColumns();
			});

		document
			.getElementById("resetColumnOrder")
			.addEventListener("click", () => {
				this.resetColumnOrder();
			});

		document
			.getElementById("closeColumnManager")
			.addEventListener("click", () => {
				this.toggleColumnManager();
			});

		// Upload Area Click
		document.getElementById("uploadArea").addEventListener("click", () => {
			document.getElementById("fileInput").click();
		});
	}

	setupDragAndDrop() {
		const uploadArea = document.getElementById("uploadArea");

		["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
			uploadArea.addEventListener(eventName, this.preventDefaults, false);
		});

		["dragenter", "dragover"].forEach((eventName) => {
			uploadArea.addEventListener(
				eventName,
				() => {
					uploadArea.classList.add("dragover");
				},
				false
			);
		});

		["dragleave", "drop"].forEach((eventName) => {
			uploadArea.addEventListener(
				eventName,
				() => {
					uploadArea.classList.remove("dragover");
				},
				false
			);
		});

		uploadArea.addEventListener(
			"drop",
			(e) => {
				const files = e.dataTransfer.files;
				if (files.length > 0) {
					this.handleFileSelect(files[0]);
				}
			},
			false
		);
	}

	preventDefaults(e) {
		e.preventDefault();
		e.stopPropagation();
	}

	handleFileSelect(file) {
		if (!file) return;

		if (!file.name.toLowerCase().endsWith(".json")) {
			this.showError("Bitte wählen Sie eine gültige JSON-Datei aus.");
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const jsonData = JSON.parse(e.target.result);
				this.processJSONData(jsonData, file.name);
			} catch (error) {
				this.showError("Fehler beim Parsen der JSON-Datei: " + error.message);
			}
		};
		reader.readAsText(file);
	}

	processJSONData(data, fileName) {
		// Verstecke Error Section
		document.getElementById("errorSection").style.display = "none";

		// Konvertiere verschiedene JSON-Strukturen zu Array von Objekten
		let processedData = [];

		if (Array.isArray(data)) {
			processedData = data;
		} else if (typeof data === "object" && data !== null) {
			// Wenn es ein Objekt ist, schaue nach Array-Properties
			const arrayKeys = Object.keys(data).filter((key) =>
				Array.isArray(data[key])
			);

			if (arrayKeys.length > 0) {
				// Nimm das erste Array, das gefunden wird
				processedData = data[arrayKeys[0]];
			} else {
				// Wenn kein Array gefunden wird, konvertiere das Objekt selbst
				processedData = [data];
			}
		} else {
			this.showError(
				"Die JSON-Struktur wird nicht unterstützt. Erwartet wird ein Array oder ein Objekt mit Arrays."
			);
			return;
		}

		// Filtere nur Objekte
		processedData = processedData.filter(
			(item) => typeof item === "object" && item !== null
		);

		if (processedData.length === 0) {
			this.showError("Keine gültigen Datensätze in der JSON-Datei gefunden.");
			return;
		}

		// Flatte verschachtelte Objekte
		processedData = processedData.map((item) => this.flattenObject(item));

		this.originalData = processedData;
		this.filteredData = [...processedData];

		this.createTable(fileName);
		this.showTableSection();
	}

	flattenObject(obj, prefix = "") {
		const flattened = {};

		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				const value = obj[key];
				const newKey = prefix ? `${prefix}.${key}` : key;

				if (
					value !== null &&
					typeof value === "object" &&
					!Array.isArray(value)
				) {
					// Rekursiv für verschachtelte Objekte
					Object.assign(flattened, this.flattenObject(value, newKey));
				} else if (Array.isArray(value)) {
					// Arrays als Strings darstellen
					flattened[newKey] = JSON.stringify(value);
				} else {
					flattened[newKey] = value;
				}
			}
		}

		return flattened;
	}

	createTable(fileName) {
		// Hole alle einzigartigen Spalten
		const columns = [...new Set(this.originalData.flatMap(Object.keys))];

		// Initialisiere Spalten-Management
		this.initializeColumns(columns);

		// Erstelle Header
		this.createTableHeader();

		// Erstelle Spalten-Filter Dropdown
		this.populateColumnFilter(this.columnOrder);

		// Erstelle Tabellen-Body
		this.renderTableBody();

		// Update Dashboard und Info
		this.updateDashboard(columns);
		this.updateTableInfo(fileName);
	}

	initializeColumns(columns) {
		// Initialisiere visibleColumns und columnOrder beim ersten Laden
		if (this.visibleColumns.length === 0) {
			this.visibleColumns = [...columns];
			this.columnOrder = [...columns];
		}

		// Analysiere Datentypen
		this.columnTypes = this.analyzeDataTypes(columns);

		// Erstelle Spalten-Manager UI
		this.createColumnManager();
	}

	createTableHeader() {
		const tableHead = document.getElementById("tableHead");
		tableHead.innerHTML = "";
		const headerRow = document.createElement("tr");

		this.columnOrder.forEach((column) => {
			if (!this.visibleColumns.includes(column)) return;

			const th = document.createElement("th");
			th.textContent = column;
			th.setAttribute("data-column", column);
			th.style.cursor = "pointer";
			th.addEventListener("click", () => this.sortTable(column));

			// Sort Icon
			const icon = document.createElement("i");
			icon.className = "fas fa-sort";
			th.appendChild(icon);

			headerRow.appendChild(th);
		});

		tableHead.appendChild(headerRow);
	}

	createColumnManager() {
		const columnList = document.getElementById("columnList");
		columnList.innerHTML = "";

		this.columnOrder.forEach((column, index) => {
			const columnItem = this.createColumnItem(column, index);
			columnList.appendChild(columnItem);
		});

		// Setup drag and drop
		this.setupColumnDragAndDrop();
	}

	createColumnItem(column, index) {
		const columnItem = document.createElement("div");
		columnItem.className = "column-item";
		columnItem.draggable = true;
		columnItem.setAttribute("data-column", column);
		columnItem.setAttribute("data-index", index);

		const isVisible = this.visibleColumns.includes(column);
		if (!isVisible) {
			columnItem.classList.add("hidden");
		}

		// Header mit Checkbox und Name
		const header = document.createElement("div");
		header.className = "column-item-header";

		const checkboxContainer = document.createElement("div");
		checkboxContainer.className = "column-checkbox";

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.checked = isVisible;
		checkbox.addEventListener("change", (e) => {
			this.toggleColumnVisibility(column, e.target.checked);
		});

		const columnName = document.createElement("span");
		columnName.className = "column-name";
		columnName.textContent = column;

		checkboxContainer.appendChild(checkbox);
		checkboxContainer.appendChild(columnName);

		const dragHandle = document.createElement("div");
		dragHandle.className = "drag-handle";
		dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';

		header.appendChild(checkboxContainer);
		header.appendChild(dragHandle);

		// Column Info
		const columnInfo = document.createElement("div");
		columnInfo.className = "column-info";

		const dataType = this.columnTypes[column] || "string";
		const typeIndicator = document.createElement("span");
		typeIndicator.className = `data-type-indicator data-type-${dataType}`;
		typeIndicator.innerHTML = `<i class="fas fa-tag"></i> ${dataType}`;

		const valueCount = this.getColumnValueCount(column);
		const valueInfo = document.createElement("span");
		valueInfo.className = "column-stat";
		valueInfo.innerHTML = `<i class="fas fa-list-ol"></i> ${valueCount} Werte`;

		const nullCount = this.getColumnNullCount(column);
		const nullInfo = document.createElement("span");
		nullInfo.className = "column-stat";
		nullInfo.innerHTML = `<i class="fas fa-minus-circle"></i> ${nullCount} Leer`;

		columnInfo.appendChild(typeIndicator);
		columnInfo.appendChild(valueInfo);
		columnInfo.appendChild(nullInfo);

		columnItem.appendChild(header);
		columnItem.appendChild(columnInfo);

		return columnItem;
	}

	setupColumnDragAndDrop() {
		const columnList = document.getElementById("columnList");
		let draggedElement = null;

		columnList.addEventListener("dragstart", (e) => {
			draggedElement = e.target.closest(".column-item");
			if (draggedElement) {
				draggedElement.classList.add("dragging");
				e.dataTransfer.effectAllowed = "move";
			}
		});

		columnList.addEventListener("dragend", (e) => {
			if (draggedElement) {
				draggedElement.classList.remove("dragging");
				draggedElement = null;
			}
		});

		columnList.addEventListener("dragover", (e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = "move";

			const afterElement = this.getDragAfterElement(columnList, e.clientY);
			if (afterElement == null) {
				columnList.appendChild(draggedElement);
			} else {
				columnList.insertBefore(draggedElement, afterElement);
			}
		});

		columnList.addEventListener("drop", (e) => {
			e.preventDefault();
			this.updateColumnOrder();
		});
	}

	getDragAfterElement(container, y) {
		const draggableElements = [
			...container.querySelectorAll(".column-item:not(.dragging)"),
		];

		return draggableElements.reduce(
			(closest, child) => {
				const box = child.getBoundingClientRect();
				const offset = y - box.top - box.height / 2;

				if (offset < 0 && offset > closest.offset) {
					return { offset: offset, element: child };
				} else {
					return closest;
				}
			},
			{ offset: Number.NEGATIVE_INFINITY }
		).element;
	}

	updateColumnOrder() {
		const columnItems = document.querySelectorAll(".column-item");
		const newOrder = Array.from(columnItems).map((item) =>
			item.getAttribute("data-column")
		);

		this.columnOrder = newOrder;
		this.refreshTable();
	}

	toggleColumnVisibility(column, isVisible) {
		if (isVisible) {
			if (!this.visibleColumns.includes(column)) {
				this.visibleColumns.push(column);
			}
		} else {
			this.visibleColumns = this.visibleColumns.filter((col) => col !== column);
		}

		// Update UI
		const columnItem = document.querySelector(`[data-column="${column}"]`);
		if (columnItem && columnItem.classList.contains("column-item")) {
			if (isVisible) {
				columnItem.classList.remove("hidden");
			} else {
				columnItem.classList.add("hidden");
			}
		}

		this.refreshTable();
	}

	selectAllColumns() {
		this.visibleColumns = [...this.columnOrder];
		document
			.querySelectorAll(".column-item input[type='checkbox']")
			.forEach((checkbox) => {
				checkbox.checked = true;
			});
		document.querySelectorAll(".column-item").forEach((item) => {
			item.classList.remove("hidden");
		});
		this.refreshTable();
	}

	deselectAllColumns() {
		this.visibleColumns = [];
		document
			.querySelectorAll(".column-item input[type='checkbox']")
			.forEach((checkbox) => {
				checkbox.checked = false;
			});
		document.querySelectorAll(".column-item").forEach((item) => {
			item.classList.add("hidden");
		});
		this.refreshTable();
	}

	resetColumnOrder() {
		const originalColumns = [
			...new Set(this.originalData.flatMap(Object.keys)),
		];
		this.columnOrder = [...originalColumns];
		this.visibleColumns = [...originalColumns];
		this.createColumnManager();
		this.refreshTable();
	}

	refreshTable() {
		this.createTableHeader();
		this.renderTableBody();
		this.populateColumnFilter(this.visibleColumns);
	}

	toggleColumnManager() {
		const columnManagerSection = document.getElementById(
			"columnManagerSection"
		);
		const isVisible = columnManagerSection.style.display !== "none";

		if (isVisible) {
			columnManagerSection.style.display = "none";
		} else {
			columnManagerSection.style.display = "block";
			// Smooth scroll to column manager
			columnManagerSection.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}

	getColumnValueCount(column) {
		return this.originalData.filter(
			(row) =>
				row[column] !== null && row[column] !== undefined && row[column] !== ""
		).length;
	}

	getColumnNullCount(column) {
		return this.originalData.filter(
			(row) =>
				row[column] === null || row[column] === undefined || row[column] === ""
		).length;
	}

	renderTableBody() {
		const tableBody = document.getElementById("tableBody");
		tableBody.innerHTML = "";

		this.filteredData.forEach((row) => {
			const tr = document.createElement("tr");

			this.columnOrder.forEach((column) => {
				if (!this.visibleColumns.includes(column)) return;

				const td = document.createElement("td");
				const value = row[column];

				if (value !== undefined && value !== null && value !== "") {
					const dataType = this.detectDataType(value);
					const formattedValue = this.formatValue(value, dataType);

					td.innerHTML = formattedValue;
					td.className = `data-${dataType}`;

					// Spezielle Klassen für Boolean-Werte
					if (dataType === "boolean") {
						td.classList.add(value.toString().toLowerCase());
					}
				} else {
					td.textContent = "—";
					td.className = "data-null";
				}

				tr.appendChild(td);
			});

			tableBody.appendChild(tr);
		});
	}

	populateColumnFilter(columns) {
		const columnFilter = document.getElementById("columnFilter");
		columnFilter.innerHTML = '<option value="">Alle Spalten</option>';

		columns.forEach((column) => {
			const option = document.createElement("option");
			option.value = column;
			option.textContent = column;
			columnFilter.appendChild(option);
		});
	}

	filterData(searchTerm) {
		if (!searchTerm.trim()) {
			this.filteredData = [...this.originalData];
		} else {
			const term = searchTerm.toLowerCase();
			this.filteredData = this.originalData.filter((row) => {
				return Object.values(row).some((value) => {
					if (value === null || value === undefined) return false;
					return String(value).toLowerCase().includes(term);
				});
			});
		}

		this.applyColumnFilter();
	}

	applyColumnFilter() {
		const selectedColumn = document.getElementById("columnFilter").value;
		const filterOperator = document.getElementById("filterOperator").value;
		const filterValue1 = document.getElementById("columnSearchInput").value;
		const filterValue2 = document.getElementById("columnSearchInput2").value;

		let data = [...this.filteredData];

		if (selectedColumn && filterValue1.trim()) {
			data = data.filter((row) => {
				const cellValue = row[selectedColumn];
				return this.applyFilterOperator(
					cellValue,
					filterOperator,
					filterValue1,
					filterValue2
				);
			});
		} else if (
			selectedColumn &&
			(filterOperator === "empty" || filterOperator === "not_empty")
		) {
			data = data.filter((row) => {
				const cellValue = row[selectedColumn];
				return this.applyFilterOperator(cellValue, filterOperator, "", "");
			});
		}

		// Re-render table mit gefilterten Daten
		this.renderFilteredTable(data);
		this.updateRecordCount(data.length);
	}

	applyFilterOperator(cellValue, operator, value1, value2) {
		// Konvertiere Werte zu Strings für Vergleiche
		const cellStr =
			cellValue !== null && cellValue !== undefined
				? String(cellValue).toLowerCase()
				: "";
		const val1 = value1.toLowerCase();
		const val2 = value2.toLowerCase();

		switch (operator) {
			case "contains":
				return cellStr.includes(val1);

			case "equals":
				return cellStr === val1;

			case "starts":
				return cellStr.startsWith(val1);

			case "ends":
				return cellStr.endsWith(val1);

			case "greater":
				const num1 = parseFloat(cellValue);
				const comp1 = parseFloat(value1);
				return !isNaN(num1) && !isNaN(comp1) && num1 > comp1;

			case "less":
				const num2 = parseFloat(cellValue);
				const comp2 = parseFloat(value1);
				return !isNaN(num2) && !isNaN(comp2) && num2 < comp2;

			case "between":
				if (!value2.trim()) return false;
				const num3 = parseFloat(cellValue);
				const min = parseFloat(value1);
				const max = parseFloat(value2);
				return (
					!isNaN(num3) &&
					!isNaN(min) &&
					!isNaN(max) &&
					num3 >= min &&
					num3 <= max
				);

			case "empty":
				return (
					cellValue === null || cellValue === undefined || cellValue === ""
				);

			case "not_empty":
				return (
					cellValue !== null && cellValue !== undefined && cellValue !== ""
				);

			default:
				return cellStr.includes(val1);
		}
	}

	renderFilteredTable(data) {
		const tableBody = document.getElementById("tableBody");
		tableBody.innerHTML = "";

		data.forEach((row) => {
			const tr = document.createElement("tr");

			this.columnOrder.forEach((column) => {
				if (!this.visibleColumns.includes(column)) return;

				const td = document.createElement("td");
				const value = row[column];

				if (value !== undefined && value !== null && value !== "") {
					const dataType = this.detectDataType(value);
					const formattedValue = this.formatValue(value, dataType);

					td.innerHTML = formattedValue;
					td.className = `data-${dataType}`;

					// Spezielle Klassen für Boolean-Werte
					if (dataType === "boolean") {
						td.classList.add(value.toString().toLowerCase());
					}
				} else {
					td.textContent = "—";
					td.className = "data-null";
				}

				tr.appendChild(td);
			});

			tableBody.appendChild(tr);
		});
	}

	toggleSecondInput(operator) {
		const secondInput = document.getElementById("columnSearchInput2");
		const firstInput = document.getElementById("columnSearchInput");

		if (operator === "between") {
			secondInput.style.display = "block";
			firstInput.placeholder = "Von-Wert...";
			secondInput.placeholder = "Bis-Wert...";
		} else {
			secondInput.style.display = "none";
			// Reset placeholder based on operator
			switch (operator) {
				case "greater":
					firstInput.placeholder = "Mindestwert...";
					break;
				case "less":
					firstInput.placeholder = "Höchstwert...";
					break;
				case "empty":
				case "not_empty":
					firstInput.placeholder = "Keine Eingabe erforderlich";
					break;
				default:
					firstInput.placeholder = "Filterwert...";
			}
		}
	}

	clearFilters() {
		document.getElementById("columnFilter").value = "";
		document.getElementById("filterOperator").value = "contains";
		document.getElementById("columnSearchInput").value = "";
		document.getElementById("columnSearchInput2").value = "";
		document.getElementById("columnSearchInput2").style.display = "none";
		document.getElementById("columnSearchInput").placeholder = "Filterwert...";

		// Reset to original filtered data (only global search applied)
		const searchTerm = document.getElementById("searchInput").value;
		this.filterData(searchTerm);
	}

	sortTable(column) {
		// Update sort direction
		if (this.currentSort.column === column) {
			this.currentSort.direction =
				this.currentSort.direction === "asc" ? "desc" : "asc";
		} else {
			this.currentSort.column = column;
			this.currentSort.direction = "asc";
		}

		// Update sort icons
		document.querySelectorAll("th i").forEach((icon) => {
			icon.className = "fas fa-sort";
		});

		const currentTh = document.querySelector(`th[data-column="${column}"] i`);
		if (currentTh) {
			currentTh.className =
				this.currentSort.direction === "asc"
					? "fas fa-sort-up"
					: "fas fa-sort-down";
		}

		// Sort data
		this.filteredData.sort((a, b) => {
			const aVal = a[column] || "";
			const bVal = b[column] || "";

			// Versuche numerische Sortierung
			const aNum = parseFloat(aVal);
			const bNum = parseFloat(bVal);

			if (!isNaN(aNum) && !isNaN(bNum)) {
				return this.currentSort.direction === "asc" ? aNum - bNum : bNum - aNum;
			}

			// String-Sortierung
			const aStr = String(aVal).toLowerCase();
			const bStr = String(bVal).toLowerCase();

			if (this.currentSort.direction === "asc") {
				return aStr.localeCompare(bStr);
			} else {
				return bStr.localeCompare(aStr);
			}
		});

		// Re-render table
		this.renderTableBody();
	}

	exportToCSV() {
		if (this.filteredData.length === 0) {
			alert("Keine Daten zum Exportieren verfügbar.");
			return;
		}

		// CSV Header nur für sichtbare Spalten
		let csvContent =
			this.visibleColumns.map((col) => `"${col}"`).join(",") + "\n";

		// CSV Rows nur für sichtbare Spalten
		this.filteredData.forEach((row) => {
			const values = this.visibleColumns.map((column) => {
				const value = row[column];
				if (value === null || value === undefined) return '""';
				return `"${String(value).replace(/"/g, '""')}"`;
			});
			csvContent += values.join(",") + "\n";
		});

		// Download
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", "exported_data.csv");
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	clearData() {
		this.originalData = [];
		this.filteredData = [];
		this.currentSort = { column: null, direction: "asc" };
		this.visibleColumns = [];
		this.columnOrder = [];
		this.columnTypes = {};

		// Upload-Bereich zurück zum normalen Zustand
		const uploadArea = document.getElementById("uploadArea");
		const uploadSection = document.querySelector(".upload-section");
		uploadArea.classList.remove("compact");
		uploadSection.classList.remove("compact");

		document.getElementById("fileInput").value = "";
		document.getElementById("searchInput").value = "";
		document.getElementById("columnSearchInput").value = "";
		document.getElementById("columnSearchInput2").value = "";
		document.getElementById("columnFilter").value = "";
		document.getElementById("filterOperator").value = "contains";
		document.getElementById("columnSearchInput2").style.display = "none";
		document.getElementById("columnSearchInput").placeholder = "Filterwert...";

		document.getElementById("dashboardSection").style.display = "none";
		document.getElementById("controlsSection").style.display = "none";
		document.getElementById("tableSection").style.display = "none";
		document.getElementById("columnManagerSection").style.display = "none";
		document.getElementById("errorSection").style.display = "none";
	}

	showTableSection() {
		// Upload-Bereich kompakt machen
		const uploadArea = document.getElementById("uploadArea");
		const uploadSection = document.querySelector(".upload-section");
		uploadArea.classList.add("compact");
		uploadSection.classList.add("compact");

		document.getElementById("dashboardSection").style.display = "block";
		document.getElementById("controlsSection").style.display = "block";
		document.getElementById("tableSection").style.display = "block";
		document.getElementById("errorSection").style.display = "none";

		// Smooth scroll to dashboard
		document.getElementById("dashboardSection").scrollIntoView({
			behavior: "smooth",
		});
	}

	showError(message) {
		document.getElementById("errorText").textContent = message;
		document.getElementById("errorSection").style.display = "block";
		document.getElementById("controlsSection").style.display = "none";
		document.getElementById("tableSection").style.display = "none";
		document.getElementById("columnManagerSection").style.display = "none";
	}

	updateTableInfo(fileName) {
		document.getElementById("fileName").textContent = `Datei: ${fileName}`;
		this.updateRecordCount(this.filteredData.length);
	}

	updateRecordCount(count) {
		const totalCount = this.originalData.length;
		document.getElementById(
			"recordCount"
		).textContent = `${count} von ${totalCount} Datensätzen angezeigt`;
	}

	updateDashboard(columns) {
		// Total Records
		document.getElementById("totalRecords").textContent =
			this.originalData.length.toLocaleString();

		// Total Columns
		document.getElementById("totalColumns").textContent = columns.length;

		// Data Types Analysis
		const dataTypes = this.analyzeDataTypes(columns);
		document.getElementById("dataTypes").textContent =
			Object.keys(dataTypes).length;

		// Null Values Count
		const nullCount = this.countNullValues();
		document.getElementById("nullValues").textContent =
			nullCount.toLocaleString();
	}

	analyzeDataTypes(columns) {
		const types = {};

		columns.forEach((column) => {
			const values = this.originalData
				.map((row) => row[column])
				.filter((val) => val !== null && val !== undefined);

			if (values.length === 0) {
				types[column] = "null";
				return;
			}

			// Check if all values are numbers
			const numberValues = values.filter(
				(val) => !isNaN(parseFloat(val)) && isFinite(val)
			);
			if (numberValues.length === values.length) {
				types[column] = "number";
				return;
			}

			// Check if all values are booleans
			const booleanValues = values.filter(
				(val) =>
					val === true || val === false || val === "true" || val === "false"
			);
			if (booleanValues.length === values.length) {
				types[column] = "boolean";
				return;
			}

			// Check if values look like dates
			const dateValues = values.filter((val) => {
				const date = new Date(val);
				return (
					!isNaN(date.getTime()) &&
					val.toString().match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/)
				);
			});
			if (dateValues.length > values.length * 0.8) {
				types[column] = "date";
				return;
			}

			// Default to string
			types[column] = "string";
		});

		return types;
	}

	countNullValues() {
		let nullCount = 0;
		this.originalData.forEach((row) => {
			Object.values(row).forEach((value) => {
				if (value === null || value === undefined || value === "") {
					nullCount++;
				}
			});
		});
		return nullCount;
	}

	detectDataType(value) {
		// Null/Undefined Check
		if (value === null || value === undefined || value === "") {
			return "null";
		}

		// Array Check (JSON Strings)
		if (
			typeof value === "string" &&
			value.startsWith("[") &&
			value.endsWith("]")
		) {
			return "array";
		}

		// Boolean Check
		if (typeof value === "boolean" || value === "true" || value === "false") {
			return "boolean";
		}

		// Number Check
		const numValue = parseFloat(value);
		if (
			!isNaN(numValue) &&
			isFinite(numValue) &&
			value.toString().trim() !== ""
		) {
			return "number";
		}

		// Date Check
		if (typeof value === "string") {
			// Common date patterns
			const datePatterns = [
				/^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO format
				/^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
				/^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
			];

			if (datePatterns.some((pattern) => pattern.test(value))) {
				const date = new Date(value);
				if (!isNaN(date.getTime())) {
					return "date";
				}
			}
		}

		// Default to string
		return "string";
	}

	formatValue(value, dataType) {
		switch (dataType) {
			case "number":
				const num = parseFloat(value);
				// Format numbers with appropriate decimal places
				if (num % 1 === 0) {
					return num.toLocaleString(); // Integer formatting
				} else {
					return num.toLocaleString(undefined, { maximumFractionDigits: 3 });
				}

			case "boolean":
				const boolValue = value === true || value === "true";
				return boolValue ? "✓ True" : "✗ False";

			case "date":
				const date = new Date(value);
				return date.toLocaleDateString("de-DE", {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				});

			case "array":
				// Truncate long arrays for display
				if (value.length > 50) {
					return value.substring(0, 47) + "...";
				}
				return value;

			case "null":
				return "—";

			default: // string
				// Truncate very long strings
				if (typeof value === "string" && value.length > 100) {
					return value.substring(0, 97) + "...";
				}
				return value;
		}
	}
}

// App initialisieren wenn DOM geladen ist
document.addEventListener("DOMContentLoaded", () => {
	new JSONVisualizer();
});
