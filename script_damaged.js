// JSON File Visualizer - JavaScript Funktionalität mit Spalten-Management
class JSONVisualizer {
	constructor() {
		this.originalData = [];
		this.filteredData = [];
		this.currentSort = { column: null, direction: "asc" };
		this.visibleColumns = [];
		this.columnOrder = [];
		this.columnTypes = {};
		this.rawJsonData = null; // Speichere die ursprüngliche JSON-Struktur
		this.diagramMode = "fishbone"; // "fishbone" oder "tree"
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

		// Structure Diagram Button
		document
			.getElementById("structureDiagramBtn")
			.addEventListener("click", () => {
				this.toggleStructureDiagram();
			});

		document
			.getElementById("closeDiagram")
			.addEventListener("click", () => {
				this.toggleStructureDiagram();
			});

		document
			.getElementById("toggleDiagramMode")
			.addEventListener("click", () => {
				this.toggleDiagramMode();
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

		// Speichere die ursprüngliche JSON-Struktur für das Diagramm
		this.rawJsonData = data;

		// Konvertiere verschiedene JSON-Strukturen zu Array von Objekten
		let processedData = [];

		// Neue erweiterte Funktion: Alle Ebenen des JSON durchlaufen
		processedData = this.extractAllLevels(data, "");

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

	// Neue Funktion: Extrahiert alle Ebenen des JSON rekursiv
	extractAllLevels(data, parentPath = "", level = 0) {
		const result = [];
		const maxLevel = 10; // Verhindere unendliche Schleifen

		if (level > maxLevel) {
			console.warn(`Maximale Verschachtelungstiefe erreicht bei: ${parentPath}`);
			return result;
		}

		if (Array.isArray(data)) {
			// Wenn es ein Array ist, durchlaufe alle Elemente
			data.forEach((item, index) => {
				const currentPath = parentPath ? `${parentPath}[${index}]` : `[${index}]`;
				
				if (typeof item === "object" && item !== null) {
					// Füge Metadaten hinzu
					const enrichedItem = {
						...item,
						_path: currentPath,
						_level: level,
						_type: "array-item",
						_parent: parentPath || "root"
					};
					result.push(enrichedItem);
					
					// Rekursiv in verschachtelte Strukturen
					const nestedResults = this.extractAllLevels(item, currentPath, level + 1);
					result.push(...nestedResults);
				} else {
					// Primitive Werte als einzelne Einträge
					result.push({
						_path: currentPath,
						_level: level,
						_type: "primitive",
						_parent: parentPath || "root",
						value: item,
						dataType: typeof item
					});
				}
			});
		} else if (typeof data === "object" && data !== null) {
			// Wenn es ein Objekt ist, durchlaufe alle Eigenschaften
			const objectEntry = {
				_path: parentPath || "root",
				_level: level,
				_type: "object",
				_parent: parentPath ? parentPath.split('.').slice(0, -1).join('.') : "",
				...data
			};
			result.push(objectEntry);

			// Durchlaufe alle Eigenschaften des Objekts
			for (const key in data) {
				if (data.hasOwnProperty(key)) {
					const value = data[key];
					const currentPath = parentPath ? `${parentPath}.${key}` : key;

					if (Array.isArray(value)) {
						// Array-Eigenschaft
						const nestedResults = this.extractAllLevels(value, currentPath, level + 1);
						result.push(...nestedResults);
					} else if (typeof value === "object" && value !== null) {
						// Verschachteltes Objekt
						const nestedResults = this.extractAllLevels(value, currentPath, level + 1);
						result.push(...nestedResults);
					} else {
						// Primitive Eigenschaft - füge sie als separaten Eintrag hinzu
						result.push({
							_path: currentPath,
							_level: level + 1,
							_type: "property",
							_parent: parentPath || "root",
							_propertyName: key,
							value: value,
							dataType: typeof value
						});
					}
				}
			}
		} else {
			// Primitive Werte auf der obersten Ebene
			result.push({
				_path: parentPath || "root",
				_level: level,
				_type: "primitive",
				_parent: "",
				value: data,
				dataType: typeof data
			});
		}

		return result;
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
		this.rawJsonData = null; // Reset JSON data

		// Upload-Bereich zurück zum normalen Zustand
		const uploadArea = document.getElementById("uploadArea");
		const uploadSection = document.querySelector(".upload-section");
		const header = document.querySelector("header");

		uploadArea.classList.remove("compact");
		uploadSection.classList.remove("compact");
		header.classList.remove("compact");

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
		document.getElementById("structureDiagramSection").style.display = "none";
		document.getElementById("errorSection").style.display = "none";
	}

	showTableSection() {
		// Upload-Bereich kompakt machen
		const uploadArea = document.getElementById("uploadArea");
		const uploadSection = document.querySelector(".upload-section");
		const header = document.querySelector("header");

		uploadArea.classList.add("compact");
		uploadSection.classList.add("compact");
		header.classList.add("compact");

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

		// Number Check - erweitert um serielle Datumswerte
		const numValue = parseFloat(value);
		if (!isNaN(numValue) && isFinite(numValue)) {
			// Excel Serial Date Check (1900-basiert, typisch 1-50000)
			// Spaltennamen prüfen um Datumskontext zu erkennen
			if (numValue > 1 && numValue < 50000) {
				return "date";
			}

			// Fractional day values (0.xxx für Uhrzeiten)
			if (numValue > 0 && numValue < 1) {
				return "date";
			}

			// Unix Timestamp Check (10 oder 13 Stellen)
			const numStr = value.toString();
			if (/^\d{10}$/.test(numStr) || /^\d{13}$/.test(numStr)) {
				const timestamp = parseInt(numStr);
				const date = new Date(
					/^\d{10}$/.test(numStr) ? timestamp * 1000 : timestamp
				);
				if (
					!isNaN(date.getTime()) &&
					date.getFullYear() > 1970 &&
					date.getFullYear() < 2100
				) {
					return "date";
				}
			}

			// Normale Zahlen
			if (value.toString().trim() !== "") {
				return "number";
			}
		}

		// DateTime/Date Check (erweitert)
		if (typeof value === "string") {
			// Erweiterte Datums- und Zeit-Pattern
			const dateTimePatterns = [
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO DateTime (mit oder ohne Z/Timezone)
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO DateTime kurz (YYYY-MM-DDTHH:MM)
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z?/, // YYYY-MM-DD HH:MM:SS mit optionalem Z
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}Z?/, // YYYY-MM-DD HH:MM mit optionalem Z
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[+\-]\d{2}:\d{2}/, // YYYY-MM-DD HH:MM:SS+TZ
				/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}[+\-]\d{2}:\d{2}/, // YYYY-MM-DD HH:MM+TZ
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+\-]\d{2}:\d{2}/, // ISO mit Timezone
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[+\-]\d{2}:\d{2}/, // ISO kurz mit Timezone
				/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/, // MM/DD/YYYY HH:MM
				/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/, // DD.MM.YYYY HH:MM
				/^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD (nur Datum)
				/^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY (nur Datum)
				/^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY (nur Datum)
				/^\d{2}:\d{2}:\d{2}$/, // HH:MM:SS (nur Zeit)
				/^\d{2}:\d{2}$/, // HH:MM (nur Zeit)
			];

			if (dateTimePatterns.some((pattern) => pattern.test(value))) {
				const date = new Date(value);
				if (!isNaN(date.getTime())) {
					return "date";
				}
			}

			// Zusätzlicher Check für Unix Timestamps
			if (/^\d{10}$/.test(value) || /^\d{13}$/.test(value)) {
				const timestamp = parseInt(value);
				const date = new Date(
					/^\d{10}$/.test(value) ? timestamp * 1000 : timestamp
				);
				if (
					!isNaN(date.getTime()) &&
					date.getFullYear() > 1970 &&
					date.getFullYear() < 2100
				) {
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
				// Einfache Regex-Säuberung ohne Umrechnung
				if (typeof value === "string") {
					// Regex für UTC-Format: "2025-08-08 03:50Z" -> "2025-08-08 03:50"
					const utcMatch = value.match(/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})Z?$/);
					if (utcMatch) {
						return utcMatch[1];
					}

					// Regex für Local-Format: "2025-08-08 05:50+02:00" -> "2025-08-08 05:50"
					const localMatch = value.match(
						/^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})[\+\-]\d{2}:\d{2}$/
					);
					if (localMatch) {
						return localMatch[1];
					}

					// Fallback: Original-Wert zurückgeben falls kein Match
					return value;
				}

				// Für nicht-String Werte: Original-Wert zurückgeben
				return value;

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

	// Structure Diagram Methods
	toggleStructureDiagram() {
		const diagramSection = document.getElementById("structureDiagramSection");
		const isVisible = diagramSection.style.display !== "none";

		if (isVisible) {
			diagramSection.style.display = "none";
		} else {
			diagramSection.style.display = "block";
			this.generateStructureDiagram();
			// Smooth scroll to diagram
			diagramSection.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}

	toggleDiagramMode() {
		this.diagramMode = this.diagramMode === "fishbone" ? "tree" : "fishbone";
		document.getElementById("toggleDiagramMode").innerHTML = 
			this.diagramMode === "fishbone" 
				? '<i class="fas fa-exchange-alt"></i> Baum-Ansicht'
				: '<i class="fas fa-exchange-alt"></i> Fischgräten-Ansicht';
		this.generateStructureDiagram();
	}

	generateStructureDiagram() {
		if (!this.rawJsonData) return;

		const diagramContainer = document.getElementById("structureDiagram");
		diagramContainer.innerHTML = "";

		if (this.diagramMode === "fishbone") {
			this.createFishboneDiagram(diagramContainer);
		} else {
			this.createTreeDiagram(diagramContainer);
		}
	}

	createFishboneDiagram(container) {
		const width = Math.max(1200, container.clientWidth - 40);
		const height = 800;
		
		// SVG erstellen
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("width", width);
		svg.setAttribute("height", height);
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

		// Marker für Pfeilspitzen
		const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
		const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
		marker.setAttribute("id", "arrowhead");
		marker.setAttribute("markerWidth", "10");
		marker.setAttribute("markerHeight", "7");
		marker.setAttribute("refX", "9");
		marker.setAttribute("refY", "3.5");
		marker.setAttribute("orient", "auto");
		
		const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
		polygon.setAttribute("fill", "#a3a3a3");
		
		marker.appendChild(polygon);
		defs.appendChild(marker);
		svg.appendChild(defs);

		// Hauptlinie (Rückgrat des Fischgrätdiagramms)
		const mainLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
		mainLine.setAttribute("x1", 50);
		mainLine.setAttribute("y1", height / 2);
		mainLine.setAttribute("x2", width - 50);
		mainLine.setAttribute("y2", height / 2);
		mainLine.setAttribute("stroke", "#525252");
		mainLine.setAttribute("stroke-width", "4");
		svg.appendChild(mainLine);

		// Analysiere JSON-Struktur mit allen Ebenen
		const allLevels = this.extractAllLevels(this.rawJsonData);
		const levelGroups = this.groupByLevel(allLevels);
		
		// Hauptknoten (JSON Root)
		const rootNode = this.createDiagramNode(width - 100, height / 2, "JSON Root", "root");
		svg.appendChild(rootNode);

		// Erstelle Äste für jede Ebene
		let currentX = width - 200;
		const levelSpacing = Math.min(150, (width - 200) / Math.max(Object.keys(levelGroups).length, 1));

		Object.keys(levelGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(levelKey => {
			const level = parseInt(levelKey);
			const items = levelGroups[levelKey];
			
			if (level === 0) return; // Root-Level überspringen
			
			// Berechne Position für diese Ebene
			const branchX = currentX - (level * levelSpacing);
			const itemSpacing = Math.min(60, (height - 100) / Math.max(items.length - 1, 1));
			
			items.forEach((item, index) => {
				const isUpper = index % 2 === 0;
				const branchY = height / 2 + (isUpper ? -1 : 1) * Math.ceil(index / 2) * itemSpacing;
				
				// Begrenze Y-Position
				const clampedY = Math.max(50, Math.min(height - 50, branchY));
				
				// Hauptast vom Rückgrat
				const branchLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
				branchLine.setAttribute("x1", branchX + 50);
				branchLine.setAttribute("y1", height / 2);
				branchLine.setAttribute("x2", branchX + 50);
				branchLine.setAttribute("y2", clampedY);
				branchLine.setAttribute("stroke", "#6b7280");
				branchLine.setAttribute("stroke-width", "2");
				branchLine.setAttribute("class", "diagram-connection");
				svg.appendChild(branchLine);

				// Horizontale Verbindung
				const connectionLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
				connectionLine.setAttribute("x1", branchX + 50);
				connectionLine.setAttribute("y1", clampedY);
				connectionLine.setAttribute("x2", branchX + 100);
				connectionLine.setAttribute("y2", clampedY);
				connectionLine.setAttribute("stroke", "#6b7280");
				connectionLine.setAttribute("stroke-width", "2");
				connectionLine.setAttribute("class", "diagram-connection");
				svg.appendChild(connectionLine);

				// Item-Knoten
				const nodeType = this.getNodeTypeFromItem(item);
				const nodeLabel = this.getNodeLabelFromItem(item);
				const itemNode = this.createDiagramNode(branchX + 130, clampedY, nodeLabel, nodeType, 10);
				svg.appendChild(itemNode);
			});
		});

		// Legende hinzufügen
		this.addDiagramLegend(container);

		container.appendChild(svg);
	}

	// Hilfsfunktionen für das erweiterte Diagramm
	groupByLevel(allLevels) {
		const groups = {};
		allLevels.forEach(item => {
			const level = item._level || 0;
			if (!groups[level]) {
				groups[level] = [];
			}
			groups[level].push(item);
		});
		return groups;
	}

	getNodeTypeFromItem(item) {
		if (item._type === "array-item") return "array";
		if (item._type === "object") return "object";
		if (item._type === "property") return "property";
		if (item._type === "primitive") return "property";
		return "object";
	}

	getNodeLabelFromItem(item) {
		if (item._propertyName) return item._propertyName;
		if (item._path) {
			const parts = item._path.split(/[.\[\]]/);
			return parts[parts.length - 1] || "root";
		}
		if (item.value !== undefined) return String(item.value).substring(0, 10);
		return "item";
	}

	createTreeDiagram(container) {
		const width = Math.max(1400, container.clientWidth - 40);
		const height = 1000;
		
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("width", width);
		svg.setAttribute("height", height);
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

		// Marker für Pfeilspitzen
		const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
		const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
		marker.setAttribute("id", "arrowhead");
		marker.setAttribute("markerWidth", "10");
		marker.setAttribute("markerHeight", "7");
		marker.setAttribute("refX", "9");
		marker.setAttribute("refY", "3.5");
		marker.setAttribute("orient", "auto");
		
		const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
		polygon.setAttribute("fill", "#a3a3a3");
		
		marker.appendChild(polygon);
		defs.appendChild(marker);
		svg.appendChild(defs);

		// Analysiere JSON-Struktur mit allen Ebenen
		const allLevels = this.extractAllLevels(this.rawJsonData);
		const levelGroups = this.groupByLevel(allLevels);
		
		// Root-Knoten
		const rootX = width / 2;
		const rootY = 50;
		const rootNode = this.createDiagramNode(rootX, rootY, "JSON Root", "root");
		svg.appendChild(rootNode);

		// Erstelle Ebenen von oben nach unten
		const maxLevel = Math.max(...Object.keys(levelGroups).map(k => parseInt(k)));
		const levelHeight = Math.min(120, (height - 100) / Math.max(maxLevel, 1));

		Object.keys(levelGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(levelKey => {
			const level = parseInt(levelKey);
			const items = levelGroups[levelKey];
			
			if (level === 0) return; // Root-Level überspringen
			
			const y = rootY + (level * levelHeight);
			const itemWidth = Math.min(180, (width - 100) / Math.max(items.length, 1));
			const startX = (width - (items.length * itemWidth)) / 2;
			
			items.forEach((item, index) => {
				const x = startX + (index * itemWidth) + (itemWidth / 2);
				
				// Begrenze X-Position
				const clampedX = Math.max(80, Math.min(width - 80, x));
				
				// Verbindung zur vorherigen Ebene (vereinfacht zum Root)
				const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
				line.setAttribute("x1", rootX);
				line.setAttribute("y1", rootY + 15);
				line.setAttribute("x2", clampedX);
				line.setAttribute("y2", y - 15);
				line.setAttribute("class", "diagram-connection");
				svg.appendChild(line);

				// Item-Knoten
				const nodeType = this.getNodeTypeFromItem(item);
				const nodeLabel = this.getNodeLabelFromItem(item);
				const itemNode = this.createDiagramNode(clampedX, y, nodeLabel, nodeType, 10);
				svg.appendChild(itemNode);
			});
		});

		// Legende hinzufügen
		this.addDiagramLegend(container);

		container.appendChild(svg);
	}
		
		marker.appendChild(polygon);
		defs.appendChild(marker);
		svg.appendChild(defs);

		// JSON-Struktur analysieren
		const structure = this.analyzeJsonStructure(this.rawJsonData);
		
		// Root-Knoten
		const rootX = width / 2;
		const rootY = 50;
		const rootNode = this.createDiagramNode(rootX, rootY, "JSON Root", "root");
		svg.appendChild(rootNode);

		// Erste Ebene - Hauptkategorien
		const mainKeys = Object.keys(structure);
		const spacing = Math.min(200, (width - 200) / Math.max(mainKeys.length - 1, 1));

		mainKeys.forEach((key, index) => {
			const x = 100 + index * spacing;
			const y = 150;

			// Verbindung vom Root
			const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line.setAttribute("x1", rootX);
			line.setAttribute("y1", rootY + 15);
			line.setAttribute("x2", x);
			line.setAttribute("y2", y - 15);
			line.setAttribute("class", "diagram-connection");
			svg.appendChild(line);

			// Hauptkategorie-Knoten
			const categoryType = this.getDataType(structure[key]);
			const categoryNode = this.createDiagramNode(x, y, key, categoryType);
			svg.appendChild(categoryNode);

			// Zweite Ebene - Unterkategorien
			if (categoryType === "array" && structure[key].length > 0) {
				const subItems = structure[key][0];
				if (typeof subItems === "object" && subItems !== null) {
					const subKeys = Object.keys(subItems).slice(0, 6);
					const subSpacing = 120;

					subKeys.forEach((subKey, subIndex) => {
						const subX = x + (subIndex - Math.floor(subKeys.length / 2)) * subSpacing;
						const subY = 280;

						// Verbindung zur Unterkategorie
						const subLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
						subLine.setAttribute("x1", x);
						subLine.setAttribute("y1", y + 15);
						subLine.setAttribute("x2", subX);
						subLine.setAttribute("y2", subY - 15);
						subLine.setAttribute("class", "diagram-connection");
						svg.appendChild(subLine);

						// Unterkategorie-Knoten
						const subType = this.getDataType(subItems[subKey]);
						const subNode = this.createDiagramNode(subX, subY, subKey, "property", 11);
						svg.appendChild(subNode);

						// Dritte Ebene - Wertetypen
						const valueTypeY = 400;
						const valueNode = this.createDiagramNode(subX, valueTypeY, subType, "property", 10);
						
						// Verbindung zum Wertetyp
						const valueLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
						valueLine.setAttribute("x1", subX);
						valueLine.setAttribute("y1", subY + 15);
						valueLine.setAttribute("x2", subX);
						valueLine.setAttribute("y2", valueTypeY - 15);
						valueLine.setAttribute("class", "diagram-connection");
						svg.appendChild(valueLine);
						svg.appendChild(valueNode);
					});
				}
			}
		});

		// Legende hinzufügen
		this.addDiagramLegend(container);

		container.appendChild(svg);
	}

	createDiagramNode(x, y, text, type, fontSize = 14) {
		const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
		group.setAttribute("class", `diagram-node ${type}`);
		group.setAttribute("transform", `translate(${x - 50}, ${y - 15})`);

		// Rechteck
		const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		rect.setAttribute("width", "100");
		rect.setAttribute("height", "30");
		group.appendChild(rect);

		// Text
		const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
		textElement.setAttribute("x", "50");
		textElement.setAttribute("y", "15");
		textElement.setAttribute("font-size", `${fontSize}px`);
		textElement.textContent = text.length > 12 ? text.substring(0, 10) + "..." : text;
		group.appendChild(textElement);

		// Tooltip
		const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
		title.textContent = `${text} (${type})`;
		group.appendChild(title);

		return group;
	}

	addDiagramLegend(container) {
		const legend = document.createElement("div");
		legend.className = "diagram-legend";
		
		const legendItems = [
			{ color: "#ff6b35", label: "JSON Root" },
			{ color: "#3b82f6", label: "Array" },
			{ color: "#10b981", label: "Object" },
			{ color: "#f3f4f6", label: "Property" }
		];

		legendItems.forEach(item => {
			const legendItem = document.createElement("div");
			legendItem.className = "legend-item";
			
			const colorBox = document.createElement("div");
			colorBox.className = "legend-color";
			colorBox.style.backgroundColor = item.color;
			
			const label = document.createElement("span");
			label.textContent = item.label;
			
			legendItem.appendChild(colorBox);
			legendItem.appendChild(label);
			legend.appendChild(legendItem);
		});

		container.appendChild(legend);
	}

	analyzeJsonStructure(data) {
		const structure = {};
		
		if (Array.isArray(data)) {
			return data;
		}
		
		for (const key in data) {
			if (data.hasOwnProperty(key)) {
				structure[key] = data[key];
			}
		}
		
		return structure;
	}

	getDataType(value) {
		if (Array.isArray(value)) return "array";
		if (value === null) return "null";
		if (typeof value === "object") return "object";
		if (typeof value === "boolean") return "boolean";
		if (typeof value === "number") return "number";
		if (typeof value === "string") return "string";
		return "unknown";
	}
}

// App initialisieren wenn DOM geladen ist
document.addEventListener("DOMContentLoaded", () => {
	new JSONVisualizer();
});
