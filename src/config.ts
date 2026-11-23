// ---------------------------------------------------------------------------
// OneDrive sync settings.
//
// Paste the Microsoft "Application (client) ID" of THIS app's registration between the quotes below.
// You get it from the free app registration described in README.md. It is not a secret (anyone who
// opens the site can see it), so it is safe in a public repository. Until it is filled in, Settings
// says sync is not set up and everything else works normally.
// ---------------------------------------------------------------------------
export const MS_CLIENT_ID: string = '';

/** The only file this app ever reads or writes in the OneDrive folder (see appIdentity.ts). */
export { DATA_FILE_NAME } from './appIdentity';

/**
 * The one Microsoft Graph permission we ask for. For personal Microsoft accounts it covers the
 * user's own OneDrive and folders shared with them. (openid, profile and offline_access are added
 * automatically so we can show who is signed in and stay signed in.)
 */
export const GRAPH_SCOPES = ['Files.ReadWrite'];
