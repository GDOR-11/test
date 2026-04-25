import type { Config, Context } from "@netlify/functions";
import fs from "fs/promises";

export default async (req: Request, context: Context) => {
    const files = await fs.readdir(".");
    return new Response("hello, world!\n" + files.join(","));
};

export const config: Config = {
    path: "/api/:action"
};
