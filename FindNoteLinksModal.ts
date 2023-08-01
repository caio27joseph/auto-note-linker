import ANLPlugin from "main";
import { MarkdownView, Modal } from "obsidian";

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
export interface MatchResult {
	match: string;
	before: string;
	after: string;
	line: number;
	index: number;
}

export class FindNoteLinksModal extends Modal {
	plugin: ANLPlugin;
	results: MatchResult[];
	filteredResults: MatchResult[];
	selectAllCheckbox: HTMLInputElement;
	searchBar: HTMLInputElement;
	checkboxMatchMap: Record<string, MatchResult>;

	constructor(plugin: ANLPlugin, results: MatchResult[]) {
		super(plugin.app);
		this.plugin = plugin;
		this.results = results;
		this.filteredResults = results;
		this.checkboxMatchMap = {};
	}
	linkAllSelected() {
		let { contentEl } = this;
		let checkboxes = contentEl.querySelectorAll<HTMLInputElement>(
			".match-element .match-checkbox"
		);

		const activeMarkdownView =
			this.plugin.app.workspace.getActiveViewOfType(MarkdownView);

		if (activeMarkdownView) {
			const editor = activeMarkdownView.editor;
			const doc = editor.getDoc();

			// We're going to create an array of the new contents for each line
			let newLines: string[] = doc.getValue().split("\n");

			checkboxes.forEach((checkbox) => {
				const checkboxId = checkbox.title;
				const match = this.checkboxMatchMap[checkboxId];
				const isChecked = checkbox.checked;
				if (match && isChecked) {
					const linkFormat = `[[${match.match}]]`;

					let lineText = newLines[match.line - 1]; // We get the line from our new array, not the document

					// We make a special regex that matches the spaces before, the match, and the spaces after
					let regex = new RegExp(
						`(${match.before}\\s*)(\\b${match.match}\\b)(\\s*${match.after})`,
						"g"
					);

					// Replace the match with the link format while preserving the original spaces
					lineText = lineText.replace(regex, `$1${linkFormat}$3`);

					newLines[match.line - 1] = lineText; // We update the line in our array, not the document
				}
			});

			// Now we replace the entire document with our new lines
			doc.setValue(newLines.join("\n"));

			// Close the modal
			this.close();
		}
	}

	renderMatch(containerEl: HTMLElement, match: MatchResult, index: number) {
		// Create a div for the entire match element
		let matchEl = containerEl.createDiv({
			cls: "match-element",
		});

		// Create a checkbox with a unique ID
		const title = `checkbox-${Date.now()}-${index}`; // Generate a unique ID based on the current timestamp and the index
		let checkbox = matchEl.createEl("input", {
			type: "checkbox",
			cls: "match-checkbox",
			title,
		}) as HTMLInputElement;

		// Add the checkbox index and its state to the checkboxIdMap
		this.checkboxMatchMap[title] = match;

		// Create the match text with line number
		matchEl.createEl("span", {
			text: `[${String(match.line).padStart(3, "0")} / ${match.index}] `,
			cls: "line-number",
		});
		matchEl.createEl("span", {
			text: `${match.before} `,
		});
		match;
		matchEl.createEl("span", {
			text: `${match.match}`,
			cls: "highlight",
		});
		matchEl.createEl("span", {
			text: ` ${match.after}`,
		});
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: "Found Note Links" });

		// Create controls container with flex layout
		let controlsContainer = contentEl.createDiv({
			cls: "controls-container",
		});

		// Create a "select all" checkbox
		this.selectAllCheckbox = controlsContainer.createEl("input", {
			type: "checkbox",
		}) as HTMLInputElement;
		this.selectAllCheckbox.id = "select-all-checkbox";

		// Add event listener for "mark all" checkbox
		this.selectAllCheckbox.onchange = () => {
			this.toggleSelectAll();
		};

		// Create a search bar
		this.searchBar = controlsContainer.createEl("input", {
			type: "text",
			cls: "search-bar",
			placeholder: "Search...",
		}) as HTMLInputElement;

		// Listen for input to filter results
		this.searchBar.oninput = (event: Event) => {
			let target = event.target as HTMLInputElement;
			this.filterResults(target.value);
		};

		// Create a div for the matches container
		let matchesContainer = contentEl.createDiv({
			cls: "matches-container",
		});

		// Apply margin to the matches container
		matchesContainer.style.marginTop = "20px"; // Adjust the margin as needed
		matchesContainer.style.height = "400px"; // Adjust the height as needed
		matchesContainer.style.paddingRight = "10px"; // Adjust the height as needed
		matchesContainer.style.overflow = "auto";

		// Create a div for the matches
		let matchesContent = matchesContainer.createDiv({
			cls: "matches-content",
		});

		// Render the initial matches
		this.filteredResults.forEach((match, index) => {
			this.renderMatch(matchesContent, match, index);
		});

		// Create the "Link all 'n' notes!" button
		let linkAllButton = this.createButton("Link all 'n' notes!", () => {
			this.linkAllSelected();
		});
		linkAllButton.style.margin = "20px 0"; // Add margin to the button
		contentEl.appendChild(linkAllButton);
	}

	createButton(text: string, onClick: () => void): HTMLButtonElement {
		let button = document.createElement("button");
		button.textContent = text;
		button.style.width = "100%"; // Make the button full width
		button.style.padding = "10px"; // Add padding for larger size
		button.addEventListener("click", onClick);
		return button;
	}

	toggleSelectAll() {
		let { contentEl } = this;
		let checkboxes = contentEl.querySelectorAll<HTMLInputElement>(
			".match-element .match-checkbox"
		);
		let checked = this.selectAllCheckbox.checked;

		checkboxes.forEach((checkbox) => {
			checkbox.checked = checked;
		});
	}
	filterResults(query: string) {
		// Convert the query to lower case for case-insensitive search
		const lowerCaseQuery = query.toLowerCase();

		// Filter the results based on the query
		this.filteredResults = this.results.filter((match) =>
			match.match.toLowerCase().includes(lowerCaseQuery)
		);

		// Clear the checkboxMatchMap
		this.checkboxMatchMap = {};

		// Re-render only the matches with the filtered results
		const matchesContainer = this.contentEl.querySelector(
			".matches-content"
		) as HTMLElement;
		matchesContainer.innerHTML = ""; // Clear previous matches

		this.filteredResults.forEach((match, index) => {
			this.renderMatch(matchesContainer, match, index);
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
