// Plain-English primer shown at the top of each day's Learn tab. Written to be read in about five minutes
// before you open any link, so the links make sense. General concepts only; no vendor-specific claims.
export type Primer = { big: string; terms: [string, string][]; mistakes: string[] };

export const PRIMERS: Record<number, Primer> = {
  1: {
    big: "Before writing code, be able to say what problem you are solving, for whom, and how you will know it works. An AI feature is just software with one unusual part: a model that gives different answers to the same question. Good design means putting fences around that part.",
    terms: [
      ["LLM", "A program trained on huge amounts of text that predicts the next piece of text. It writes fluent answers whether or not they are true."],
      ["Token", "A chunk of text, roughly three quarters of a word. Models read, write and bill in tokens, and each model has a limit on how many it can handle at once."],
      ["Prompt", "The text you send to the model: your instructions plus any data. Better instructions give better answers."],
      ["ADR", "Architecture Decision Record. A half-page note: what we decided, why, and what we gave up. It stops the team re-arguing old decisions."],
      ["Threat model", "A short list of how your system could be abused, and what stops each one. The OWASP lists are ready-made checklists."],
    ],
    mistakes: ["Jumping to code before agreeing what 'good' looks like.", "Treating the model's answer as a fact instead of a draft.", "Sending secrets or customer data to a model without checking who can see it."],
  },
  2: {
    big: "You do not call a model like a normal function. You write instructions, ask for a specific shape of answer, and check what comes back. Structured output means asking for JSON that matches a schema, so your code can rely on it.",
    terms: [
      ["System prompt", "Standing instructions that set the model's role and rules, sent before the user's message."],
      ["Structured output", "The model is forced to reply in a given format, such as JSON with named fields, so you can parse it safely."],
      ["Provider switch", "Putting the model behind one interface, so you can flip between a cloud model and a local one without changing the rest of the code."],
      ["Local model", "A smaller model you run on your own machine (for example through Ollama). Free to use and private, but less capable."],
      ["Temperature", "A dial for randomness. Low gives steadier answers, high gives more varied ones."],
    ],
    mistakes: ["Parsing free text with string splitting instead of asking for JSON.", "Not handling the case where the reply is invalid or empty.", "Hard-coding one provider everywhere."],
  },
  3: {
    big: "A model cannot look anything up or do anything by itself. Tool calling lets it ask your code to do it. You describe your functions; the model replies 'please call this one with these arguments'; your code runs it and sends the result back. The model never touches your database directly.",
    terms: [
      ["Tool / function", "A normal function of yours that you describe to the model by name, purpose and parameters."],
      ["Tool call", "The model's request to run a tool. It is only a request. Your code decides whether to run it."],
      ["Tool result", "What you send back after running the function. The model then uses it to write the final answer."],
      ["Parameterised query", "A database query where values are passed separately from the SQL text. It stops injection attacks. Always use it."],
      ["Allow-list", "Only the tools and data you explicitly permit. Anything else is refused."],
    ],
    mistakes: ["Letting the model build raw SQL text.", "Running a tool call without validating its arguments.", "Returning huge results that waste tokens."],
  },
  4: {
    big: "To answer questions about your own documents, you first turn them into numbers. An embedding is a list of numbers that captures meaning, so similar text ends up numerically close. You store those lists, and at question time find the closest ones.",
    terms: [
      ["Embedding", "A list of numbers that represents the meaning of a piece of text. Similar meanings give similar numbers."],
      ["Chunking", "Cutting documents into pieces small enough to embed and retrieve. Too big loses detail, too small loses context."],
      ["Vector store", "A place to keep embeddings and search them by closeness. It can be as simple as an in-memory list."],
      ["Cosine similarity", "A score for how close two embeddings are. Higher means more similar."],
      ["Top-k", "Take the k best matches, for example the best 4 chunks."],
    ],
    mistakes: ["Using a different embedding model for questions than for documents.", "Chunks with no overlap, so sentences are cut in half.", "Never checking whether the right chunk is actually retrieved."],
  },
  5: {
    big: "RAG (retrieval-augmented generation) means: find the relevant chunks first, then give them to the model and tell it to answer only from them. Citations show which chunk supported each claim. Evaluation proves it works, instead of hoping.",
    terms: [
      ["RAG", "Retrieve relevant text, then generate an answer using it. Reduces made-up answers and lets the model use private data."],
      ["Grounding", "Making the answer rest on supplied sources rather than the model's memory."],
      ["Citation", "A pointer from a sentence in the answer to the chunk it came from, so a person can check."],
      ["Recall@k", "Of the questions you tested, how often the right chunk appeared in the top k results."],
      ["Fine-tuning vs RAG", "RAG gives the model facts at question time. Fine-tuning changes the model's behaviour or style. Use RAG for knowledge."],
    ],
    mistakes: ["Letting the model answer when retrieval found nothing relevant. Teach it to say 'I do not know'.", "Judging quality by eye on three examples.", "Stuffing every chunk into the prompt."],
  },
  6: {
    big: "An agent is a loop: ask the model what to do, run the tool it chose, give back the result, repeat until it says it is done. The power is also the risk, so for actions with side effects a human must approve first.",
    terms: [
      ["Agent loop", "Model decides, code acts, result goes back, repeat. You write the loop and decide when it stops."],
      ["Human in the loop", "A person approves risky actions (sending, deleting, paying) before they run."],
      ["Max steps", "A hard limit on loop turns, so a confused agent cannot run forever or burn money."],
      ["Idempotent", "Safe to run twice with the same effect as once. Retried actions should be."],
      ["Audit log", "A record of every decision and action, so you can explain what happened afterwards."],
    ],
    mistakes: ["No step limit.", "Letting the agent take irreversible actions without approval.", "No log of what it did and why."],
  },
  7: {
    big: "MCP (Model Context Protocol) is a standard way to expose tools so any compatible AI app can use them. You build a server that lists your tools; a client connects, discovers them, and passes them to the model. Write the tool once, use it from many apps.",
    terms: [
      ["MCP server", "A program that offers tools (and sometimes data) over the protocol."],
      ["MCP client", "The part inside an AI app that connects to servers and calls their tools."],
      ["Transport", "How they talk: standard input and output for local tools, or HTTP for remote ones."],
      ["Tool schema", "The description of a tool's name, purpose and parameters. Clear descriptions make the model pick the right tool."],
      ["Least privilege", "Give a server only the access it needs. A read-only tool should not be able to write."],
    ],
    mistakes: ["Vague tool descriptions, so the model misuses them.", "Exposing a tool that can do far more than needed.", "Trusting tool output as if it were instructions."],
  },
  8: {
    big: "You cannot improve what you do not measure. Evaluation means a fixed set of test questions with known good answers, scored automatically every time you change something. Guardrails are checks that stop bad input and output. CI runs both on every commit.",
    terms: [
      ["Eval set", "A saved list of questions and expected answers or expected sources. Your regression tests for AI."],
      ["LLM as judge", "Using a model to score another model's answer. Useful, but check it against your own judgement first."],
      ["Hallucination", "A confident answer that is not supported by the sources or by reality."],
      ["Guardrail", "A check before or after the model: block secrets, off-topic input, unsafe output, wrong format."],
      ["Prompt injection", "Text in the input or a document that tries to give the model new orders. Treat all retrieved text as untrusted."],
    ],
    mistakes: ["Changing the prompt without re-running the eval set.", "Believing the judge model blindly.", "Letting retrieved documents act as instructions."],
  },
  9: {
    big: "Use AI coding help deliberately: you design and decide, the tool drafts, and you review everything. Then ship it: put it in a container, deploy, and watch it with logs, traces and metrics so you can see failures and cost.",
    terms: [
      ["Container", "Your app plus everything it needs, packaged so it runs the same everywhere."],
      ["Observability", "Being able to see what the system is doing: logs, metrics and traces."],
      ["OpenTelemetry", "A standard way to emit traces and metrics from your app to a monitoring tool."],
      ["Secret", "A key or password. Keep it in a vault or environment variable, never in source code."],
      ["Health check", "A small endpoint that says whether the app is working, used by the host to restart it if not."],
    ],
    mistakes: ["Accepting AI-written code you cannot explain.", "Putting API keys in the repository.", "Deploying with no logging, so failures are invisible."],
  },
  10: {
    big: "Fine-tuning adjusts a model on your examples so it behaves in a particular way. LoRA does this cheaply by training a small add-on instead of the whole model. Today it is an experiment to understand the idea and decide when it is worth it. The capstone package is how you explain the whole project to someone else.",
    terms: [
      ["Fine-tuning", "Further training of a model on your own examples to change its style or behaviour."],
      ["LoRA", "A cheap method that trains a small set of extra weights and leaves the base model frozen."],
      ["Training data", "The examples you teach from. Quality matters far more than quantity."],
      ["When not to fine-tune", "If the problem is missing knowledge, use RAG. If a better prompt fixes it, stop there."],
      ["Capstone package", "README, architecture notes, decisions, eval results and a demo, so a stranger can understand and run it."],
    ],
    mistakes: ["Fine-tuning to add facts, which RAG does better.", "Tiny or messy training data.", "A project nobody else can run from the README."],
  },
};
