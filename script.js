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
		this.currentDiagramMode = "fishbone";
		this.diagramZoom = 1;
		this.diagramPanX = 0;
		this.diagramPanY = 0;
		this.isDragging = false;
		this.lastMouseX = 0;
		this.lastMouseY = 0;
		this.isFullscreen = false; // Track fullscreen state
		this.currentTheme = localStorage.getItem("selectedTheme") || "light";
		this.debugMessages = [];
		this.debugConsoleVisible = false;
		this.init();
	}

	init() {
		this.setupEventListeners();
		this.setupDragAndDrop();
		this.setupThemeSelector();
		this.applyTheme(this.currentTheme);
		this.setupGlobalErrorHandling();
		this.setupDebugConsole();
	}

	setupGlobalErrorHandling() {
		// Global Error Handler für besseres Debugging
		window.addEventListener("error", (event) => {
			console.error("Global Error:", event.error);
			console.error("Error details:", {
				message: event.message,
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
			});
		});

		// Promise Rejection Handler
		window.addEventListener("unhandledrejection", (event) => {
			console.error("Unhandled Promise Rejection:", event.reason);
		});
	}

	setupDebugConsole() {
		// Debug Toggle Button
		const debugToggleBtn = document.getElementById("debugToggleBtn");
		const debugConsole = document.getElementById("debugConsole");
		const clearDebugBtn = document.getElementById("clearDebugBtn");
		const closeDebugBtn = document.getElementById("closeDebugBtn");

		debugToggleBtn.addEventListener("click", () => {
			this.toggleDebugConsole();
		});

		clearDebugBtn.addEventListener("click", () => {
			this.clearDebugMessages();
		});

		closeDebugBtn.addEventListener("click", () => {
			this.hideDebugConsole();
		});

		// Override console methods to capture messages
		this.setupConsoleInterception();
	}

	setupConsoleInterception() {
		const originalLog = console.log;
		const originalWarn = console.warn;
		const originalError = console.error;
		const originalInfo = console.info;

		console.log = (...args) => {
			originalLog.apply(console, args);
			this.addDebugMessage("log", args.join(" "));
		};

		console.warn = (...args) => {
			originalWarn.apply(console, args);
			this.addDebugMessage("warn", args.join(" "));
		};

		console.error = (...args) => {
			originalError.apply(console, args);
			this.addDebugMessage("error", args.join(" "));
		};

		console.info = (...args) => {
			originalInfo.apply(console, args);
			this.addDebugMessage("info", args.join(" "));
		};
	}

	addDebugMessage(type, message) {
		const timestamp = new Date().toLocaleTimeString();
		const debugMessage = {
			type,
			message,
			timestamp,
		};

		this.debugMessages.push(debugMessage);

		// Begrenze die Anzahl der Nachrichten
		if (this.debugMessages.length > 100) {
			this.debugMessages.shift();
		}

		this.updateDebugConsole();
	}

	updateDebugConsole() {
		const debugContent = document.getElementById("debugContent");
		if (!debugContent) return;

		debugContent.innerHTML = this.debugMessages
			.map(
				(msg) => `
			<div class="debug-message debug-${msg.type}">
				<span style="opacity: 0.7;">${msg.timestamp}</span> ${msg.message}
			</div>
		`
			)
			.join("");

		// Scroll to bottom
		debugContent.scrollTop = debugContent.scrollHeight;
	}

	toggleDebugConsole() {
		const debugConsole = document.getElementById("debugConsole");
		this.debugConsoleVisible = !this.debugConsoleVisible;
		debugConsole.style.display = this.debugConsoleVisible ? "block" : "none";

		if (this.debugConsoleVisible) {
			this.addDebugMessage("info", "Debug Console aktiviert");
		}
	}

	hideDebugConsole() {
		const debugConsole = document.getElementById("debugConsole");
		this.debugConsoleVisible = false;
		debugConsole.style.display = "none";
	}

	clearDebugMessages() {
		this.debugMessages = [];
		this.updateDebugConsole();
		this.addDebugMessage("info", "Debug Console geleert");
	}

	setupEventListeners() {
		console.log("Setting up event listeners...");

		// File Input Event mit Debug-Logging
		const fileInput = document.getElementById("fileInput");
		if (fileInput) {
			console.log("File Input Event-Listener wird registriert");
			fileInput.addEventListener("change", (e) => {
				console.log("=== FILE INPUT CHANGE EVENT AUSGELÖST ===");
				console.log("Event:", e);
				console.log("Target:", e.target);
				console.log("Files:", e.target.files);
				console.log(
					"Anzahl Dateien:",
					e.target.files ? e.target.files.length : "keine"
				);

				if (e.target.files && e.target.files.length > 0) {
					const file = e.target.files[0];
					console.log("Ausgewählte Datei:", {
						name: file.name,
						size: file.size,
						type: file.type,
						lastModified: file.lastModified,
					});
					this.handleFileSelect(file);
				} else {
					console.warn("Keine Datei ausgewählt oder files array leer");
				}
			});
			console.log("File Input Event-Listener erfolgreich registriert");
		} else {
			console.error("File Input Element nicht gefunden!");
		}

		// Upload Button Click Event mit Debug-Logging
		const uploadBtn = document.querySelector(".upload-btn");
		if (uploadBtn) {
			console.log("Upload Button Event-Listener wird registriert");
			uploadBtn.addEventListener("click", () => {
				console.log("=== UPLOAD BUTTON GEKLICKT ===");
				if (fileInput) {
					console.log("File Input wird ausgelöst");
					fileInput.click();
				} else {
					console.error("File Input nicht verfügbar für Button-Klick");
				}
			});
		} else {
			console.error("Upload Button nicht gefunden!");
		}

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
				console.log("Column Manager Button clicked!");
				this.toggleColumnManager();
			});

		// Structure Diagram Button
		document
			.getElementById("structureDiagramBtn")
			.addEventListener("click", () => {
				console.log("Structure Diagram Button clicked!");
				this.toggleStructureDiagram();
			});

		// Fullscreen Table Button
		document
			.getElementById("fullscreenTableBtn")
			.addEventListener("click", () => {
				this.toggleFullscreenTable();
			});

		// Exit Fullscreen Button
		document
			.getElementById("exitFullscreenBtn")
			.addEventListener("click", () => {
				this.exitFullscreenTable();
			});

		// Diagram Controls
		document
			.getElementById("toggleDiagramMode")
			.addEventListener("click", () => {
				this.switchDiagramMode();
			});

		document.getElementById("closeDiagram").addEventListener("click", () => {
			this.toggleStructureDiagram();
		});

		// Diagram Zoom and Pan Controls
		document.getElementById("zoomInBtn").addEventListener("click", () => {
			this.zoomDiagram(1.2);
		});

		document.getElementById("zoomOutBtn").addEventListener("click", () => {
			this.zoomDiagram(0.8);
		});

		document.getElementById("resetZoomBtn").addEventListener("click", () => {
			this.resetDiagramZoom();
		});

		document
			.getElementById("centerDiagramBtn")
			.addEventListener("click", () => {
				this.centerDiagram();
			});

		// Level Selector Events
		document.getElementById("applyLevelsBtn").addEventListener("click", () => {
			this.applyLevelSelection();
		});

		document.getElementById("levelSelector").addEventListener("change", () => {
			this.applyLevelSelection();
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

		// Upload Area Click mit Debug-Logging
		const uploadArea = document.getElementById("uploadArea");
		if (uploadArea) {
			console.log("Upload Area Event-Listener wird registriert");
			uploadArea.addEventListener("click", () => {
				console.log("=== UPLOAD AREA GEKLICKT ===");
				const fileInput = document.getElementById("fileInput");
				if (fileInput) {
					console.log("Trigger File Input Click");
					fileInput.click();
				} else {
					console.error("File Input für Upload Area nicht gefunden!");
				}
			});
		} else {
			console.error("Upload Area Element nicht gefunden!");
		}
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
		console.log("=== HANDLE FILE SELECT AUFGERUFEN ===");
		console.log("File parameter:", file);

		if (!file) {
			console.error("Keine Datei übergeben!");
			return;
		}

		console.log("Datei Details:", {
			name: file.name,
			size: file.size,
			type: file.type,
		});

		if (!file.name.toLowerCase().endsWith(".json")) {
			console.error("Datei ist keine JSON-Datei:", file.name);
			this.showError("Bitte wählen Sie eine gültige JSON-Datei aus.");
			return;
		}

		console.log("JSON-Datei erkannt, prüfe Größe...");

		// iOS-spezifische Dateigrößenprüfung
		const maxFileSize = 10 * 1024 * 1024; // 10MB für iOS
		if (file.size > maxFileSize) {
			console.error(
				"Datei zu groß:",
				file.size,
				"bytes, Maximum:",
				maxFileSize
			);
			this.showError(
				`Datei zu groß für mobile Geräte. Maximale Größe: ${Math.round(
					maxFileSize / 1024 / 1024
				)}MB`
			);
			return;
		}

		console.log("Datei-Größe OK, starte FileReader...");

		const reader = new FileReader();

		reader.onloadstart = () => {
			console.log("FileReader: Laden gestartet");
		};

		reader.onprogress = (e) => {
			if (e.lengthComputable) {
				const percent = (e.loaded / e.total) * 100;
				console.log(`FileReader: ${percent.toFixed(1)}% geladen`);
			}
		};

		reader.onload = (e) => {
			console.log("FileReader: Datei vollständig geladen");
			console.log(
				"Content length:",
				e.target.result ? e.target.result.length : 0
			);

			try {
				console.log("Starte JSON-Parsing...");
				const jsonData = JSON.parse(e.target.result);
				console.log("JSON erfolgreich geparst, Datentyp:", typeof jsonData);
				console.log(
					"JSON Struktur:",
					Array.isArray(jsonData) ? "Array" : "Object"
				);
				if (Array.isArray(jsonData)) {
					console.log("Array-Länge:", jsonData.length);
				}

				console.log("Rufe processJSONData auf...");
				this.processJSONData(jsonData, file.name);
			} catch (error) {
				console.error("JSON Parse Error Details:", {
					name: error.name,
					message: error.message,
					stack: error.stack,
				});
				this.showError("Fehler beim Parsen der JSON-Datei: " + error.message);
			}
		};

		reader.onerror = (e) => {
			console.error("FileReader Error Details:", e);
			this.showError("Fehler beim Lesen der Datei.");
		};

		reader.onabort = () => {
			console.error("FileReader wurde abgebrochen");
		};

		console.log("Starte readAsText...");
		reader.readAsText(file);
		console.log("readAsText aufgerufen, warte auf Callback...");
	}

	processJSONData(data, fileName) {
		try {
			console.log("Processing JSON data...", {
				type: typeof data,
				isArray: Array.isArray(data),
			});

			// Verstecke Error Section
			document.getElementById("errorSection").style.display = "none";

			// Speichere die ursprüngliche JSON-Struktur für das Diagramm
			this.rawJsonData = data;

			// iOS-spezifische Größenprüfung
			const dataString = JSON.stringify(data);
			if (dataString.length > 2 * 1024 * 1024) {
				// 2MB String-Grenze für iOS
				console.warn("Large dataset detected, limiting processing...");
			}

			// Konvertiere verschiedene JSON-Strukturen zu Array von Objekten
			let processedData = [];

			if (Array.isArray(data)) {
				processedData = data;
				console.log("Data is array with", data.length, "items");
			} else if (typeof data === "object" && data !== null) {
				// Wenn es ein Objekt ist, schaue nach Array-Properties
				const arrayKeys = Object.keys(data).filter((key) =>
					Array.isArray(data[key])
				);

				if (arrayKeys.length > 1) {
					// Mehrere Arrays gefunden - kombiniere alle Arrays
					console.log(`Mehrere Arrays gefunden: ${arrayKeys.join(", ")}`);

					arrayKeys.forEach((key) => {
						const arrayData = data[key];
						// Füge Array-Namen als zusätzliche Spalte hinzu
						const enrichedData = arrayData.map((item) => ({
							...item,
							_arraySource: key, // Markiere woher das Item kommt
						}));
						processedData = processedData.concat(enrichedData);
					});
				} else if (arrayKeys.length === 1) {
					// Ein Array gefunden - verwende es
					processedData = data[arrayKeys[0]];
				} else {
					// Kein Array gefunden - konvertiere das Objekt selbst
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

			// iOS-spezifisch: Begrenze die Anzahl der verarbeiteten Items
			const maxItems = 1000; // Limit für iOS
			if (processedData.length > maxItems) {
				console.warn(`Dataset zu groß für iOS, begrenzt auf ${maxItems} Items`);
				processedData = processedData.slice(0, maxItems);
			}

			// Flatte verschachtelte Objekte mit Error-Handling
			console.log("Flattening objects...");
			processedData = processedData.map((item, index) => {
				try {
					return this.flattenObject(item);
				} catch (error) {
					console.error(`Error flattening item ${index}:`, error);
					return item; // Fallback: verwende original item
				}
			});

			console.log("Data processing completed:", processedData.length, "items");

			this.originalData = processedData;
			this.filteredData = [...processedData];

			this.createTable(fileName);
			this.showTableSection();
			this.showLevelSelector(); // Zeige die Ebenen-Auswahl
		} catch (error) {
			console.error("Error in processJSONData:", error);
			this.showError("Fehler beim Verarbeiten der Daten: " + error.message);
		}
	}

	// Neue Funktion: Extrahiert alle Ebenen des JSON rekursiv
	extractAllLevels(data, parentPath = "", level = 0, maxLevel = 8) {
		const result = [];

		if (level > maxLevel) {
			console.warn(
				`Maximale Verschachtelungstiefe erreicht bei: ${parentPath}`
			);
			return result;
		}

		if (Array.isArray(data)) {
			// Wenn es ein Array ist, durchlaufe alle Elemente
			data.forEach((item, index) => {
				const currentPath = parentPath
					? `${parentPath}[${index}]`
					: `[${index}]`;

				if (typeof item === "object" && item !== null) {
					// Füge Metadaten hinzu
					const enrichedItem = {
						...item,
						_path: currentPath,
						_level: level,
						_type: "array-item",
						_parent: parentPath || "root",
					};
					result.push(enrichedItem);

					// Rekursiv in verschachtelte Strukturen nur wenn unter maxLevel
					if (level < maxLevel) {
						const nestedResults = this.extractAllLevels(
							item,
							currentPath,
							level + 1,
							maxLevel
						);
						result.push(...nestedResults);
					}
				} else {
					// Primitive Werte als einzelne Einträge
					result.push({
						_path: currentPath,
						_level: level,
						_type: "primitive",
						_parent: parentPath || "root",
						value: item,
						dataType: typeof item,
					});
				}
			});
		} else if (typeof data === "object" && data !== null) {
			// Wenn es ein Objekt ist, durchlaufe alle Eigenschaften
			const objectEntry = {
				_path: parentPath || "root",
				_level: level,
				_type: "object",
				_parent: parentPath ? parentPath.split(".").slice(0, -1).join(".") : "",
				...data,
			};
			result.push(objectEntry);

			// Durchlaufe alle Eigenschaften des Objekts nur wenn unter maxLevel
			if (level < maxLevel) {
				for (const key in data) {
					if (data.hasOwnProperty(key)) {
						const value = data[key];
						const currentPath = parentPath ? `${parentPath}.${key}` : key;

						if (Array.isArray(value)) {
							// Array-Eigenschaft
							const nestedResults = this.extractAllLevels(
								value,
								currentPath,
								level + 1,
								maxLevel
							);
							result.push(...nestedResults);
						} else if (typeof value === "object" && value !== null) {
							// Verschachteltes Objekt
							const nestedResults = this.extractAllLevels(
								value,
								currentPath,
								level + 1,
								maxLevel
							);
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
								dataType: typeof value,
							});
						}
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
				dataType: typeof data,
			});
		}

		return result;
	}

	flattenObject(obj, prefix = "", depth = 0) {
		const flattened = {};

		// iOS-spezifisch: Begrenze Rekursionstiefe
		const maxDepth = 5;
		if (depth > maxDepth) {
			return { [prefix || "deep_object"]: "[Zu tief verschachtelt]" };
		}

		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				const value = obj[key];
				const newKey = prefix ? `${prefix}.${key}` : key;

				if (
					value !== null &&
					typeof value === "object" &&
					!Array.isArray(value)
				) {
					// Rekursiv für verschachtelte Objekte mit Tiefenbegrenzung
					try {
						Object.assign(
							flattened,
							this.flattenObject(value, newKey, depth + 1)
						);
					} catch (error) {
						console.warn("Error flattening nested object:", error);
						flattened[newKey] = "[Konvertierungsfehler]";
					}
				} else if (Array.isArray(value)) {
					// Arrays als Strings darstellen, aber kürzer für iOS
					if (value.length > 10) {
						flattened[newKey] = `[Array mit ${value.length} Elementen]`;
					} else {
						try {
							flattened[newKey] = JSON.stringify(value);
						} catch (error) {
							flattened[newKey] = `[Array mit ${value.length} Elementen]`;
						}
					}
				} else {
					flattened[newKey] = value;
				}
			}
		}

		return flattened;
	}

	createTable(fileName) {
		try {
			console.log("Creating table for:", fileName);

			// Hole alle einzigartigen Spalten
			const columns = [...new Set(this.originalData.flatMap(Object.keys))];
			console.log("Found columns:", columns.length, columns);

			if (columns.length === 0) {
				this.showError("Keine Spalten in den Daten gefunden.");
				return;
			}

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

			console.log("Table created successfully");
		} catch (error) {
			console.error("Error in createTable:", error);
			this.showError("Fehler beim Erstellen der Tabelle: " + error.message);
		}
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
		console.log("createColumnManager called");
		console.log("columnOrder:", this.columnOrder);
		console.log(
			"columnOrder length:",
			this.columnOrder ? this.columnOrder.length : 0
		);

		const columnList = document.getElementById("columnList");
		console.log("columnList found:", columnList);
		columnList.innerHTML = "";

		if (!this.columnOrder || this.columnOrder.length === 0) {
			console.log("No columns available, adding placeholder");
			columnList.innerHTML =
				"<p>Keine Spalten verfügbar. Bitte laden Sie zuerst eine JSON-Datei.</p>";
			return;
		}

		this.columnOrder.forEach((column, index) => {
			console.log("Creating column item for:", column);
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
		console.log("toggleColumnManager called");
		const columnManagerSection = document.getElementById(
			"columnManagerSection"
		);
		console.log("columnManagerSection found:", columnManagerSection);

		if (!columnManagerSection) {
			console.error("Column Manager Section not found!");
			return;
		}

		// Verbesserte Sichtbarkeitsprüfung
		const computedStyle = window.getComputedStyle(columnManagerSection);
		const isVisible = computedStyle.display !== "none";
		console.log("Current display style:", columnManagerSection.style.display);
		console.log("Computed display style:", computedStyle.display);
		console.log("isVisible:", isVisible);

		if (isVisible) {
			console.log("Hiding column manager");
			columnManagerSection.style.display = "none";
		} else {
			console.log("Showing column manager");
			columnManagerSection.style.display = "block";
			columnManagerSection.style.visibility = "visible";
			columnManagerSection.style.opacity = "1";
			columnManagerSection.style.position = "relative";
			columnManagerSection.style.zIndex = "1000";
			columnManagerSection.style.minHeight = "300px"; // Mindesthöhe setzen
			columnManagerSection.style.width = "100%"; // Breite setzen
			console.log(
				"After setting display block:",
				columnManagerSection.style.display
			);

			// Prüfe die tatsächliche Sichtbarkeit
			setTimeout(() => {
				const rect = columnManagerSection.getBoundingClientRect();
				console.log("Column Manager dimensions:", rect);
				console.log(
					"Column Manager offsetHeight:",
					columnManagerSection.offsetHeight
				);
				console.log(
					"Column Manager offsetWidth:",
					columnManagerSection.offsetWidth
				);
			}, 100);

			// Prüfe ob Daten vorhanden sind
			if (!this.originalData || this.originalData.length === 0) {
				console.warn("No data available for Column Manager");
				columnManagerSection.innerHTML = `
					<div class="column-manager-header">
						<h3><i class="fas fa-columns"></i> Spalten-Manager</h3>
						<button id="closeColumnManager" class="btn-small btn-danger" onclick="document.getElementById('columnManagerSection').style.display='none'">
							<i class="fas fa-times"></i> Schließen
						</button>
					</div>
					<div class="column-manager-content">
						<p style="text-align: center; padding: 20px; color: #666;">
							<i class="fas fa-info-circle"></i> Bitte laden Sie zuerst eine JSON-Datei, um den Spalten-Manager zu verwenden.
						</p>
					</div>
				`;
			} else {
				// Generiere Spalten-Manager Inhalt wenn nötig
				this.createColumnManager();
			}

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

			// Bestimme den Datentyp für intelligente Sortierung
			const dataType = this.detectDataType(aVal);

			// Datum-Sortierung - verwende originale Werte für korrekte chronologische Sortierung
			if (dataType === "date") {
				const aDate = this.parseToDate(aVal);
				const bDate = this.parseToDate(bVal);

				if (aDate && bDate) {
					return this.currentSort.direction === "asc"
						? aDate.getTime() - bDate.getTime()
						: bDate.getTime() - aDate.getTime();
				}
			}

			// Numerische Sortierung
			const aNum = parseFloat(aVal);
			const bNum = parseFloat(bVal);

			if (!isNaN(aNum) && !isNaN(bNum)) {
				return this.currentSort.direction === "asc" ? aNum - bNum : bNum - aNum;
			}

			// String-Sortierung (fallback)
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
		// Exit fullscreen if active
		if (this.isFullscreen) {
			this.exitFullscreenTable();
		}

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

	showLevelSelector() {
		// Zeige den Level-Selector
		document.getElementById("levelSelectorContainer").style.display = "flex";
	}

	applyLevelSelection() {
		const selectedLevel = document.getElementById("levelSelector").value;

		if (!this.rawJsonData) return;

		let processedData = [];

		if (selectedLevel === "all") {
			// Alle Ebenen anzeigen
			processedData = this.extractAllLevels(this.rawJsonData, "");
		} else {
			// Nur bestimmte Anzahl von Ebenen
			const maxLevel = parseInt(selectedLevel) - 1;
			processedData = this.extractAllLevels(this.rawJsonData, "", 0, maxLevel);
		}

		// Filtere nur Objekte
		processedData = processedData.filter(
			(item) => typeof item === "object" && item !== null
		);

		if (processedData.length === 0) {
			// Fallback zur ursprünglichen Verarbeitung
			this.processJSONDataOriginal();
			return;
		}

		// Flatte verschachtelte Objekte
		processedData = processedData.map((item) => this.flattenObject(item));

		this.originalData = processedData;
		this.filteredData = [...processedData];

		// Aktualisiere die Tabelle
		this.createTable(
			document.getElementById("fileName").textContent.replace("Datei: ", "")
		);
	}

	processJSONDataOriginal() {
		// Originale JSON-Verarbeitung (nur erste Ebene)
		let processedData = [];

		if (Array.isArray(this.rawJsonData)) {
			processedData = this.rawJsonData;
		} else if (
			typeof this.rawJsonData === "object" &&
			this.rawJsonData !== null
		) {
			const arrayKeys = Object.keys(this.rawJsonData).filter((key) =>
				Array.isArray(this.rawJsonData[key])
			);

			if (arrayKeys.length > 1) {
				arrayKeys.forEach((key) => {
					const arrayData = this.rawJsonData[key];
					const enrichedData = arrayData.map((item) => ({
						...item,
						_arraySource: key,
					}));
					processedData = processedData.concat(enrichedData);
				});
			} else if (arrayKeys.length === 1) {
				processedData = this.rawJsonData[arrayKeys[0]];
			} else {
				processedData = [this.rawJsonData];
			}
		}

		processedData = processedData.filter(
			(item) => typeof item === "object" && item !== null
		);

		processedData = processedData.map((item) => this.flattenObject(item));

		this.originalData = processedData;
		this.filteredData = [...processedData];

		this.createTable(
			document.getElementById("fileName").textContent.replace("Datei: ", "")
		);
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

		// Date Check ZUERST - vor Number Check!
		if (typeof value === "string") {
			// ISO datetime patterns mit Zeitzonen
			const datePatterns = [
				/^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
				/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}Z?$/, // YYYY-MM-DD HH:MM mit optionalem Z
				/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}[+-]\d{2}:\d{2}$/, // YYYY-MM-DD HH:MM+TZ
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO format
				/^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
				/^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
			];

			if (datePatterns.some((pattern) => pattern.test(value))) {
				return "date";
			}
		}

		// Number Check - nach Date Check!
		const numValue = parseFloat(value);
		if (
			!isNaN(numValue) &&
			isFinite(numValue) &&
			value.toString().trim() !== ""
		) {
			return "number";
		}

		// Default to string
		return "string";
	}

	formatValue(value, dataType) {
		switch (dataType) {
			case "number":
				const num = parseFloat(value);
				// Spezielle Behandlung für 4-stellige Zahlen (wahrscheinlich Jahre)
				if (num % 1 === 0 && num >= 1000 && num <= 9999) {
					return num.toString(); // Keine Lokalisierung für Jahre
				}
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
				// Präzise Formatierung - behalte Stunden und Minuten, entferne nur Sekunden
				if (typeof value === "string") {
					let formatted = value;

					// Entferne Zeitzonen-Info
					formatted = formatted.replace(/Z$/, ""); // Entferne Z am Ende
					formatted = formatted.replace(/[+-]\d{2}:\d{2}$/, ""); // Entferne Timezone +XX:XX

					// Entferne nur Sekunden und Millisekunden (aber behalte Minuten!)
					// Muster: HH:MM:SS oder HH:MM:SS.SSS -> HH:MM
					formatted = formatted.replace(/(\d{2}:\d{2}):\d{2}(\.\d+)?/, "$1");

					// Ersetze T mit Leerzeichen
					formatted = formatted.replace("T", " ");

					return formatted;
				}
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

	// Hilfsfunktion zum Parsen verschiedener Datumsformate für Sortierung
	parseToDate(dateString) {
		if (!dateString || typeof dateString !== "string") {
			return null;
		}

		// Versuche verschiedene Datumsformate zu parsen
		try {
			// ISO Format: 2025-08-08T14:30:00Z oder 2025-08-08 14:30:00
			if (dateString.match(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/)) {
				// Normalisiere das Format für Date-Parser
				let normalized = dateString
					.replace("T", " ") // T durch Leerzeichen ersetzen
					.replace(/Z$/, "") // Z entfernen
					.replace(/[+-]\d{2}:\d{2}$/, ""); // Timezone entfernen

				return new Date(normalized);
			}

			// Datum ohne Zeit: 2025-08-08
			if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
				return new Date(dateString);
			}

			// Amerikanisches Format: MM/DD/YYYY
			if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
				return new Date(dateString);
			}

			// Deutsches Format: DD.MM.YYYY
			if (dateString.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
				const parts = dateString.split(".");
				return new Date(parts[2], parts[1] - 1, parts[0]); // Jahr, Monat-1, Tag
			}

			// Fallback: Versuche Standard Date-Parser
			const parsed = new Date(dateString);
			return isNaN(parsed.getTime()) ? null : parsed;
		} catch (error) {
			console.warn("Fehler beim Parsen des Datums:", dateString, error);
			return null;
		}
	}

	// Structure Diagram Functions
	toggleStructureDiagram() {
		console.log(
			"toggleStructureDiagram called",
			this.rawJsonData ? "Data available" : "No data"
		);
		const diagramSection = document.getElementById("structureDiagramSection");
		console.log("diagramSection found:", diagramSection);

		if (!diagramSection) {
			console.error("Structure Diagram Section not found!");
			return;
		}

		// Verbesserte Sichtbarkeitsprüfung
		const computedStyle = window.getComputedStyle(diagramSection);
		const isVisible = computedStyle.display !== "none";
		console.log("Current display style:", diagramSection.style.display);
		console.log("Computed display style:", computedStyle.display);
		console.log("isVisible:", isVisible);

		if (isVisible) {
			console.log("Hiding diagram");
			diagramSection.style.display = "none";
		} else {
			console.log("Showing diagram");
			diagramSection.style.display = "block";
			diagramSection.style.visibility = "visible";
			diagramSection.style.opacity = "1";
			diagramSection.style.position = "relative";
			diagramSection.style.zIndex = "1000";
			diagramSection.style.minHeight = "400px"; // Mindesthöhe setzen
			diagramSection.style.width = "100%"; // Breite setzen
			console.log("After setting display block:", diagramSection.style.display);

			// Prüfe die tatsächliche Sichtbarkeit
			setTimeout(() => {
				const rect = diagramSection.getBoundingClientRect();
				console.log("Element dimensions:", rect);
				console.log("Element offsetHeight:", diagramSection.offsetHeight);
				console.log("Element offsetWidth:", diagramSection.offsetWidth);
			}, 100);

			// Prüfe ob Daten vorhanden sind
			if (!this.rawJsonData) {
				console.warn("No raw JSON data available for Structure Diagram");
				diagramSection.innerHTML = `
					<div class="diagram-header">
						<h3><i class="fas fa-project-diagram"></i> JSON Struktur-Diagramm</h3>
						<button onclick="document.getElementById('structureDiagramSection').style.display='none'" class="btn-small btn-danger">
							<i class="fas fa-times"></i> Schließen
						</button>
					</div>
					<div class="diagram-content">
						<p style="text-align: center; padding: 40px; color: #666;">
							<i class="fas fa-info-circle"></i> Bitte laden Sie zuerst eine JSON-Datei, um das Struktur-Diagramm zu verwenden.
						</p>
					</div>
				`;
			} else {
				this.generateStructureDiagram();
			}

			// Smooth scroll to diagram
			diagramSection.scrollIntoView({
				behavior: "smooth",
			});
		}
	}

	generateStructureDiagram() {
		console.log("generateStructureDiagram called", this.rawJsonData);
		if (!this.rawJsonData) {
			console.log("No rawJsonData available");
			return;
		}

		const diagramContainer = document.getElementById("structureDiagram");
		console.log("diagramContainer found:", diagramContainer);
		this.currentDiagramMode = this.currentDiagramMode || "fishbone";

		if (this.currentDiagramMode === "fishbone") {
			this.createFishboneDiagram(diagramContainer);
		} else {
			this.createTreeDiagram(diagramContainer);
		}
	}

	switchDiagramMode() {
		this.currentDiagramMode =
			this.currentDiagramMode === "fishbone" ? "tree" : "fishbone";

		const modeButton = document.getElementById("toggleDiagramMode");
		const modeText =
			this.currentDiagramMode === "fishbone"
				? "Zu Baum-Ansicht"
				: "Zu Fischgräten-Ansicht";
		modeButton.innerHTML = `<i class="fas fa-exchange-alt"></i> ${modeText}`;

		this.generateStructureDiagram();
	}

	createFishboneDiagram(container) {
		console.log("createFishboneDiagram called");
		const structure = this.analyzeJSONStructure(this.rawJsonData);
		console.log("Structure analyzed:", structure);

		const svgContent = `
			<div class="diagram-mode-indicator">
				<i class="fas fa-fish"></i> Fischgräten-Diagramm
			</div>
			<div class="diagram-svg-container">
				<svg width="1000" height="600" viewBox="0 0 1000 600">
					<!-- Main spine -->
					<line x1="100" y1="300" x2="900" y2="300" stroke="#2196F3" stroke-width="3"/>
					
					<!-- Main root -->
					<g id="main-root">
						<circle cx="920" cy="300" r="10" fill="#4CAF50"/>
						<text x="940" y="305" font-family="Arial" font-size="14" fill="#333">JSON Root</text>
					</g>
					
					${this.generateFishboneBranches(structure, 100, 300, 800)}
				</svg>
			</div>
		`;

		console.log("Setting container innerHTML");
		container.innerHTML = svgContent;

		// Setup pan and zoom functionality
		setTimeout(() => {
			this.setupDiagramPan();
			this.updateZoomDisplay();
		}, 100);

		console.log("Container innerHTML set, content length:", svgContent.length);
		console.log("Container after innerHTML:", container);
		console.log("Container children count:", container.children.length);

		// Prüfe ob Container Höhe hat
		setTimeout(() => {
			console.log("Container offsetHeight after SVG:", container.offsetHeight);
			console.log("Container scrollHeight after SVG:", container.scrollHeight);
		}, 50);
	}

	createTreeDiagram(container) {
		const structure = this.analyzeJSONStructure(this.rawJsonData);

		container.innerHTML = `
			<div class="diagram-mode-indicator">
				<i class="fas fa-tree"></i> Baum-Diagramm
			</div>
			<div class="diagram-svg-container">
				<svg width="1000" height="700" viewBox="0 0 1000 700">
					${this.generateTreeBranches(structure, 500, 50, 0)}
				</svg>
			</div>
		`;

		// Setup pan and zoom functionality
		setTimeout(() => {
			this.setupDiagramPan();
			this.updateZoomDisplay();
		}, 100);
	}

	analyzeJSONStructure(data, path = "", maxDepth = 5, currentDepth = 0) {
		if (currentDepth >= maxDepth) return null;

		const structure = {
			path: path || "root",
			type: Array.isArray(data) ? "array" : typeof data,
			children: [],
		};

		if (data && typeof data === "object") {
			const keys = Array.isArray(data) ? [0, 1, 2] : Object.keys(data);

			keys.slice(0, 8).forEach((key, index) => {
				if (data[key] !== undefined) {
					const childPath = path ? `${path}.${key}` : key.toString();
					const childStructure = this.analyzeJSONStructure(
						data[key],
						childPath,
						maxDepth,
						currentDepth + 1
					);

					if (childStructure) {
						structure.children.push(childStructure);
					} else {
						// For max depth, just add type info
						structure.children.push({
							path: childPath,
							type: Array.isArray(data[key]) ? "array" : typeof data[key],
							children: [],
						});
					}
				}
			});
		}

		return structure;
	}

	generateFishboneBranches(structure, startX, centerY, width) {
		console.log("generateFishboneBranches called", structure);
		if (!structure.children || structure.children.length === 0) {
			console.log("No children found, returning empty string");
			return "";
		}

		let svg = "";
		const branchHeight = 40;
		const childCount = structure.children.length;
		console.log("Generating branches for", childCount, "children");

		structure.children.forEach((child, index) => {
			const isTop = index % 2 === 0;
			const branchIndex = Math.floor(index / 2);
			const x = startX + (width / childCount) * (index + 1);
			const y = isTop ? centerY - branchHeight : centerY + branchHeight;

			// Branch line
			svg += `<line x1="${x}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#FF9800" stroke-width="2"/>`;

			// Node
			const color = this.getTypeColor(child.type);
			svg += `<circle cx="${x}" cy="${y}" r="6" fill="${color}"/>`;

			// Label
			const labelY = isTop ? y - 15 : y + 20;
			svg += `<text x="${x}" y="${labelY}" font-family="Arial" font-size="10" text-anchor="middle" fill="#333">
				${child.path.split(".").pop()}
			</text>`;

			// Type label
			const typeY = isTop ? y - 5 : y + 10;
			svg += `<text x="${x}" y="${typeY}" font-family="Arial" font-size="8" text-anchor="middle" fill="#666">
				${child.type}
			</text>`;
		});

		console.log("Generated SVG length:", svg.length);
		return svg;
	}

	generateTreeBranches(structure, x, y, level) {
		if (!structure || level > 4) return "";

		let svg = "";
		const color = this.getTypeColor(structure.type);
		const levelHeight = 100;
		const childSpacing = Math.max(
			120,
			800 / Math.max(structure.children.length, 1)
		);

		// Current node
		svg += `<circle cx="${x}" cy="${y}" r="8" fill="${color}"/>`;
		svg += `<text x="${x}" y="${
			y - 15
		}" font-family="Arial" font-size="12" text-anchor="middle" fill="#333">
			${structure.path.split(".").pop() || "root"}
		</text>`;
		svg += `<text x="${x}" y="${
			y + 25
		}" font-family="Arial" font-size="10" text-anchor="middle" fill="#666">
			${structure.type}
		</text>`;

		// Children
		if (structure.children && structure.children.length > 0) {
			const startX = x - ((structure.children.length - 1) * childSpacing) / 2;

			structure.children.forEach((child, index) => {
				const childX = startX + index * childSpacing;
				const childY = y + levelHeight;

				// Connection line
				svg += `<line x1="${x}" y1="${y + 8}" x2="${childX}" y2="${
					childY - 8
				}" stroke="#9E9E9E" stroke-width="1"/>`;

				// Recursive call for child
				svg += this.generateTreeBranches(child, childX, childY, level + 1);
			});
		}

		return svg;
	}

	getTypeColor(type) {
		const colors = {
			object: "#2196F3",
			array: "#4CAF50",
			string: "#FF9800",
			number: "#9C27B0",
			boolean: "#F44336",
			null: "#757575",
		};
		return colors[type] || "#607D8B";
	}

	// Diagram Zoom and Pan Functions
	zoomDiagram(factor) {
		this.diagramZoom *= factor;
		this.diagramZoom = Math.max(0.2, Math.min(3, this.diagramZoom)); // Begrenzen zwischen 20% und 300%
		this.updateDiagramTransform();
		this.updateZoomDisplay();
	}

	resetDiagramZoom() {
		this.diagramZoom = 1;
		this.diagramPanX = 0;
		this.diagramPanY = 0;
		this.updateDiagramTransform();
		this.updateZoomDisplay();
	}

	centerDiagram() {
		this.diagramPanX = 0;
		this.diagramPanY = 0;
		this.updateDiagramTransform();
	}

	updateDiagramTransform() {
		const container = document.querySelector(".diagram-svg-container");
		if (container) {
			container.style.transform = `translate(${this.diagramPanX}px, ${this.diagramPanY}px) scale(${this.diagramZoom})`;
		}
	}

	updateZoomDisplay() {
		const zoomDisplay = document.getElementById("zoomLevel");
		if (zoomDisplay) {
			zoomDisplay.textContent = `${Math.round(this.diagramZoom * 100)}%`;
		}
	}

	setupDiagramPan() {
		const container = document.querySelector(".diagram-svg-container");
		if (!container) return;

		container.addEventListener("mousedown", (e) => {
			this.isDragging = true;
			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;
			container.style.cursor = "grabbing";
		});

		document.addEventListener("mousemove", (e) => {
			if (!this.isDragging) return;

			const deltaX = e.clientX - this.lastMouseX;
			const deltaY = e.clientY - this.lastMouseY;

			this.diagramPanX += deltaX;
			this.diagramPanY += deltaY;

			this.updateDiagramTransform();

			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;
		});

		document.addEventListener("mouseup", () => {
			this.isDragging = false;
			if (container) {
				container.style.cursor = "grab";
			}
		});

		// Scroll-Zoom
		container.addEventListener("wheel", (e) => {
			e.preventDefault();
			const factor = e.deltaY > 0 ? 0.9 : 1.1;
			this.zoomDiagram(factor);
		});
	}

	// Fullscreen Table Functions
	toggleFullscreenTable() {
		if (this.isFullscreen) {
			this.exitFullscreenTable();
		} else {
			this.enterFullscreenTable();
		}
	}

	enterFullscreenTable() {
		const tableSection = document.getElementById("tableSection");
		const fullscreenControls = document.getElementById("fullscreenControls");

		if (!tableSection) return;

		// Add fullscreen classes
		tableSection.classList.add("fullscreen");
		document.body.classList.add("fullscreen-active");

		// Show fullscreen controls
		if (fullscreenControls) {
			fullscreenControls.style.display = "flex";
		}

		// Update button text/icon
		const fullscreenBtn = document.getElementById("fullscreenTableBtn");
		if (fullscreenBtn) {
			fullscreenBtn.innerHTML =
				'<i class="fas fa-compress"></i> Vollbild beenden';
		}

		this.isFullscreen = true;

		// Prevent body scroll
		document.body.style.overflow = "hidden";

		// Force refresh table display with delay to ensure CSS is applied
		setTimeout(() => {
			// Ensure data is present
			console.log("Filtered data length:", this.filteredData.length);
			console.log("Visible columns:", this.visibleColumns);

			// Force complete table rebuild
			this.createTableHeader();
			this.renderTableBody();

			// Force table visibility
			const table = document.getElementById("dataTable");
			const tableContainer = document.querySelector(".table-container");
			if (table) {
				table.style.display = "table";
				table.style.width = "100%";
				table.style.visibility = "visible";
			}
			if (tableContainer) {
				tableContainer.style.display = "block";
				tableContainer.style.visibility = "visible";
			}
		}, 200);

		// Focus on table for keyboard navigation
		tableSection.focus();

		// Add ESC key listener
		this.handleEscapeKey = (e) => {
			if (e.key === "Escape") {
				this.exitFullscreenTable();
			}
		};
		document.addEventListener("keydown", this.handleEscapeKey);
	}

	exitFullscreenTable() {
		const tableSection = document.getElementById("tableSection");
		const fullscreenControls = document.getElementById("fullscreenControls");

		if (!tableSection) return;

		// Remove fullscreen classes
		tableSection.classList.remove("fullscreen");
		document.body.classList.remove("fullscreen-active");

		// Hide fullscreen controls
		if (fullscreenControls) {
			fullscreenControls.style.display = "none";
		}

		// Update button text/icon
		const fullscreenBtn = document.getElementById("fullscreenTableBtn");
		if (fullscreenBtn) {
			fullscreenBtn.innerHTML =
				'<i class="fas fa-expand"></i> Vollbild-Tabelle';
		}

		this.isFullscreen = false;

		// Restore body scroll
		document.body.style.overflow = "";

		// Re-render table to ensure data is visible in normal mode
		this.renderTableBody();

		// Remove ESC key listener
		if (this.handleEscapeKey) {
			document.removeEventListener("keydown", this.handleEscapeKey);
			this.handleEscapeKey = null;
		}

		// Smooth scroll back to table
		setTimeout(() => {
			tableSection.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}, 100);
	}

	// Theme Management
	setupThemeSelector() {
		const themeSelect = document.getElementById("themeSelect");
		if (themeSelect) {
			// Set initial value
			themeSelect.value = this.currentTheme;

			// Add event listener
			themeSelect.addEventListener("change", (e) => {
				this.changeTheme(e.target.value);
			});
		}
	}

	changeTheme(theme) {
		this.currentTheme = theme;
		this.applyTheme(theme);
		localStorage.setItem("selectedTheme", theme);
	}

	applyTheme(theme) {
		// Remove any existing theme attributes
		document.documentElement.removeAttribute("data-theme");
		document.body.removeAttribute("data-theme");

		// Set the theme attribute on the document root (html element)
		document.documentElement.setAttribute("data-theme", theme);

		// Update theme selector if it exists
		const themeSelect = document.getElementById("themeSelect");
		if (themeSelect) {
			themeSelect.value = theme;
		}

		console.log(`Theme applied: ${theme}`);
	}
}

// SOFORTIGER TEST - Diese Zeile sollte sofort ausgeführt werden
console.log("=== JSON VISUALIZER SCRIPT GELADEN ===");
alert("JavaScript lädt - Debug Test"); // Temporärer Test

// App initialisieren wenn DOM geladen ist
document.addEventListener("DOMContentLoaded", () => {
	console.log("=== DOM CONTENT LOADED ===");
	alert("DOM geladen - initialisiere App"); // Temporärer Test
	try {
		const app = new JSONVisualizer();
		console.log("=== JSON VISUALIZER INITIALISIERT ===");
		alert("App erfolgreich initialisiert"); // Temporärer Test
	} catch (error) {
		console.error("=== FEHLER BEI INITIALISIERUNG ===", error);
		alert("FEHLER: " + error.message); // Temporärer Test
	}
});

// Fallback: Initialisierung auch wenn DOM bereits geladen ist
if (document.readyState === "loading") {
	// DOM wird noch geladen, warte auf DOMContentLoaded
	console.log("DOM wird noch geladen...");
} else {
	// DOM ist bereits geladen
	console.log("DOM bereits geladen, initialisiere sofort...");
	try {
		const app = new JSONVisualizer();
		console.log("=== JSON VISUALIZER SOFORT INITIALISIERT ===");
	} catch (error) {
		console.error("=== FEHLER BEI SOFORT-INITIALISIERUNG ===", error);
	}
}
