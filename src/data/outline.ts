// Source: "FDE Training Outline" (company PDF, also in /docs). Wording shortened, content unchanged.
export const WEEKS = [
  { n: 1, focus: "Baseline and FDE foundations", output: "Baseline assessment; problem discovery, solution design, APIs, data, quality and security fundamentals" },
  { n: 2, focus: "LLM engineering", output: "Working application feature using an LLM, structured outputs and tool calling" },
  { n: 3, focus: "RAG and vector databases", output: "Document-based assistant with retrieval, relevant sources and citations" },
  { n: 4, focus: "Agents and MCP", output: "Multi-step agent or workflow connected to tools or APIs, with appropriate human oversight" },
  { n: 5, focus: "Agentic development and production readiness", output: "AI-assisted feature delivery with tests, review, security and deployment practices" },
  { n: 6, focus: "Individual capstone and evaluation", output: "Demonstrable end-to-end solution, technical documentation and final presentation" },
];
export const EXPECT = [
  "Understand business problems: ask the right questions and find the actual problem.",
  "Design solutions: architecture, workflows, APIs, database designs and integration plans.",
  "Build AI-powered applications with LLMs, RAG, vector databases, agents and MCP.",
  "Own end-to-end delivery: build, test, debug, deploy and maintain with minimal supervision.",
  "Use AI effectively: coding assistants and agentic tools without compromising quality, security or reliability.",
  "Communicate and take ownership: work with stakeholders, explain decisions, manage ambiguity.",
];
export const ESSENTIAL = [
  ["LLM integration", "Work with models such as GPT, Claude and Gemini through APIs."],
  ["Prompt engineering", "System prompts, structured outputs, multi-step prompting."],
  ["RAG", "Retrieve from company documents, databases and knowledge bases."],
  ["Vector databases", "Embeddings, semantic search, chunking, retrieval and relevance."],
  ["Agent development", "Reason through tasks, use tools, call APIs, run multi-step workflows."],
  ["MCP", "Build and integrate MCP servers and clients."],
  ["AI evaluation", "Test hallucinations, accuracy, reliability and output quality."],
  ["AI application deployment", "Deploy, monitor, secure and maintain AI-powered applications."],
];
export const WORKING = [
  "Fine-tuning existing models with LoRA or QLoRA.",
  "Model training, datasets, tokenization and evaluation.",
  "When to use fine-tuning versus RAG versus prompt engineering.",
  "Open-source models and self-hosted LLMs.",
  "Inference cost, latency, context windows and model selection.",
];
export const NOT_MANDATORY = [
  "Training an LLM from scratch.", "Foundational neural network architectures.", "Advanced mathematics behind deep learning.",
  "Distributed GPU training and large-scale model infrastructure.", "Developing custom foundation models.",
];
export const FORMAT = [
  ["Duration", "6 weeks"],
  ["Protected learning time", "3 hours per working day, 15 hours a week, 90 hours in total"],
  ["Approach", "Structured self-learning, hands-on assignments and internal mentoring"],
  ["Capstone", "One individual, end-to-end project per participant"],
  ["Tracking", "Central tracker for progress, assessments and readiness"],
  ["Mix", "About 70% common FDE and AI learning, 30% stack-specific (Python, Node.js, Java/Spring Boot or .NET)"],
];
