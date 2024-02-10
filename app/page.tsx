"use client";

import OpenAI from "openai";
import { useState } from "react";

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
    <main>
      <div className="border border-gray-200 p-4 rounded-xl">
        <label>OpenAI API Key</label>
        <input
          className="border border-gray-200 p-2 w-full"
          type="text"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </div>
      <div>
        <textarea
          className="border border-gray-200 p-4 w-full rounded-xl"
          value={prompt}
          placeholder="Enter a prompt to generate a design."
          onChange={(event) => setPrompt(event.target.value)}
        />
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
    </main>
  );
}
