// Week 1 of the company programme, broken into one task per day.
// Topics, practical tasks and acceptance criteria are from the programme table; "how" is a suggested route.
export type WeekDay = {
  n: number;
  title: string;
  topics: string[];
  task: string;
  how: string[];
  done: string[]; // acceptance criteria, each one is a tick box
  /** Catch-up: the day in three plain sentences, for someone who missed it or feels lost. */
  summary?: string;
  /** Catch-up: the few ideas to remember from the theory. */
  keyIdeas?: string[];
};

export const WEEK_TITLE = "Week 1: LLM engineering, day by day";

export const WEEK_DAYS: WeekDay[] = [
  {
    n: 1,
    title: "LLM Fundamentals and Model Selection",
    summary: "A language model reads and writes text in small pieces called tokens; everything you send and get back is counted in tokens, which is what you pay for and what limits how much fits in one request. You talk to it through an API with a system message (the rules), a user message (the request) and settings such as temperature (0 gives the most repeatable answers). Models differ in quality, speed, cost and reliability, so you choose one by running the same fixed questions on two of them and comparing.",
    keyIdeas: ["Tokens are the unit of size, cost and the context limit.", "System message for rules, user message for the request; temperature 0 for repeatable answers.", "Handle timeouts, rate limits (429) and server errors; log the time and tokens of every call.", "Choose a model with evidence: the same prompts on two models, compared on quality, speed and cost."],
    topics: [
      "LLM architecture: high-level transformer concepts.",
      "Tokens, tokenization and context windows.",
      "System prompts, user prompts and assistant messages.",
      "Temperature and output generation parameters.",
      "Context length and token limitations.",
      "Model selection: capability, latency, cost and reliability.",
      "LLM APIs: request, response, streaming and error handling.",
      "Multimodal models: text, images and audio overview.",
      "Input/output token costs and usage tracking.",
      "Model limitations and hallucinations.",
    ],
    task: "Build a minimal LLM-backed endpoint or service using any technology stack. Run the same fixed prompt set against at least two model options or configurations, where access permits.",
    how: [
      "Create a new repo for this week (not this tracker). Keep the API key in an environment variable only.",
      "Add one endpoint that sends a prompt to the model and returns the answer, with a timeout and clear handling of 429, 500 and network errors.",
      "Log the latency and the input/output token counts for every call (the API response includes the counts).",
      "Write a fixed set of about 10 prompts and run them against two models. Save the answers, times and token counts to a file.",
      "Write a short recommendation: which model, and why (quality, speed, cost).",
    ],
    done: [
      "Successful API integration",
      "Secure configuration (key kept in the environment, not in code)",
      "Handles timeout and API errors",
      "Captures latency and token usage",
      "Compares outputs on a fixed test set",
      "Recommends a model with reasons",
    ],
  },
  {
    n: 2,
    title: "Advanced Prompt Engineering",
    summary: "How you word the instructions changes the answer. A good prompt states the context, the task, the rules and the exact shape of the answer; examples (one or a few) show what good looks like, asking the model to reason first can help, and big tasks can be split into steps. Anything that comes from a user or a document is data, never an order, and every prompt version is kept as a file and compared on the same fixed test cases.",
    keyIdeas: ["Structure every prompt: context, task, constraints, expected output.", "Zero-, one- and few-shot; reasoning before the answer; split big tasks into steps.", "Text from users and documents is data, never instructions (prompt injection).", "Store prompt versions and compare them on the same cases, more than once."],
    topics: [
      "Zero-shot, one-shot and few-shot prompting.",
      "Role prompting and instruction hierarchy.",
      "Prompt structure: context, task, constraints and expected output.",
      "Reasoning-oriented prompting techniques.",
      "Breaking complex tasks into smaller prompt steps.",
      "Providing examples and reference data in prompts.",
      "Prompt templates, variables and reusable components.",
      "Handling ambiguous requests and asking clarifying questions.",
      "Reducing prompt injection and instruction-conflict risks.",
      "Iterating, testing and improving prompts.",
    ],
    task: "Build a recruitment candidate-analysis assistant. Compare at least three prompt versions using the same job description and candidate profiles.",
    how: [
      "Take one job description and three or four sample candidate profiles (made-up people are fine).",
      "Define a fixed output shape: matched skills, gaps, evidence quotes and a list of things the profile does not say.",
      "Keep each prompt version as its own file (v1, v2, v3) and run all of them on the same inputs.",
      "Tell the model to write \"not stated\" instead of guessing, and to quote the profile for every claim.",
      "Compare the three outputs side by side and note which version is best and why.",
    ],
    done: [
      "Consistent output structure",
      "Prompt versions are stored",
      "Test cases are repeatable",
      "Missing information is identified rather than invented",
      "Output is grounded in supplied candidate evidence",
    ],
  },
  {
    n: 3,
    title: "Structured Outputs and Tool Calling",
    summary: "A model can return data in a fixed shape (structured output) and can ask your program to run a function (tool calling), but it is your code that checks and runs it. Every argument is checked against a schema, the person's permissions are checked, and anything destructive waits for the person's confirmation. Failures are handled cleanly and every call is logged.",
    keyIdeas: ["Structured output: a fixed JSON shape, validated in your code.", "The model only asks for a tool; your code checks and runs it.", "Confirm before anything destructive, and check who is allowed.", "Log every tool call, including the refused ones."],
    topics: [
      "Why structured outputs are useful in LLM applications.",
      "JSON mode and schema-constrained responses.",
      "Defining and validating JSON schemas.",
      "Handling malformed, incomplete and unexpected outputs.",
      "Function/tool calling concepts and workflow.",
      "Defining tool names, descriptions and input parameters.",
      "Passing tool results back to the model.",
      "Multi-step tool calls and orchestration.",
      "Tool errors, retries, timeouts and fallback handling.",
      "Tool permissions and safe execution boundaries.",
    ],
    task: "Build an AI task-management assistant that extracts task details into a schema and calls controlled create, list, and update tools. Require confirmation before destructive actions.",
    how: [
      "Define a task schema (title, due date, priority) and validate the model's output against it; reject or retry bad output.",
      "Define the tools: create, list, update (and delete). The model only asks for a tool; your own code runs it.",
      "Check who the user is and what they may do before running any tool. Reject invalid arguments.",
      "For delete (or anything destructive) stop and ask the user to confirm first.",
      "Write every tool call and its result to a log, and handle tool failures with a clear message.",
    ],
    done: [
      "Schema validation",
      "Invalid arguments handled",
      "Tools execute only in application code",
      "Authentication and permission checks",
      "Tool failures handled",
      "Destructive actions require confirmation",
      "Execution is logged",
    ],
  },
  {
    n: 4,
    title: "LLM Evaluation, Reliability and Guardrails",
    summary: "You cannot improve what you do not measure. Build a fixed set of test cases (normal, incomplete, ambiguous, attacks and edge cases) with the expected behaviour for each, and score the answers automatically. Add guardrails, which are checks in your own code, run the same cases again, compare before and after, and write down what still fails.",
    keyIdeas: ["A fixed evaluation set with the expected behaviour for every case.", "Automatic scoring, run before and after every change.", "Guardrails in code: block unsupported claims and injected orders.", "Write down the failures honestly."],
    topics: [
      "Defining quality criteria and success metrics for LLM features.",
      "Creating representative test datasets and test cases.",
      "Evaluating accuracy, relevance, completeness and consistency.",
      "Using human review and automated evaluation.",
      "Testing edge cases and adversarial inputs.",
      "Identifying and reducing hallucinations.",
      "Input and output validation.",
      "Guardrails for unsafe, irrelevant or policy-violating responses.",
      "Monitoring latency, failures, token usage and cost.",
      "Regression testing prompts and model changes.",
    ],
    task: "Create a 30-case evaluation set for the recruitment assistant: 10 normal, 5 incomplete, 5 ambiguous, 5 adversarial/prompt-injection, and 5 edge cases. Add guardrails and rerun the evaluation.",
    how: [
      "Write the 30 cases in a file. For each one, write down the expected behaviour before running anything.",
      "Build a small runner that sends every case to the assistant and marks pass or fail.",
      "Run it once and keep the result as the \"before\" baseline.",
      "Add guardrails: check the input, validate the output, wrap candidate text so it is treated as data and never as instructions.",
      "Run it again for the \"after\" result, put both in one table, and write down the cases that still fail.",
    ],
    done: [
      "All test categories represented",
      "Expected behaviour defined",
      "Before-and-after results recorded",
      "Failure cases documented",
      "Prompt-injection tests do not override trusted instructions",
      "No unsupported candidate claims",
    ],
  },
  {
    n: 5,
    title: "End-to-End LLM Application",
    summary: "Put it all together into one working application: checked input, the model call, a structured answer that is checked before anyone sees it, and at least two functions your own code runs. Add clear error messages, logging of time and tokens, tests, a README and a demo someone else can follow.",
    keyIdeas: ["One working flow from input to checked output.", "At least two controlled functions in your own code.", "Failure handling, logging and tests.", "A README and a demo someone else can follow."],
    topics: [
      "Understanding the architecture of a basic LLM-powered application.",
      "Connecting an application to an LLM provider API.",
      "Managing API keys and environment configuration securely.",
      "Building the request/response flow from frontend to backend.",
      "Managing conversation history and context.",
      "Implementing streaming responses in the user interface.",
      "Handling loading states, errors, retries and rate limits.",
      "Logging requests and tracking token usage and cost.",
      "Testing the complete application workflow.",
      "Deploying and monitoring a basic LLM application.",
    ],
    task: "Deliver an AI-powered recruitment assistant that analyses supplied candidate profiles against a job description, returns structured, evidence-based output, and uses at least two controlled tools or application functions.",
    how: [
      "Add a simple page where you paste a job description and candidate profiles and press Analyse.",
      "The backend calls the model, streams the answer to the page, and returns a validated, structured result.",
      "Add at least two tools or functions (for example extract skills and score the match) that your code runs.",
      "Add input and output validation, retries for failures, and logs of tokens and latency.",
      "Write tests and a README, and record a short demo. Deploying it is optional.",
    ],
    done: [
      "Working end-to-end flow",
      "Structured and validated response",
      "At least two tools/functions",
      "Input/output validation",
      "Failure handling",
      "Basic logs and token/latency tracking",
      "Tests, documentation, and a demo",
    ],
  },
];

// Stored per person as one small entry per day: wp1:d1 -> [true, false, ...] (one flag per "done" item).
