import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
    console.log("BEGIN");
    const store = getStore("data");
    let data = await store.get("data", { type: "text" });
    console.log(data);
    data ??= "0";
    data = Number(data) + 1 + "";
    console.log(data);
    await store.set("data", data);
    console.log("END");
    return new Response("hello, world!\n" + data);
};

export const config: Config = {
    path: "/api/:action"
};
