# macicon

Fast command line tool to generate and apply macOS-styled icons to macOS apps that haven't transitioned to the Big Sur
icon style yet (despite Big Sur being announced in June 2020).

By default, `macicon` attempts to locate a matching iOS application and utilizes its icon. Alternatively, you can supply
an input image by specifying its path or URL. If neither is provided, `macicon` will resort to the application's default
icon. There are options to customize icon artwork scaling and background color.

## Installation

You can either [download the binary](https://github.com/Qrivi/macicon/releases) or install it via Homebrew:

```shell
brew tap qrivi/tap
brew install qrivi/tap/macicon
```

## Manual

The CLI is very similar to [`iconsur`](https://github.com/rikumi/iconsur)'s (in fact, the main reason I wrote this was
because `iconsur` stopped working in March 2024). In contrast to `iconsur`, `macicon` can only set 1 icon at a time.

### `macicon set <app-path>`

> Generate and set an icon for a specific app.

| Option            | Required | Description                                                                                                             |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `<app-path>`      | yes      | Path to the app for which you want to change the icon, e.g., `/Applications/Foobar.app`. Only supports macOS apps.        |
| `-l`, `--local`   | no       | Flag indicating _not_ to search for an equivalent iOS app. Automatically activated when `--input` is set.               |
| `-k`, `--keyword` | no       | Custom keywords to use when searching for an equivalent iOS app. Defaults to the app's name.                            |
| `-r`, `--region`  | no       | ISO-2A country code specifying the iOS app catalog to query. Defaults to `US`.                                          |
| `-m`, `--mode`    | no       | Mode for fitting the input image into the generated icon: `contain`, `cover` or `raw`\*. Defaults to `contain`.         |
| `-s`, `--scale`   | no       | Scale factor applied to the input image. Defaults to `0.9`, or `1` if `--mode` is set to `cover`.                       |
| `-c`, `--color`   | no       | Background color applied to the input image. Should be hexadecimal without the `#` prefix. Defaults to `FFF`.           |
| `-i`, `--input`   | no       | Path (local or URL) to the input image. Should point to an image or icon file. Defaults to the app's default icon file. |
| `-o`, `--output`  | no       | Output directory for the generated icon. Functions as a dry run: the generated icon won't be applied to the app.        |

\* `raw`: In this mode, `macicon` will bypass processing the input image and directly convert it into an icon. This
option proves handy when supplying an `--input` that is already a well-styled icon, such as a link to an icon on
[macosicons.com](https://macosicons.com). Note that `raw` will stretch the input image, so for an optimal outcome:
provide a square image.

### `macicon unset <app-path>`

> Remove a custom icon from a specific app.

| Option       | Required | Description                                                                                                      |
| ------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `<app-path>` | yes      | Path to the app for which you want to change the icon, e.g., `/Applications/Foobar.app`. Only supports macOS apps. |

### `macicon cache`

> Clear the icon cache.

### `macicon help <command>`

> Print instructions on how to use `macicon`.

| Option      | Required | Description                                             |
| ----------- | -------- | ------------------------------------------------------- |
| `<command>` | no       | The command for which to print instructions, eg. `set`. |

## Tip of the day

Add a function to your `.zshrc` to set your custom icons, that you can easily execute in your terminal whenever you
notice an app update reverted your custom icon.

```shell
# Just an example. Adapt to your needs. 👍
function fixicons() {
  cd /Applications
  [ -d "./AltServer.app" ] && macicon set "./AltServer.app" -l -c 4A8B91 -s 0.9
  [ -d "./Citra/canary/citra-qt.app" ] && macicon set "./Citra/canary/citra-qt.app" -l
  [ -d "./Epic Games Launcher.app" ] && macicon set "./Epic Games Launcher.app" -l -s 0.7 -i "/Applications/Epic Games Launcher.app/Contents/Resources/EpicGamesLauncher.icns"
  [ -d "./Find Any File.app" ] && macicon set "./Find Any File.app" -l -m raw -i "https://parsefiles.back4app.com/JPaQcFfEEQ1ePBxbf6wvzkPMEqKYHhPYv8boI1Rc/7325b36e77622375013d54b9a977b5b3_MwO8GD4ws7.icns"
  # etc etc
  macicon cache
  cd -
}
```
