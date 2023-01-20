import { PUBLIC_AUTH_ISSUER, PUBLIC_CLIENT_ID } from '$env/static/public'
import { getOrRefreshAccessToken } from '$lib/auth'
import Keycloak from '@auth/core/providers/keycloak'
import { SvelteKitAuth } from '@auth/sveltekit'

export const handle = SvelteKitAuth({
	providers: [
		//@ts-expect-error: ignore
		Keycloak({
			clientId: PUBLIC_CLIENT_ID,
			clientSecret: 'secret',
			issuer: PUBLIC_AUTH_ISSUER
		})
	],
	secret: 'secret',
	callbacks: {
		jwt: async ({ token, account }) => {
			if (account) {
				const nowInSecs = Math.round(Date.now() / 1000)
				token.accessToken = account.access_token
				token.accessTokenExpiresIn = account.expires_in
				token.accessTokenExpiresAt = nowInSecs + (account.expires_in ?? 0)
				token.refreshToken = account.refresh_token
				token.refreshTokenExpiresAt = nowInSecs + (account.refresh_expires_in as number)
				token.idToken = account.id_token
				return token
			}
			//@ts-expect-error: ignore
			const tokenInfo = await getOrRefreshAccessToken(token)
			token.accessToken = tokenInfo.accessToken
			token.accessTokenExpiresIn = tokenInfo.accessTokenExpiresIn
			token.accessTokenExpiresAt = tokenInfo.accessTokenExpiresAt
			token.refreshToken = tokenInfo.refreshToken
			token.refreshTokenExpiresAt = tokenInfo.refreshTokenExpiresAt
			token.idToken = tokenInfo.idToken
			return token
		},
		session: ({ session, token }) => {
			return {
				...session,
				accessToken: token.accessToken,
				accessTokenExpiresIn: token.accessTokenExpiresIn,
				accessTokenExpiresAt: token.accessTokenExpiresAt,
				refreshToken: token.refreshToken,
				refreshTokenExpiresAt: token.refreshTokenExpiresAt,
				idToken: token.idToken
			}
		}
	}
})
