import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { validateSessionId } from "./util/session_management.mts";

// TODO: test if validateSessionId works if __Host-Http-sessionid doesn't exist

enum Permission {
    OwnerOnly,
    Everyone
};
type Data = {
    content: string,
    owner: string,
    read: Permission,
    write: Permission,
    delete: Permission
};

const store = getStore("data");

const actions: { readonly [action: string]: (req: Request, context: Context) => Promise<Response> } = {
    async get(req, context) {
        const body = await req.json();
        if (body.path === undefined) {
            return new Response("Bad request.", { status: 404 });
        }
        const data = await store.get(body.path, { consistency: "strong", type: "json" });
        const username = await validateSessionId(context);
        return await username.match({
            async Just(username) {},
            async Nothing() {
                return new Response("");
            }
        });
    }
};

export default async (req: Request, context: Context) => {
};

export const config: Config = {
    path: "/api/db/:action"
};
