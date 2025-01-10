export const encodeJson = (jsonCode: unknown) => {
	console.log(typeof jsonCode);
	const data = btoa(encodeURIComponent(JSON.stringify(jsonCode)));
	const urlSearchParams = new URLSearchParams();

	urlSearchParams.append("data", data);

	console.log(urlSearchParams.toString().substring(0, 100));

	return urlSearchParams.toString().replace(/data=\w+(?:%3D)+/g, `data=${data}`);
};
