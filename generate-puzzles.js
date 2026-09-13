const fs = require("node:fs");
const sudoku = require("./sudoku.js").sudoku;
const letters = "abcdefghi";

function encodeBoard(board) {
    return board.replace(/[1-9]/g, digit => letters[Number(digit) - 1]);
}

const rows = ["puzzle,solution"];

for (let index = 0; index < 20; index += 1) {
    const puzzle = sudoku.generate("very-hard");
    const solution = sudoku.solve(puzzle);

    if (!solution) {
        throw new Error(`Unable to solve generated puzzle ${index + 1}`);
    }

    rows.push(`${encodeBoard(puzzle)},${encodeBoard(solution)}`);
    console.log(`Generated puzzle ${index + 1}/20`);
}

fs.writeFileSync("puzzle.txt", `${rows.join("\n")}\n`, "utf8");

console.log("Saved 20 puzzles to puzzle.txt");