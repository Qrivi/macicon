import os from "node:os";
import { $ } from "bun";
import Jimp from "jimp";
import { ITunesSearchResponse, type IconMode } from "./types";

interface CleanAppPathArgs {
  appPath: string;
}

export const cleanAppPath = (args: CleanAppPathArgs) => {
  const { appPath } = args;
  return appPath.replace(/[\n/]+$/, "").trim();
};

interface GetLocalIconPathArgs {
  appPath: string;
}

export const getLocalIconPath = async (args: GetLocalIconPathArgs) => {
  const { appPath } = args;
  const xml = await $`plutil -convert xml1 ${cleanAppPath({ appPath })}/Contents/Info.plist -o -`.text();
  const file =
    await $`echo ${xml.toString()} | awk -v RS='<key>CFBundleIconFile</key>' -v FS='<string>|</string>' 'NR>1{print $2}'`.text();

  const iconPath = `${cleanAppPath({ appPath })}/Contents/Resources/${file}`.trim();
  return iconPath.endsWith(".icns") ? iconPath : `${iconPath}.icns`;
};

interface GetIosIconBufferArgs {
  term: string;
  country?: string;
}

export const getIosIconBuffer = async (args: GetIosIconBufferArgs) => {
  const { term, country = "US" } = args;
  try {
    const params = new URLSearchParams({
      media: "software",
      entity: "software,iPadSoftware",
      limit: "1",
      term,
      country,
    });
    const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`);
    const data = ITunesSearchResponse.parse(await response.json());

    if (data.errorMessage) {
      if (data.errorMessage === "Invalid value(s) for key(s): [country]") {
        console.warn(`An error occurred: make sure the country code "${country}" is valid`);
        return;
      }
      if (data.errorMessage === "Invalid value(s) for key(s): [term]") {
        console.warn(`An error occurred: make sure the keyword "${term}" is valid`);
        return;
      }
      console.warn(`An error occurred: ${data.errorMessage}`);
    }

    if (!data.results.length) {
      console.warn(`No results found in the ${country} catalog`);
      return;
    }

    const result = data.results[0];
    console.log(`Found ${result.trackName} by ${result.sellerName} (${result.bundleId})`);

    const download = await fetch(result.artworkUrl512);
    return await download.arrayBuffer();
  } catch (error) {
    console.warn("Failed to look up an iOS app equivalent (are you offline?)");
  }
};

interface GenerateCustomIconArgs {
  appPath: string;
  buffer: ArrayBuffer;
  mode: IconMode;
  scale?: number;
  color?: string;
  outDir?: string;
}

export const generateCustomIcon = async (args: GenerateCustomIconArgs) => {
  const { appPath, buffer, mode, scale = 1, color = "fff", outDir } = args;
  const id = Math.random().toFixed(16).substring(2, 8);
  const iconPath = `${cleanAppPath({ appPath })}/Icon\r`;
  const pngPath = outDir
    ? `${cleanAppPath({ appPath: outDir })}/macicon-${id}`
    : `${os.tmpdir()}/dev.qrivi.macicon/macicon${id}`;

  try {
    console.log("Creating a new icon...");
    await Bun.write(pngPath, buffer);
    await $`sips -s format png ${pngPath}`.quiet();

    // If mode is raw, we don't need to process the image with Jimp
    if (mode !== "raw") {
      const iconSize = 512; // Size of the entire icon
      const iconPadding = 50; // Transparent padding around the icon background (see mask.png)
      const imageSize = (iconSize - iconPadding * 2) * scale; // Size of the image inside the icon
      const imagePosition = (iconSize - imageSize) / 2 - iconPadding; // Offset to center image inside the icon

      const maskBuffer = await Bun.file("assets/mask.png").arrayBuffer();
      const imageBuffer = await Bun.file(pngPath).arrayBuffer();
      const mask = await Jimp.read(Buffer.from(maskBuffer));
      const image = await Jimp.read(Buffer.from(imageBuffer));

      const squaredImage = (await Jimp.create(iconSize, iconSize)).composite(
        mode === "contain" ? image.contain(imageSize, imageSize) : image.cover(imageSize, imageSize),
        imagePosition,
        imagePosition,
      );
      const processedIcon = (await Jimp.create(iconSize, iconSize, `#${color}`)).composite(
        squaredImage,
        iconPadding,
        iconPadding,
      );

      // Iconsur's magic scan algorithm that I would never have come up with on my own
      processedIcon.scan(0, 0, iconSize, iconSize, (x, y) => {
        processedIcon.setPixelColor((mask.getPixelColor(x, y) & processedIcon.getPixelColor(x, y)) >>> 0, x, y);
      });

      await processedIcon.writeAsync(`${pngPath}`);
    }

    if (outDir) {
      console.log("Saving the new icon...");
      await $`sips -z 512 512 ${pngPath} && sips -i ${pngPath}`.quiet();
      await $`sips -s format icns ${pngPath} -o ${pngPath}.icns`.quiet();
      await $`sudo rm -f ${pngPath}`;
      return;
    }

    console.log("Applying the new icon...");
    await $`sips -z 512 512 ${pngPath} && sips -i ${pngPath}`.quiet();
    await $`DeRez -only icns ${pngPath} > ${pngPath}`;
    await $`sudo Rez -append ${pngPath} -o ${iconPath}`;
    await $`sudo SetFile -a C ${appPath}`;
    await $`sudo SetFile -a V ${iconPath}`;
    await $`sudo rm -f "${os.tmpdir()}/dev.qrivi.macicon/*"`;
  } catch (_) {
    console.error("\nCould not process input!\n");
    console.log("Please make sure the input is a valid image file");
    process.exit(1);
  }
};

interface RemoveCustomIconArgs {
  appPath: string;
}

export const removeCustomIcon = async (args: RemoveCustomIconArgs) => {
  const { appPath } = args;
  console.log("Removing custom icon...");

  await $`sudo SetFile -a c ${appPath}`;
  await $`sudo SetFile -a v ${appPath}`;
  await $`sudo rm -f ${cleanAppPath({ appPath })}/Icon\r`;
};

export const clearCaches = async () => {
  console.log("Clearing caches...");

  await $`sudo rm -rf /Library/Caches/com.apple.iconservices.store`;
  await $`sudo killall Dock && sudo killall Finder`;
};
