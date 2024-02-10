"use client";

import OpenAI from "openai";
import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import dedent from "dedent";
import { observable, makeObservable, runInAction } from "mobx";
import { observer } from "mobx-react-lite";

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
    
    Use as much image as possible. <img> src attributes should be placeholder image links.
    
    Output format: HTML with Tailwind classes
    Output without <html> and <body> tags.
  `,
};

class ChatGenerator {
  constructor() {
    makeObservable(this);
  }

  @observable _apiKey = preferences.apiKey;
  @observable result = "";

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

  async generate(prompt: string) {
    const outline = await this.generateOutline(prompt);
    const wireframe = await this.generateWireframe(prompt, outline);
    runInAction(() => {
      this.result = getHTMLInOutput(wireframe) ?? "";
    });
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

const Home = observer(function Home() {
  const [prompt, setPrompt] = useState("");
  const generator = useMemo(() => new ChatGenerator(), []);

  return (
    <main className="text-gray-800">
      <iframe
        className="w-screen h-screen"
        srcDoc={`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
  ${generator.result}
  </body>
</html>`}
      />
      <div className="whitespace-pre-wrap">{generator.result}</div>
      <div className="fixed bottom-4 left-0 right-0 mx-auto w-[640px] h-32 rounded-2xl shadow-lg">
        <textarea
          className="absolute w-full h-full border border-gray-300 p-4 rounded-2xl resize-none"
          value={prompt}
          placeholder="Enter a prompt to generate a design."
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="absolute right-2 bottom-2 flex gap-2 items-center">
          <Dialog>
            <DialogTrigger asChild>
              <button className="p-2">
                <Icon icon="lucide:settings" />
              </button>
            </DialogTrigger>
            <DialogContent className="min-w-[640px]">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    OpenAI API Key
                  </Label>
                  <Input
                    className="col-span-3"
                    type="text"
                    value={generator.apiKey}
                    onChange={(event) => {
                      const apiKey = event.target.value;
                      generator.apiKey = apiKey;
                    }}
                    placeholder="sk-****"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Close</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <button
            className="bg-blue-500 text-white p-2 rounded-xl"
            onClick={async () => {
              await generator.generate(prompt);
            }}
          >
            Generate
          </button>
        </div>
      </div>
    </main>
  );
});

export default Home;
