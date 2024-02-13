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

    In the third response, generate the HTML code with fanciest design and wording.

    Use many images. <img> src attributes should be "https://picsum.photos/[width]/[height]". 
    Set long detailed descriptions for images for later AI generation. Set them to alt attribute (for <img>) or aria-label (for background images).

    Generate clean and modern design. Do not generate unnecessary shadow.

    Output format: HTML with Tailwind classes. Generate minified HTML without html/body tags.
    Always output code. Do not output complains or errors.
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
        this.progress = 33;
      });
      console.log(outline);

      const wireframe = await this.generateWireframe(prompt, outline);
      runInAction(() => {
        this.result = getHTMLInOutput(wireframe) ?? "";
        console.log(wireframe);
        this.progress = 66;
      });

      const takes = [wireframe];

      for (let i = 0; i < 1; i++) {
        const result = await this.generateFinalHTML(prompt, outline, takes);
        console.log(result);
        takes.push(result);
        this.result = getHTMLInOutput(result) ?? "";
      }

      this.result = await this.generateImages(this.result);

      runInAction(() => {
        this.progress = 100;
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
        if (element.properties.src) {
          // src should be https://picsum.photos/[width]/[height]
          // get width and height
          const src = element.properties.src as string;
          const match = src.match(/picsum\.photos\/(\d+)\/(\d+)/);
          const match2 = src.match(/picsum\.photos\/(\d+)/);
          if (match) {
            const width = match[1];
            const height = match[2];
            console.log(width, height);
            element.properties.width = width;
            element.properties.height = height;
          } else if (match2) {
            const width = match2[1];
            console.log(width);
            element.properties.width = width;
          }
        }

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
    // const completion = await this.openAI.images.generate({
    //   prompt: prompt,
    //   model: "dall-e-3",
    //   n: 1,
    //   response_format: "b64_json",
    //   size: "1024x1024",
    //   style: "vivid",
    //   quality: "hd",
    // });
    // await new Promise((resolve) => setTimeout(resolve, 20000)); // 5 images per minute
    // return "data:image/png;base64," + completion.data[0].b64_json;

    const engineId = "stable-diffusion-v1-6";
    const apiHost = "https://api.stability.ai";
    const apiKey = process.env.NEXT_PUBLIC_STABILITY_API_KEY;

    const response = await fetch(
      `${apiHost}/v1/generation/${engineId}/text-to-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text_prompts: [{ text: prompt }],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 30,
          samples: 1,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Non-200 response: ${await response.text()}`);
    }

    interface GenerationResponse {
      artifacts: Array<{
        base64: string;
        seed: number;
        finishReason: string;
      }>;
    }

    const responseJSON = (await response.json()) as GenerationResponse;

    const base64 = responseJSON.artifacts[0].base64;

    return "data:image/png;base64," + base64;
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

  async generateFinalHTML(prompt: string, outline: string, takes: string[]) {
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
        ...takes.map((take) => ({
          role: "assistant" as const,
          content: take,
        })),
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
