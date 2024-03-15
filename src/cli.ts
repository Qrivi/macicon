#! /usr/bin/env bun

import os from "node:os";
import { $ } from "bun";
import { program } from "commander";
import { description, name, version } from "../package.json";
import { SetCommandOptions } from "./types";
import { clearCaches, generateCustomIcon, getIosIconBuffer, getLocalIconPath, removeCustomIcon } from "./utils";

const verifyAppPath = async (appPath: string) => {
  // Quick check to make sure we're dealing with a macOS app
  if (!Bun.file(`${appPath}/Contents/Info.plist`).size) {
    console.error("\nCould not find Info.plist!\n");
    console.log(`${appPath} does not seem to point to a valid macOS app.`);
    process.exit(1);
  }
};

program //
  .name(name)
  .description(description)
  .version(version, "-v, --version");

program //
  .command("cache")
  .description("clear the icon cache")
  .action(async () => {
    await clearCaches();

    console.log("Done!");
    process.exit(0);
  });

program //
  .command("unset")
  .description("remove a custom icon from a specific app")
  .argument("<app-path>", "path to app for which to remove its custom icon, e.g. /Applications/Foobar.app")
  .action(async (appPath: string) => {
    verifyAppPath(appPath);
    await removeCustomIcon({ appPath });

    console.log("Done!");
    process.exit(0);
  });

program //
  .command("set")
  .description("generate and set an icon for a specific app")
  .argument("<app-path>", "path to app for which to change its icon, e.g. /Applications/Foobar.app")
  .option("-l, --local", "flag to create an icon locally (skip looking up an equivalent iOS app icon)")
  .option("-k, --keyword <string>", "custom keywords to look up an iOS app (default: the app's name)")
  .option("-r, --region <code>", "ISO-2A country code for the App Store to query (default: 'US')")
  .option("-m, --mode <mode>", "mode of fitting the image inside the icon (default: 'contain')")
  .option("-s, --scale <float>", "scale to apply to locally created icons (default: '0.9', or '1' if mode is 'cover')")
  .option("-c, --color <color>", "hexadecimal background color code for locally created icons (default: 'fff')")
  .option("-i, --input <file-path>", "local or remote image path to use as base for the icon (will apply --local flag)")
  .option("-o, --output <dir-path>", "save the generated icon to a directory, without changing the app (dry run)")
  .action(async (appPath: string, options: SetCommandOptions) => {
    verifyAppPath(appPath);

    // First make sure we haven't been passed bogus options
    const validation = SetCommandOptions.safeParse(options);
    if (!validation.success) {
      console.error("\nInvalid options!\n");
      validation.error.errors.forEach((e) => console.log(e.message));
      process.exit(1);
    }

    // If we're supposed to use an iOS app icon, let's look for one first
    if (!options.local && !options.input) {
      const name = await $`basename ${appPath} | sed 's/.\{4\}$//'`.text();
      console.log(`Looking up an iOS app equivalent for ${name}...`);

      const term = options.keyword || name.replace(/[\n]+$/, "").trim();
      const country = options.region || "US";
      const buffer = await getIosIconBuffer({ term, country });

      if (buffer) {
        const mode = "cover"; // Shouldn't matter because already square icon
        const scale = 1;
        const color = "fff";
        const outDir = options.output;
        await generateCustomIcon({ appPath, buffer, mode, scale, color, outDir });

        console.log("Done!");
        process.exit(0);
      }
      // Fall through if no icon was found in Apple's catalog
    }

    // If we were passed an input image, create a new icon from it
    if (options.input) {
      console.log(`\nGenerating new icon for ${appPath}, based on input image...`);

      const buffer = await (options.input.startsWith("http://") || options.input.startsWith("https://")
        ? await fetch(options.input)
        : Bun.file(options.input)
      ).arrayBuffer();

      // If we get here, we do need to process the image with jimp
      const mode = options.mode || "contain";
      const scale = Number.parseFloat(options.scale || (mode === "cover" ? "1" : ".9"));
      const color = options.color || "fff";
      const outDir = options.output;
      await generateCustomIcon({ appPath, buffer, scale, mode, color, outDir });

      console.log("Done!");
      process.exit(0);
    }

    // Let's create a new icon based on the default one
    console.log(`Generating new icon for ${appPath}, based on existing icon...`);

    const iconPath = await getLocalIconPath({ appPath });
    const buffer = await Bun.file(options.input ?? iconPath).arrayBuffer();
    const mode = options.mode || "contain";
    const scale = Number.parseFloat(options.scale || ".9");
    const color = options.color || "fff";
    const outDir = options.output;
    await generateCustomIcon({ appPath, buffer, mode, scale, color, outDir });

    console.log("Done!");
    process.exit(0);
  });

program.parse(Bun.argv);
