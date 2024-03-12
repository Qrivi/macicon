import { z } from "zod";

export const IconMode = z.enum(["contain", "cover", "raw"]);

export type IconMode = z.infer<typeof IconMode>;

export const SetCommandOptions = z
  .object({
    local: z.boolean(),
    keyword: z.string().refine((value) => value.length > 1 && value.length < 100, {
      message: "Keyword can't be blank and must be less than 100 characters",
    }),
    region: z.string().refine((value) => value.length === 2, {
      message: "Region must be a valid ISO-2A country code",
    }),
    mode: IconMode,
    scale: z.string().refine((value) => !Number.isNaN(Number.parseFloat(value)), {
      message: "Scale must be a valid decimal number",
    }),
    color: z.string().refine((value) => /^([0-9A-Fa-f]{3}){1,2}$/.test(value), {
      message: "Color must be a valid hexadecimal code",
    }),
    input: z.string().refine((value) => value.startsWith("http") || Bun.file(value).size, {
      message: "Input must be a valid local or remote image path",
    }),
    output: z.string(),
  })
  .partial()
  .strict();

export type SetCommandOptions = z.infer<typeof SetCommandOptions>;

export const ITunesSearchResponse = z.object({
  errorMessage: z.string().optional(),
  results: z.array(
    z.object({
      bundleId: z.string(),
      trackName: z.string(),
      sellerName: z.string(),
      artworkUrl512: z.string(),
    }),
  ),
});

export type ITunesSearchResponse = z.infer<typeof ITunesSearchResponse>;
