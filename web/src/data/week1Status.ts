// Build status of the Week 1 project work, per acceptance criterion. Update the flags as tickets are finished.
// "done" means built and checked on its feature branch. It does not mean merged or deployed: see DELIVERY below.
export type Criterion = { text: string; done: boolean; ticket?: string };
export type DayStatus = { n: number; title: string; criteria: Criterion[] };

// A dated snapshot, not a live check: update the date and the states when something is merged or deployed.
export const DELIVERY_AS_OF = "2026-11-19";
export const DELIVERY = [
  { text: "Website (Vercel) and backend (Render), connected", state: "Live: backlog, study notes, feed, roles and batches, assistants" },
  { text: "Days 1 to 5: tool, assistants, evaluations, guardrails", state: "Merged and live; evidence pages for Days 1, 2 and 3" },
  { text: "Day 3 with a real model", state: "Local model: whole flow 5 of 5. Gemini: by hand in AI Studio, passed; still to run through the app" },
  { text: "Day 1, 2 and 4 runs on Gemini", state: "Waiting for the owner's run with their own key" },
];

export const WEEK1_STATUS: DayStatus[] = [
  { n: 1, title: "LLM Fundamentals and Model Selection", criteria: [
    { text: "Successful API integration", done: true },
    { text: "Secure configuration", done: true },
    { text: "Handles timeout and API errors", done: true },
    { text: "Captures latency and token usage", done: true },
    { text: "Compares outputs on a fixed test set", done: true, ticket: "A1" },
    { text: "Recommends a model with reasons", done: true, ticket: "A1" },
  ] },
  { n: 2, title: "Advanced Prompt Engineering", criteria: [
    { text: "Consistent output structure", done: true },
    { text: "Prompt versions are stored", done: true },
    { text: "Test cases are repeatable (fixed cases, each version run twice)", done: true, ticket: "A2" },
    { text: "Four prompt versions compared on the same inputs", done: true, ticket: "A2" },
    { text: "Missing information is identified rather than invented", done: true },
    { text: "Output is grounded in supplied candidate evidence", done: true },
  ] },
  { n: 3, title: "Structured Outputs and Tool Calling", criteria: [
    { text: "Schema validation", done: true, ticket: "B2" },
    { text: "Invalid arguments handled", done: true, ticket: "B2" },
    { text: "Tools execute only in application code", done: true, ticket: "B1" },
    { text: "Authentication and permission checks", done: true, ticket: "B1" },
    { text: "Tool failures handled", done: true, ticket: "B2" },
    { text: "Destructive actions require confirmation", done: true, ticket: "B2" },
    { text: "Execution is logged", done: true, ticket: "B1" },
  ] },
  { n: 4, title: "LLM Evaluation, Reliability and Guardrails", criteria: [
    { text: "All test categories represented (30 cases)", done: true, ticket: "C1" },
    { text: "Expected behaviour defined", done: true, ticket: "C1" },
    { text: "Before-and-after results recorded", done: true, ticket: "C2" },
    { text: "Failure cases documented", done: true, ticket: "C2" },
    { text: "Prompt-injection tests do not override trusted instructions", done: true, ticket: "C2" },
    { text: "No unsupported candidate claims", done: true, ticket: "C2" },
  ] },
  { n: 5, title: "End-to-End LLM Application", criteria: [
    { text: "Working end-to-end flow", done: true },
    { text: "Structured and validated response", done: true },
    { text: "At least two tools or functions", done: true },
    { text: "Input and output validation", done: true },
    { text: "Failure handling", done: true },
    { text: "Basic logs and token/latency tracking", done: true },
    { text: "Tests", done: true },
    { text: "Documentation and a demo (README section, demo script, report)", done: true, ticket: "D1" },
  ] },
];
