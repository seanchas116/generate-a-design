"use client";

import OpenAI from "openai";
import { useState } from "react";
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

async function generate(options: { apiKey: string; prompt: string }) {
  const openai = new OpenAI({
    apiKey: options.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const stream = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
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
      },
      {
        role: "user",
        content: options.prompt,
      },
    ],
    stream: true,
  });

  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk.choices[0]?.delta?.content || "");
  }

  return chunks.join("");
}

export default function Home() {
  const [apiKey, setApiKey] = useState(preferences.apiKey);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");

  return (
    <main className="text-gray-800">
      <div className="whitespace-pre-wrap">{result}</div>
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
                    value={apiKey}
                    onChange={(event) => {
                      const apiKey = event.target.value;
                      preferences.apiKey = apiKey;
                      setApiKey(apiKey);
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
              const result = await generate({
                apiKey,
                prompt,
              });
              setResult(result);
            }}
          >
            Generate
          </button>
        </div>
      </div>
    </main>
  );
}
