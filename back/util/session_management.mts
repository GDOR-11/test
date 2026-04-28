import { getStore } from "@netlify/blobs";
import { Context } from "@netlify/functions";
import Crypto from "crypto";
import { Maybe } from "true-myth";

type Session = {
    username: string,
    expiration: number
};

const sessions = getStore("sessions");

async function getSession(session_id: string): Promise<Session | null> {
    return await sessions.get(session_id, { consistency: "strong", type: "json" }) as Session | null;
}
async function setSession(session_id: string, session: Session) {
    await sessions.setJSON(session_id, session);
}

export async function cleanSessions() {
    for (let { key: session_id } of (await sessions.list()).blobs) {
        if (Date.now() > (await getSession(session_id))!.expiration) {
            await sessions.delete(session_id);
        }
    }
}

export async function generateSessionId(username: string): Promise<string> {
    let session_id: string;
    do {
        session_id = Crypto.randomInt(99999999999999).toString().padStart(14, "0");
    } while (await getSession(session_id) !== null);
    await setSession(session_id, {
        username,
        expiration: Date.now() + 604800000
    });
    return session_id;
}
export function setCookies(context: Context, session_id: string) {
    context.cookies.set({
        name: "__Host-Http-sessionid",
        value: session_id,
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Strict",
        maxAge: 604800
    });
}
export async function validateSessionId(context: Context): Promise<Maybe<string>> {
    const session_id = context.cookies.get("__Host-Http-sessionid");
    if (session_id === undefined) return Maybe.nothing();

    const session = await getSession(session_id);
    if (session === null || Date.now() > session.expiration) return Maybe.nothing();

    return Maybe.just(session.username);
}
