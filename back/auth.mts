import type { Config, Context } from "@netlify/functions";
import { check_user_password, get_user, register_user } from "./util/user_utils.mts";
import { generateSessionId, setCookies, validateSessionId } from "./util/session_management.mts";

const actions: { readonly [action: string]: (req: Request, context: Context) => Promise<Response> } = {
    async register(req, context) {
        const data = (await req.text()).split("&").map(s => s.split("="));
        const username = data.find(pair => pair[0] === "username")![1];
        const password = data.find(pair => pair[0] === "password")![1];

        return (await register_user(username, password)).match({
            async Ok(_user) {
                setCookies(context, await generateSessionId(username));
                return new Response("", {
                    status: 303,
                    headers: { "Location": "/" }
                });
            },
            async Err(_error) {
                return new Response("<h1>nome já existe</h1>", { status: 409 });
            }
        });
    },

    async login(req, context) {
        const data = (await req.text()).split("&").map(s => s.split("="));
        const username = data.find(pair => pair[0] === "username")![1];
        const password = data.find(pair => pair[0] === "password")![1];

        const user = await get_user(username);
        const success = user.map(async user => await check_user_password(user, password));
        return await success.match({
            async Ok(promise) {
                const success = await promise;
                if (success) {
                    setCookies(context, await generateSessionId(username));
                    return new Response("", {
                        status: 303,
                        headers: { "Location": "/" }
                    });
                } else {
                    return new Response("<h1>nome de usuário ou senha errada</h1>", { status: 401 });
                }
            },
            async Err(_error) {
                return new Response("<h1>nome de usuário ou senha errada</h1>", { status: 401 });
            }
        });
    }
};

export default async (req: Request, context: Context) => {
    const response = await actions[context.params["action"]!]?.(req, context);
    return response ?? new Response("q porra q vc ta fazendo", { status: 404 });
};

export const config: Config = {
    path: "/api/auth/:action"
};
