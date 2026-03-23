// Sample prompts (used in input suggestions)
export const samplePrompts = [
  "Create a function that reverses a string",
  "Implement a todo list component in React",
  "Write a Python script to download files from URL",
  "Create a REST API endpoint for user authentication",
];

// Sample correct code
export const sampleCode = `// Sample: Fibonacci function
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

// Sample buggy code (for debugging feature)
export const sampleBuggyCode = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}`;

// Supported languages
export const languages = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
];