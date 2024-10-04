import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class DropboxAuthManager {
    private dbx: Dropbox;
    private accessToken: string | null = null;
    private accessTokenExpiresAt: number | null = null;

    constructor() {
        this.dbx = new Dropbox({
            clientId: process.env.DROPBOX_APP_KEY,
            clientSecret: process.env.DROPBOX_APP_SECRET,
            refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
        });
    }

    async getAccessToken(): Promise<string> {
        if (!this.accessToken || this.isTokenExpired()) {
            await this.refreshAccessToken();
        }
        return this.accessToken!;
    }

    private isTokenExpired(): boolean {
        return this.accessTokenExpiresAt ? Date.now() >= this.accessTokenExpiresAt : true;
    }

    private async refreshAccessToken(): Promise<void> {
        try {
            const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: process.env.DROPBOX_REFRESH_TOKEN!,
                    client_id: process.env.DROPBOX_APP_KEY!,
                    client_secret: process.env.DROPBOX_APP_SECRET!,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.accessTokenExpiresAt = Date.now() + data.expires_in * 1000;
            console.log('Access token refreshed successfully');
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw error;
        }
    }

    async getAuthorizedDropboxInstance(): Promise<Dropbox> {
        const accessToken = await this.getAccessToken();
        const k1 = new Dropbox({ accessToken, fetch });
        return k1
    }
}

module.exports = { authManager: new DropboxAuthManager() }