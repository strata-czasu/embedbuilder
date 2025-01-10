export async function fetchDiscordUser(accessToken: string): Promise<{ id: string; }> {
	const response = await fetch("https://discord.com/api/users/@me", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch user");
	}

	return response.json();
}
