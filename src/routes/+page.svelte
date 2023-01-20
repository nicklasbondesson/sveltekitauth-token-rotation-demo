<script lang="ts">
	import { signIn, signOut } from '@auth/sveltekit/client'
	import { browser } from '$app/environment'
	import { PUBLIC_AUTH_ISSUER } from '$env/static/public'
	import { getSession } from '$lib/auth'

	const session = getSession()
	//@ts-expect-error: ignore
	const accessTokenExpiresIn = session?.accessTokenExpiresIn
	const sessionAsJson = JSON.stringify(session, null, 2)
	const logOut = async () => {
		if (browser) {
			await signOut({ redirect: false })
			//@ts-expect-error: it's there
			const idToken = session.idToken
			const currentUri = encodeURIComponent(window.origin)
			const keycloakFederatedLogOutUri =
				PUBLIC_AUTH_ISSUER +
				`/protocol/openid-connect/logout?post_logout_redirect_uri=${currentUri}` +
				`&id_token_hint=${idToken}`
			window.location.replace(keycloakFederatedLogOutUri)
		}
	}

	if (session && browser) {
		setInterval(() => window.location.reload(), 2000)
	}
</script>

{#if session}
	<strong>You are logged in</strong>
	<div>Session expires in: {accessTokenExpiresIn}</div>
	<pre style="max-width: 800px; white-space: pre-wrap; word-break: break-all">{sessionAsJson}</pre>
	<button on:click={logOut}>Logout</button>
{:else}
	<strong>You are logged out</strong>
	<button on:click={() => signIn('keycloak')}>Login</button>
{/if}
