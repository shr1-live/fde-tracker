// Plain-English study notes for links that are broad hubs or hard to scan.
// Each guide is keyed by the exact URL used in plan.json. Every sub-link below was opened and loaded when added.
export type Guide = {
  what: string;                       // what this page/site actually is
  order: { title: string; url: string; why: string }[]; // exact pages to open, in reading order
  skip?: string;                      // what you can ignore
  time: string;
};

const MS = "https://learn.microsoft.com/en-us/dotnet/ai";
const COURSE = "https://github.com/microsoft/Generative-AI-for-beginners-dotnet/tree/main";

export const GUIDES: Record<string, Guide> = {
  [`${MS}/overview`]: {
    what: "The front door to Microsoft's .NET AI documentation. The overview page itself is short: it explains why use .NET for AI, lists the supported AI providers (OpenAI, Azure OpenAI, Ollama, Gemini, Bedrock) and gives a suggested learning path. The real content is in the pages it links to, so read it in this order.",
    order: [
      { title: "How generative AI and LLMs work", url: `${MS}/conceptual/how-genai-and-llms-work`, why: "The mental model: what a language model is, why it can be wrong, what a prompt does. Read this first." },
      { title: "Connect to and prompt an AI model", url: `${MS}/quickstarts/prompt-model`, why: "Your first working call from C#. Do it, do not just read it." },
      { title: "Understanding tokens", url: `${MS}/conceptual/understanding-tokens`, why: "Why length limits and cost are counted in tokens, not words." },
      { title: "Build an Azure AI chat app", url: `${MS}/quickstarts/build-chat-app`, why: "A complete small chat app. Skim the code, note the structure." },
    ],
    skip: "Skip the left-hand menu for now. It lists dozens of pages (image generation, training, enterprise samples) that this programme does not need yet.",
    time: "About 45 minutes for the four pages.",
  },
  [`${COURSE}/04-AgentsWithMAF`]: {
    what: "Lesson 4 of Microsoft's free 'Generative AI for Beginners (.NET)' course: building an agent with the Microsoft Agent Framework. An agent is a loop that lets the model call your functions until the job is done. The folder holds a written lesson plus runnable C# samples.",
    order: [
      { title: "Open this lesson folder and read its README.md", url: `${COURSE}/04-AgentsWithMAF`, why: "The README explains the idea in plain words before any code." },
      { title: "Agents (.NET AI concepts)", url: `${MS}/conceptual/agents`, why: "The official definition of an agent and when you need one." },
    ],
    skip: "You hand-write the loop first (Day 6), so treat the framework samples as a comparison, not something to copy.",
    time: "30 to 40 minutes.",
  },
  ["https://github.com/microsoft/Generative-AI-for-beginners-dotnet"]: {
    what: "A full free course repository with five lessons plus samples. It is a reference to dip into, not something to read top to bottom. Each lesson is a folder with a README and runnable code.",
    order: [
      { title: "01 Introduction to generative AI", url: `${COURSE}/01-IntroductionToGenerativeAI`, why: "Core ideas. Matches Day 1 and 2." },
      { title: "02 Generative AI techniques", url: `${COURSE}/02-GenerativeAITechniques`, why: "Prompting, chat, structured output. Matches Day 2 to 4." },
      { title: "03 AI patterns and applications", url: `${COURSE}/03-AIPatternsAndApplications`, why: "RAG and common app patterns. Matches Day 4 and 5." },
      { title: "04 Agents with the Agent Framework", url: `${COURSE}/04-AgentsWithMAF`, why: "Agents. Matches Day 6." },
      { title: "05 Responsible AI", url: `${COURSE}/05-ResponsibleAI`, why: "Safety and guardrails. Matches Day 8." },
    ],
    skip: "Ignore the setup scripts, translations and infra folders unless a lesson tells you to use them.",
    time: "Use as a side reference. 20 to 30 minutes per lesson when you reach it.",
  },
  "https://sqlite.org/quickstart.html": {
    what: "SQLite is a database that lives in one file, with no server to install. The official docs site is huge, so you only need three pages for this programme.",
    order: [
      { title: "SQLite quick start", url: "https://sqlite.org/quickstart.html", why: "Create a database, a table, insert and select. 10 minutes." },
      { title: "Datatypes in SQLite", url: "https://sqlite.org/datatype3.html", why: "SQLite is loosely typed. Read why, so a TEXT column holding a number does not surprise you." },
      { title: "Using SQLite from .NET (Microsoft.Data.Sqlite)", url: "https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/", why: "The C# library you will actually call. Open its basics and parameters pages." },
    ],
    skip: "Skip everything about extensions, FTS, WAL internals and the C API.",
    time: "About 30 minutes.",
  },
  "https://modelcontextprotocol.io/docs/getting-started/intro": {
    what: "MCP (Model Context Protocol) is a standard way for an AI app to discover and call tools and data that other programs expose. Think of it as USB for AI tools: one plug shape, many devices. The site has a lot of menus, so read only these.",
    order: [
      { title: "What is MCP?", url: "https://modelcontextprotocol.io/docs/getting-started/intro", why: "One page that explains the idea and the client and server roles." },
      { title: "Architecture overview", url: "https://modelcontextprotocol.io/docs/learn/architecture", why: "Who talks to whom: host, client, server. Needed for Day 7." },
      { title: "Server concepts", url: "https://modelcontextprotocol.io/docs/learn/server-concepts", why: "The three things a server offers: tools, resources, prompts. You build tools." },
    ],
    skip: "Skip the SDK list for other languages, registries and the specification pages.",
    time: "About 30 minutes.",
  },
  "https://github.com/modelcontextprotocol/csharp-sdk": {
    what: "The official C# library for MCP. A GitHub repo page is mostly files, so use it for exactly two things.",
    order: [
      { title: "Read the README on the front page", url: "https://github.com/modelcontextprotocol/csharp-sdk", why: "Install instructions and a minimal server in a few lines." },
      { title: "Browse the samples folder", url: "https://github.com/modelcontextprotocol/csharp-sdk/tree/main/samples", why: "Small runnable examples. Copy the shape of one, then write your own." },
    ],
    skip: "Ignore src, tests and the build files.",
    time: "20 minutes.",
  },
};
