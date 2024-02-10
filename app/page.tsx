"use client";

import OpenAI from "openai";
import { useState } from "react";
import { Icon } from "@iconify/react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk-****"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
