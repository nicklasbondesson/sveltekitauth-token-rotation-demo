import { get } from 'svelte/store'
import { page } from '$app/stores'
import { PUBLIC_AUTH_ISSUER, PUBLIC_CLIENT_ID } from '$env/static/public'
import type { Session } from '@auth/core/types'
import type { AccessTokenInfo } from './types'

export const getSession = (): Session | null => get(page).data.session

type KeycloakRefreshTokenResponse = {
	access_token: string
	expires_in: number
	refresh_token: string
	refresh_expires_in: number
	id_token: string
}

export const getOrRefreshAccessToken = (
	tokenInfo: AccessTokenInfo | undefined | null
): Promise<AccessTokenInfo> => {
	return new Promise((resolve, reject) => {
		if (!tokenInfo) {
			return resolve({})
		}

		const nowInSecs = Math.round(Date.now() / 1000)
		const accessTokenExpiresAt = tokenInfo.accessTokenExpiresAt ?? 0

		if (nowInSecs < accessTokenExpiresAt) {
			console.log('TOKEN EXPIRES IN', accessTokenExpiresAt - nowInSecs)
			return resolve({
				accessToken: tokenInfo.accessToken,
				accessTokenExpiresIn: accessTokenExpiresAt - nowInSecs,
				accessTokenExpiresAt: tokenInfo.accessTokenExpiresAt,
				refreshToken: tokenInfo.refreshToken,
				refreshTokenExpiresAt: tokenInfo.refreshTokenExpiresAt,
				idToken: tokenInfo.idToken
			})
		}

		const refreshTokenExpiresAt = tokenInfo.refreshTokenExpiresAt ?? 0
		if (nowInSecs > refreshTokenExpiresAt) {
			return reject('unable to refresh the access token as the refresh token has expired')
		}
		if (!tokenInfo.refreshToken) {
			return reject('unable to refresh the access token because the refresh token is empty')
		}

		fetch(`${PUBLIC_AUTH_ISSUER}/protocol/openid-connect/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: PUBLIC_CLIENT_ID,
				grant_type: 'refresh_token',
				refresh_token: tokenInfo.refreshToken
			})
		})
			.then((response) => {
				if (!response.ok) {
					return reject(`unable to get new refresh token ${response.status}:${response.statusText}`)
				}
				response
					.json()
					.then((json: KeycloakRefreshTokenResponse) => {
						const nowInSecs = Math.round(Date.now() / 1000)
						const accessToken = json.access_token
						const accessTokenExpiresIn = json.expires_in
						const accessTokenExpiresAt = nowInSecs + json.expires_in
						const refreshToken = json.refresh_token
						const refreshTokenExpiresAt = nowInSecs + json.refresh_expires_in
						const idToken = json.id_token

						tokenInfo.accessToken = accessToken
						tokenInfo.accessTokenExpiresIn = accessTokenExpiresIn
						tokenInfo.accessTokenExpiresAt = accessTokenExpiresAt
						tokenInfo.refreshToken = refreshToken
						tokenInfo.refreshTokenExpiresAt = refreshTokenExpiresAt
						tokenInfo.idToken = idToken

						console.log('TOKEN HAS EXPIRED', tokenInfo.accessTokenExpiresAt)
						resolve({
							accessToken,
							accessTokenExpiresAt,
							refreshToken,
							accessTokenExpiresIn,
							refreshTokenExpiresAt,
							idToken
						})
					})
					.catch(reject)
			})
			.catch(reject)
	})
}
