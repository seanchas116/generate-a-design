"use client";

import OpenAI from "openai";
import dedent from "dedent";
import { observable, makeObservable, runInAction } from "mobx";

class Preferences {
  constructor() {}

  get apiKey(): string {
    return localStorage.getItem("openai-api-key") || "";
  }

  set apiKey(apiKey: string) {
    localStorage.setItem("openai-api-key", apiKey);
  }
}

const preferences = new Preferences();

const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
  role: "system",
  content: dedent`You are a very talented Web designer from 2023.
    Generate a modern fancy beautiful UI design for user input.
    
    In the first response, generate the outline of the website content.
    
    In the second response, generate the wireframe in HTML code.
    
    In the third response, generate the final take of the HTML code.
    
    Use many images. <img> tags contain width, height and detailed alt text for DALL-E.
    Utilize elements with background images. Emit bg-[url(...)] classes.

    Generate clean and modern design. Do not generate unnecessary shadow.

    Output format: HTML with Tailwind classes
    Output without <html> and <body> tags.
  `,
};

class ChatGenerator {
  constructor() {
    makeObservable(this);
  }

  @observable _apiKey = preferences.apiKey;

  readonly generators = [
    new SingleGenerator(() => this.openAI),
    new SingleGenerator(() => this.openAI),
    new SingleGenerator(() => this.openAI),
  ];

  get apiKey() {
    return this._apiKey;
  }

  set apiKey(apiKey: string) {
    this._apiKey = apiKey;
    preferences.apiKey = apiKey;
  }

  get openAI() {
    return new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }
}

class SingleGenerator {
  constructor(getOpenAI: () => OpenAI) {
    this.getOpenAI = getOpenAI;
    makeObservable(this);
  }

  readonly getOpenAI: () => OpenAI;
  @observable result = "";
  @observable progress = 0;
  @observable isRunning = false;

  get openAI() {
    return this.getOpenAI();
  }

  async generate(prompt: string) {
    try {
      this.progress = 0;
      this.isRunning = true;

      const outline = await this.generateOutline(prompt);
      runInAction(() => {
        this.progress = 50;
      });

      const wireframe = await this.generateWireframe(prompt, outline);

      const result = getHTMLInOutput(wireframe) ?? "";
      runInAction(() => {
        this.progress = 100;
        this.result = result;
      });
    } finally {
      runInAction(() => {
        this.isRunning = false;
      });
    }
  }

  async generateOutline(prompt: string) {
    const stream = await this.openAI.chat.completions.create({
      model: "gpt-4-turbo-preview",
      max_tokens: 4095,
      messages: [
        systemMessage,
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
    });
    return collectStream(stream);
  }

  async generateWireframe(prompt: string, outline: string) {
    const stream = await this.openAI.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        systemMessage,
        {
          role: "user",
          content: prompt,
        },
        {
          role: "assistant",
          content: outline,
        },
      ],
      stream: true,
    });
    return collectStream(stream);
  }
}

async function collectStream(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
): Promise<string> {
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk.choices[0]?.delta?.content || "");
  }

  return chunks.join("");
}

function getHTMLInOutput(output: string): string | undefined {
  // Find ```html\n${output}\n```
  const match = output.match(/```html\n([\s\S]+?)\n```/);
  if (match) {
    return match[1];
  }
}

export const generator = new ChatGenerator();
