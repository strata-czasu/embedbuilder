import { Database } from "bun:sqlite";

const db = new Database("db.sqlite", { strict: true });


const DATABASE_VERSION = 1;
type UserVersion = { user_version: number };

function migrate() {
    let { user_version: currentVersion } = db.query<UserVersion, []>("PRAGMA user_version").get() ?? { user_version: 0 };
    if (currentVersion >= DATABASE_VERSION) return;

    if (currentVersion === 0) {
        db.exec(`
            PRAGMA journal_mode=WAL;

            CREATE TABLE IF NOT EXISTS redirects (
                id TEXT PRIMARY KEY,
                json_data JSONB NOT NULL
            );
        `);

        currentVersion = 1;
    }

    db.exec(`PRAGMA user_version = ${currentVersion}`);

    console.log("Current database version:", currentVersion);
}


migrate();

export const saveRedirect = (id: string, data: unknown) => {
    // biome-ignore lint/suspicious/noExplicitAny: This is a known type coming from a json object
    db.query("INSERT INTO redirects (id, json_data) VALUES ($id, $json)").run({ id, json: data as any });
};

export const getRedirect = (id: string) => {
    const row = db.query("SELECT json_data FROM redirects WHERE id = $id").get({ id }) as { json_data: string } | undefined;

    return row ? JSON.parse(row.json_data) : null;
};
