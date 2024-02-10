"use client";

import OpenAI from "openai";
import dedent from "dedent";
import { observable, makeObservable, runInAction } from "mobx";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";

import { Element } from "hast";

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
    
    Use many images. <img> src attributes should be "https://via.placeholder.com/[width]x[height]". alt attributes should include long detailed descriptions for AI generation prompts.

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

      const result = await this.generateImages(
        getHTMLInOutput(wireframe) ?? ""
      );

      // Find img tags and replace with AI generated images

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

  async generateImages(html: string): Promise<string> {
    const tree = fromHtml(html, { fragment: true });

    const visit = async (element: Element) => {
      if (element.tagName === "img") {
        console.log(element.properties.src, element.properties.alt);
        if (element.properties.alt) {
          element.properties.src = await this.generateImage(
            String(element.properties.alt)
          );
        }
      }

      await Promise.all(
        (element.children || []).map(
          (child) => child.type === "element" && visit(child)
        )
      );
    };

    await Promise.all(
      (tree.children || []).map(
        (child) => child.type === "element" && visit(child)
      )
    );

    return toHtml(tree);
  }

  async generateImage(prompt: string) {
    const completion = await this.openAI.images.generate({
      prompt: prompt,
      model: "dall-e-3",
      n: 1,
      response_format: "b64_json",
      size: "512x512",
      style: "vivid",
      quality: "hd",
    });
    return "data:image/png;base64," + completion.data[0].b64_json;
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
