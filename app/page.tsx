"use client";

import OpenAI from "openai";
import { useState } from "react";
import { Icon } from "@iconify/react";

function generate(options: { apiKey: string; prompt: string }) {
  const openai = new OpenAI({
    apiKey: options.apiKey,
  });
  console.log("TODO: generate design from prompt");
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");

  return (
    <main className="text-gray-800">
      <div className="border border-gray-200 p-4 rounded-xl">
        <label>OpenAI API Key</label>
        <input
          className="border border-gray-200 p-2 w-full"
          type="text"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </div>
      <div className="fixed bottom-4 left-0 right-0 mx-auto w-[640px] h-32 rounded-2xl shadow-lg">
        <textarea
          className="absolute w-full h-full border border-gray-300 p-4 rounded-2xl resize-none"
          value={prompt}
          placeholder="Enter a prompt to generate a design."
          onChange={(event) => setPrompt(event.target.value)}
        />
        <div className="absolute right-2 bottom-2 flex gap-2 items-center">
          <button className="p-2">
            <Icon icon="lucide:settings" />
          </button>
          <button
            className="bg-blue-500 text-white p-2 rounded-xl"
            onClick={() => {
              generate({
                apiKey,
                prompt,
              });
            }}
          >
            Generate
          </button>
        </div>
      </div>
    </main>
  );
}
