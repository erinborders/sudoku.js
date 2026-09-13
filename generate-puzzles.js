const fs = require("node:fs");
const sudoku = require("./sudoku.js").sudoku;
const letters = "abcdefghi";
const PUZZLE_COUNT = 100;

function encodeBoard(board) {
    return board.replace(/[1-9]/g, digit => letters[Number(digit) - 1]);
}

const rows = ["puzzle,solution"];

for (let index = 0; index < PUZZLE_COUNT; index += 1) {
    const puzzle = sudoku.generate("very-hard");
    const solution = sudoku.solve(puzzle);

    if (!solution) {
        throw new Error(`Unable to solve generated puzzle ${index + 1}`);
    }

    rows.push(`${encodeBoard(puzzle)},${encodeBoard(solution)}`);
    console.log(`Generated puzzle ${index + 1}/${PUZZLE_COUNT}`);
}

fs.writeFileSync("puzzle.txt", `${rows.join("\n")}\n`, "utf8");

console.log(`Saved ${PUZZLE_COUNT} puzzles to puzzle.txt`);