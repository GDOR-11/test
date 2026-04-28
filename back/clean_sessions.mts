import { Config } from "@netlify/functions";
import { cleanSessions } from "./util/session_management.mts";

export default async () => {
    cleanSessions();
};

export const config: Config = {
    schedule: "* * * * *"
};
