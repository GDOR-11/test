import Crypto from "crypto";
import { Maybe } from "true-myth";

type Session = {
    username: string,
    expiration: number
};

const sessions: { [id: string]: Session } = {};

// delete expired sesssions
setInterval(() => {
    for (let session_id in sessions) {
        if (sessions[session_id].expiration > Date.now()) {
            delete sessions[session_id];
        }
    }
}, 60000);

export function generateSessionId(username: string): string {
    let session_id: string;
    do {
        session_id = Crypto.randomInt(99999999999999).toString().padStart(14, "0");
    } while (sessions[session_id] !== undefined);
    sessions[session_id] = {
        username,
        expiration: Date.now() + 604800000
    };
    return session_id;
}
export function appendSessionCookies(headers: Headers, session_id: string, prev_session_id?: string) {
    headers.append("Set-Cookie", `__Host-Http-sessionid=${session_id}; Path=/; Secure; HttpOnly; SameSite=Strictl; Max-Age=604800`);
    if (prev_session_id) {
        delete sessions[prev_session_id];
        headers.append("Set-Cookie", `__Host-Http-sessionid=${prev_session_id}; Secure; HttpOnly; SameSite=Strict; Max-Age=0`);
    }
}
export function validateSessionId(session_id: string): Maybe<string> {
    const session = sessions[session_id];
    if (!session || session.expiration > Date.now()) return Maybe.nothing();
    return Maybe.just(session.username);
}
