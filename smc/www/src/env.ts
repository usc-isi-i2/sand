export const THEME: "dark" | "light" = "light";

export const PLATFORM: "native" | "web" =
  process.env.REACT_APP_PLATFORM === "native" ? "native" : "web";

// url of the API server
export const SERVER: string =
  process.env.REACT_APP_PLATFORM === "native"
    ? (process.env.REACT_APP_API_SERVER as string)
    : "";

// path to the static directory for serving either local or remote css/js/assets
export const PUBLIC_URL: string = process.env.PUBLIC_URL;
