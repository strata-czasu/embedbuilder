import { jwt } from "@elysiajs/jwt";
import { staticPlugin } from "@elysiajs/static";
import { Elysia, t } from "elysia";
import { oauth2 } from "elysia-oauth2";
import { logger } from "@tqman/nice-logger";
import { saveRedirect, getRedirect } from "./db";
import { encodeJson } from "./encodeJson";
import { fetchDiscordUser } from "./fetchDiscordUser";


for (const key of [
	"DISCORD_CLIENT_ID",
	"DISCORD_CLIENT_SECRET",
	"DISCORD_REDIRECT_URI",
	"JWT_SECRET",
]) {
	if (!process.env[key]) {
		throw new Error(`${key} is missing.`);
	}
}

const JwtSchema = t.Object({
	accessToken: t.String(),
	refreshToken: t.String(),
});

const ALLOWED_USERS = ["211260587038998528", "503299438757019659", "195935967440404480"];

const api = new Elysia()
	.use(jwt({ secret: process.env.JWT_SECRET as string, schema: JwtSchema }))
	.use(
		oauth2({
			Discord: [
				process.env.DISCORD_CLIENT_ID as string,
				process.env.DISCORD_CLIENT_SECRET as string,
				process.env.DISCORD_REDIRECT_URI as string,
			],
		}),
	)
	.get("/auth/discord", ({ oauth2 }) =>
		oauth2.redirect("Discord", ["identify"]),
	)
	.get(
		"/auth/discord/callback",
		async ({ oauth2, jwt, redirect, cookie: { auth } }) => {
			const tokens = await oauth2.authorize("Discord");

			auth.set({
				value: await jwt.sign({
					accessToken: tokens.accessToken(),
					refreshToken: tokens.refreshToken(),
				}),
				httpOnly: true,
				maxAge: 7 * 24 * 60 * 60,
				path: "/api/save",
			});

			return redirect("/");
		},
	)
	.post("/api/save", async ({ jwt, body, error, cookie: { auth } }) => {
		const tokens = await jwt.verify(auth.value);
		if (!tokens) return error(401, "Unauthorized");
		const discordUser = await fetchDiscordUser(tokens.accessToken);
		if (!ALLOWED_USERS.includes(discordUser.id)) return error(403, "Forbidden");
		const id = crypto.randomUUID();
		saveRedirect(id, body);
		return { id };
	})
	.get("/api/redirect/:id", async ({ params, error }) => {
		const data = getRedirect(params.id);

		if (!data) return error(404, "Not Found");

		return data;
	})
	.get("/r/:id", ({ params, redirect, error }) => {
		const data = getRedirect(params.id);
		if (!data) return error(404, "Not Found");

		return redirect(`/?${encodeJson(data)}`);
	})

const LOG_MODE = process.env.NODE_ENV === "production" ? "combined" : "live";

const app = new Elysia()
	.use(logger({ withTimestamp: true, mode: LOG_MODE }))
	.use(api)
	.use(staticPlugin({ prefix: "" }))

	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
