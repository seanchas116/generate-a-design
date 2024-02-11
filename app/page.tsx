"use client";

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
import { observer } from "mobx-react-lite";
import { generator } from "../lib/Generator";
import { action } from "mobx";
import { cn } from "@/lib/utils";

const Home = observer(function Home() {
  const [prompt, setPrompt] = useState(
    "React Developer portfolio website design."
  );

  return (
    <main className="text-gray-800 w-screen h-screen flex flex-col p-4 gap-4">
      <div className="flex-1 self-stretch flex gap-4">
        {
          // 3 times
          generator.generators.map((gen, index) => (
            <div
              key={index}
              className="relative flex flex-1 self-stretch border border-gray-300 rounded-lg overflow-hidden"
            >
              <iframe
                key={index}
                className={cn("w-full h-full", gen.isRunning && "opacity-50")}
                srcDoc={`
                <!DOCTYPE html>
                <html lang="en">
                  <head>
                    <meta charset="UTF-8" />
                    <script src="https://cdn.tailwindcss.com"></script>
                  </head>
                  <body>
                  ${gen.result}
                  </body>
                </html>`}
              />
              {gen.isRunning && (
                <div className="absolute inset-8 m-auto opacity-50">
                  Generating {gen.progress}%
                </div>
              )}
            </div>
          ))
        }
      </div>
      <div className="mx-auto w-[640px] h-32 rounded-2xl shadow-lg relative">
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
            onClick={action(() => {
              for (const gen of generator.generators) {
                gen.generate(prompt);
              }
            })}
          >
            Generate
          </button>
        </div>
      </div>
    </main>
  );
});

export default Home;
