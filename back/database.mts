import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { validateSessionId } from "./util/session_management.mts";
import { Maybe } from "true-myth";

// TODO: test if validateSessionId works if __Host-Http-sessionid doesn't exist

enum Permission {
    OwnerOnly = "owner_only",
    Everyone = "everyone"
};
type Data = {
    content: string,
    owner: string,
    read: Permission,
    write: Permission,
    delete: Permission
};

const store = getStore("data");

async function getData(path: string): Promise<Maybe<Data>> {
    const data = await store.get(path, { consistency: "strong", type: "json" });
    if (data === null) return Maybe.nothing();
    else return Maybe.just(data);
}
async function setData(path: string, data: Data) {
    await store.setJSON(path, data);
}

const actions: { readonly [action: string]: (req: Request, context: Context) => Promise<Response> } = {
    async get(req, context) {
        let body: { path: string };
        try {
            body = await req.json();
            if (body.path === undefined) throw "";
        } catch (err) {
            return new Response("Corpo mal-formado", { status: 400 });
        }

        return await (await getData(body.path)).match({
            async Nothing() {
                return new Response("Dados inexistentes", { status: 404 });
            },
            async Just(data) {
                if (data.read === Permission.Everyone) {
                    return new Response(JSON.stringify(data), { status: 200 });
                }
                return (await validateSessionId(context)).match({
                    Nothing() {
                        return new Response("Autenticação necessária", { status: 401 });
                    },
                    Just(username) {
                        if (username !== data.owner) {
                            return new Response("Não autorizado", { status: 403 });
                        }
                        return new Response(JSON.stringify(data), { status: 200 });
                    }
                });
            }
        });
    },

    async edit(req, context) {
        let body: { path: string, content?: string };
        try {
            body = await req.json();
            if (body.path === undefined) throw "";
        } catch (err) {
            return new Response("Corpo mal-formado", { status: 400 });
        }

        return await (await getData(body.path)).match({
            async Nothing() {
                return new Response("Dados inexistentes", { status: 404 });
            },
            async Just(data) {
                if (data.write === Permission.Everyone) {
                    data.content = body.content ?? "";
                    setData(body.path, data);
                    return new Response("", { status: 200 });
                }
                return await (await validateSessionId(context)).match({
                    async Nothing() {
                        return new Response("Autenticação necessária", { status: 401 });
                    },
                    async Just(username) {
                        if (username !== data.owner) {
                            return new Response("Não autorizado", { status: 403 });
                        }
                        data.content = body.content ?? "";
                        setData(body.path, data);
                        return new Response("", { status: 200 });
                    }
                });
            }
        });
    },

    async create(req, context) {
        let body: {
            path: string,
            content?: string,
            read?: string,
            write?: string,
            delete?: string
        };

        try {
            body = await req.json();
            if (body.path === undefined) throw "";
        } catch (err) {
            return new Response("Corpo mal-formado", { status: 400 });
        }

        if ((await getData(body.path)).isJust) {
            return new Response("Dados já existem", { status: 409 });
        }

        return await (await validateSessionId(context)).match({
            async Nothing() {
                return new Response("Não autenticado", { status: 401 });
            },
            async Just(username) {
                const data: Data = {
                    owner: username,
                    content: body.content ?? "",
                    read: body.read === "everyone" ? Permission.Everyone : Permission.OwnerOnly,
                    write: body.write === "everyone" ? Permission.Everyone : Permission.OwnerOnly,
                    delete: body.delete === "everyone" ? Permission.Everyone : Permission.OwnerOnly,
                };
                setData(body.path, data);
                return new Response("", { status: 200 });
            }
        });
    },

    async delete(req, context) {
        let body: { path: string };

        try {
            body = await req.json();
            if (body.path === undefined) throw "";
        } catch (err) {
            return new Response("Corpo mal-formado", { status: 400 });
        }

        return await (await getData(body.path)).match({
            async Nothing() {
                return new Response("Dados inexistentes", { status: 404 });
            },
            async Just(data) {
                if (data.write = Permission.Everyone) {
                    await store.delete(body.path);
                    return new Response("", { status: 200 });
                }
                return await (await validateSessionId(context)).match({
                    async Nothing() {
                        return new Response("Autenticação necessária", { status: 401 });
                    },
                    async Just(username) {
                        if (data.owner !== username) {
                            return new Response("Não autorizado", { status: 403 });
                        }
                        await store.delete(body.path);
                        return new Response("", { status: 200 });
                    }
                });
            }
        });
    }
};

export default async (req: Request, context: Context) => {
    const action = context.params["action"]!.split(".")[0].split("/")[0];
    const response = await actions[action]?.(req, context);
    return response ?? new Response("Ação inexistente", { status: 404 });
};

export const config: Config = {
    path: "/api/db/:action/*?"
};
