(function () {
    "use strict";

    var boardElement = document.getElementById("sudoku-board");
    var headerElement = document.getElementById("game-header");
    var headerToggle = document.getElementById("toggle-header");
    var puzzleNumberElement = document.getElementById("puzzle-number");
    var statusElement = document.getElementById("status");
    var errorElement = document.getElementById("load-error");
    var notesButton = document.getElementById("notes");
    var previousButton = document.getElementById("previous");
    var resetButton = document.getElementById("reset");
    var nextButton = document.getElementById("next");

    var puzzles = [];
    var currentPuzzleIndex = 0;
    var notesMode = false;

    function setHeaderVisible(visible) {
        headerElement.hidden = !visible;
        headerToggle.textContent = visible ? "Hide header" : "Show header";
        headerToggle.setAttribute("aria-expanded", visible);
        localStorage.setItem("sudoku-header-visible", visible);
    }

    function createDigitLookup() {
        var letters = "abcdefghi";
        var digits = "123456789".split("");

        for (var index = digits.length - 1; index > 0; index -= 1) {
            var randomIndex = Math.floor(Math.random() * (index + 1));
            var digit = digits[index];
            digits[index] = digits[randomIndex];
            digits[randomIndex] = digit;
        }

        return letters.split("").reduce(function (lookup, letter, index) {
            lookup[letter] = digits[index];
            return lookup;
        }, {});
    }

    function decodeBoard(board, lookup) {
        return board.split("").map(function (character) {
            return character === "." ? character : lookup[character];
        }).join("");
    }

    function parsePuzzles(csv) {
        return csv.trim().split(/\r?\n/).slice(1).map(function (line) {
            var fields = line.split(",");
            return {
                puzzle: fields[0],
                solution: fields[1]
            };
        }).filter(function (entry) {
            return /^[a-i.]{81}$/.test(entry.puzzle) &&
                /^[a-i]{81}$/.test(entry.solution);
        }).map(function (entry) {
            var lookup = createDigitLookup();
            return {
                puzzle: decodeBoard(entry.puzzle, lookup),
                solution: decodeBoard(entry.solution, lookup)
            };
        });
    }

    function updateStatus() {
        var inputs = boardElement.querySelectorAll(".cell:not(.given) .square");
        var completed = Array.prototype.every.call(inputs, function (input) {
            return input.value === input.dataset.answer;
        });

        statusElement.classList.toggle("complete", completed);
        statusElement.textContent = completed ? "Puzzle complete." : "Incorrect entries appear in red.";
    }

    function setNotesMode(enabled) {
        notesMode = enabled;
        notesButton.classList.toggle("active", enabled);
        notesButton.setAttribute("aria-pressed", enabled);
    }

    function renderNotes(input) {
        var notes = input.dataset.notes || "";
        var noteElements = input.parentElement.querySelectorAll(".note");

        Array.prototype.forEach.call(noteElements, function (noteElement, index) {
            var digit = String(index + 1);
            noteElement.textContent = notes.includes(digit) ? digit : "";
        });

        input.parentElement.classList.toggle("has-notes", notes !== "" && input.value === "");
    }

    function toggleNote(input, digit) {
        var notes = input.dataset.notes || "";

        input.dataset.notes = notes.includes(digit) ?
            notes.replace(digit, "") :
            (notes + digit).split("").sort().join("");
        input.value = "";
        input.classList.remove("incorrect");
        input.setAttribute("aria-invalid", "false");
        renderNotes(input);
        updateStatus();
    }

    function removePeerNotes(input, digit) {
        var index = Number(input.dataset.cellIndex);
        var row = Math.floor(index / 9);
        var column = index % 9;

        Array.prototype.forEach.call(boardElement.querySelectorAll(".square"), function (peer) {
            var peerIndex = Number(peer.dataset.cellIndex);
            var peerRow = Math.floor(peerIndex / 9);
            var peerColumn = peerIndex % 9;
            var sameBox = Math.floor(peerRow / 3) === Math.floor(row / 3) &&
                Math.floor(peerColumn / 3) === Math.floor(column / 3);

            if (peer !== input && (peerRow === row || peerColumn === column || sameBox) &&
                    (peer.dataset.notes || "").includes(digit)) {
                peer.dataset.notes = peer.dataset.notes.replace(digit, "");
                renderNotes(peer);
            }
        });
    }

    function handleInput(event) {
        var input = event.target;
        input.value = input.value.replace(/[^1-9]/g, "").slice(-1);

        if (notesMode && input.value !== "") {
            toggleNote(input, input.value);
            return;
        }

        input.classList.toggle(
            "incorrect",
            input.value !== "" && input.value !== input.dataset.answer
        );
        input.setAttribute("aria-invalid", input.classList.contains("incorrect"));
        if (input.value === input.dataset.answer) {
            input.dataset.notes = "";
            renderNotes(input);
            removePeerNotes(input, input.value);
        } else if (input.value === "") {
            renderNotes(input);
        } else {
            input.parentElement.classList.remove("has-notes");
        }

        updateStatus();
    }

    function handleNavigation(event) {
        var input = event.target;
        var index = Number(input.dataset.cellIndex);
        var row = Math.floor(index / 9);
        var column = index % 9;
        var nextIndex = index;

        if (notesMode && !input.readOnly && /^[1-9]$/.test(event.key)) {
            event.preventDefault();
            toggleNote(input, event.key);
            return;
        }

        if (event.key === "ArrowUp" && row > 0) {
            nextIndex -= 9;
        } else if (event.key === "ArrowDown" && row < 8) {
            nextIndex += 9;
        } else if (event.key === "ArrowLeft" && column > 0) {
            nextIndex -= 1;
        } else if (event.key === "ArrowRight" && column < 8) {
            nextIndex += 1;
        } else if (!event.key.startsWith("Arrow")) {
            return;
        }

        event.preventDefault();

        if (nextIndex !== index) {
            boardElement.querySelector('[data-cell-index="' + nextIndex + '"]').focus();
        }
    }

    function renderPuzzle() {
        var entry = puzzles[currentPuzzleIndex];
        boardElement.replaceChildren();

        for (var index = 0; index < 81; index += 1) {
            var cell = document.createElement("div");
            var input = document.createElement("input");
            var notes = document.createElement("span");
            var row = Math.floor(index / 9) + 1;
            var column = index % 9 + 1;
            var isGiven = entry.puzzle[index] !== ".";

            cell.className = "cell" + (isGiven ? " given" : "");
            cell.setAttribute("role", "gridcell");
            notes.className = "cell-notes";
            notes.setAttribute("aria-hidden", "true");

            for (var noteIndex = 1; noteIndex <= 9; noteIndex += 1) {
                var note = document.createElement("span");
                note.className = "note";
                notes.appendChild(note);
            }

            input.className = "square";
            input.type = "text";
            input.inputMode = "numeric";
            input.pattern = "[1-9]";
            input.maxLength = 1;
            input.value = isGiven ? entry.puzzle[index] : "";
            input.readOnly = isGiven;
            input.dataset.answer = entry.solution[index];
            input.dataset.cellIndex = index;
            input.dataset.notes = "";
            input.setAttribute("aria-label", "Row " + row + ", column " + column);
            input.addEventListener("keydown", handleNavigation);

            if (!isGiven) {
                input.addEventListener("input", handleInput);
            }

            cell.appendChild(notes);
            cell.appendChild(input);
            boardElement.appendChild(cell);
        }

        puzzleNumberElement.textContent = (currentPuzzleIndex + 1) + " / " + puzzles.length;
        previousButton.disabled = currentPuzzleIndex === 0;
        nextButton.disabled = currentPuzzleIndex === puzzles.length - 1;
        updateStatus();
    }

    function loadPuzzle(index) {
        currentPuzzleIndex = index;
        renderPuzzle();
    }

    headerToggle.addEventListener("click", function () {
        setHeaderVisible(headerElement.hidden);
    });

    setHeaderVisible(localStorage.getItem("sudoku-header-visible") !== "false");

    notesButton.addEventListener("click", function () {
        setNotesMode(!notesMode);
    });

    previousButton.addEventListener("click", function () {
        if (currentPuzzleIndex > 0) {
            loadPuzzle(currentPuzzleIndex - 1);
        }
    });

    resetButton.addEventListener("click", function () {
        renderPuzzle();
    });

    nextButton.addEventListener("click", function () {
        if (currentPuzzleIndex < puzzles.length - 1) {
            loadPuzzle(currentPuzzleIndex + 1);
        }
    });

    fetch("../puzzle.txt", { cache: "no-store" })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Unable to load puzzle file");
            }
            return response.text();
        })
        .then(function (csv) {
            puzzles = parsePuzzles(csv);
            if (puzzles.length === 0) {
                throw new Error("No valid puzzles found");
            }
            renderPuzzle();
        })
        .catch(function (error) {
            console.error(error);
            boardElement.hidden = true;
            statusElement.textContent = "";
            errorElement.hidden = false;
            previousButton.disabled = true;
            resetButton.disabled = true;
            nextButton.disabled = true;
        });
}());
