(function () {
    "use strict";

    var boardElement = document.getElementById("sudoku-board");
    var headerElement = document.getElementById("game-header");
    var headerToggle = document.getElementById("toggle-header");
    var puzzleNumberElement = document.getElementById("puzzle-number");
    var statusElement = document.getElementById("status");
    var errorElement = document.getElementById("load-error");
    var previousButton = document.getElementById("previous");
    var resetButton = document.getElementById("reset");
    var nextButton = document.getElementById("next");

    var puzzles = [];
    var currentPuzzleIndex = 0;

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
        var inputs = boardElement.querySelectorAll(".square:not(.given)");
        var completed = Array.prototype.every.call(inputs, function (input) {
            return input.value === input.dataset.answer;
        });

        statusElement.classList.toggle("complete", completed);
        statusElement.textContent = completed ? "Puzzle complete." : "Incorrect entries appear in red.";
    }

    function handleInput(event) {
        var input = event.target;
        input.value = input.value.replace(/[^1-9]/g, "").slice(-1);
        input.classList.toggle(
            "incorrect",
            input.value !== "" && input.value !== input.dataset.answer
        );
        input.setAttribute("aria-invalid", input.classList.contains("incorrect"));
        updateStatus();
    }

    function renderPuzzle() {
        var entry = puzzles[currentPuzzleIndex];
        boardElement.replaceChildren();

        for (var index = 0; index < 81; index += 1) {
            var input = document.createElement("input");
            var row = Math.floor(index / 9) + 1;
            var column = index % 9 + 1;
            var isGiven = entry.puzzle[index] !== ".";

            input.className = "square" + (isGiven ? " given" : "");
            input.type = "text";
            input.inputMode = "numeric";
            input.pattern = "[1-9]";
            input.maxLength = 1;
            input.value = isGiven ? entry.puzzle[index] : "";
            input.readOnly = isGiven;
            input.dataset.answer = entry.solution[index];
            input.setAttribute("role", "gridcell");
            input.setAttribute("aria-label", "Row " + row + ", column " + column);

            if (!isGiven) {
                input.addEventListener("input", handleInput);
            }

            boardElement.appendChild(input);
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
