import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

class GoogleDriveAuthManager {
    private oauth2Client: OAuth2Client;
    private driveClient: any = null;
    private accessToken: string | null = null;
    private accessTokenExpiresAt: number | null = null;
    private refreshToken: string | null = null;
    private readonly TOKEN_PATH = path.join(process.cwd(), 'credentials2.json');

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        console.log('Token path:', this.TOKEN_PATH);
        this.initialize()
    }


    // public static async create(): Promise<GoogleDriveAuthManager> {
    //     const instance = new GoogleDriveAuthManager();
    //     await instance.initialize();
    //     return instance;
    // }

    private async initialize(): Promise<void> {
        this.loadStoredToken();
        if (!this.isAuthorized()) {
            await this.performInitialAuthorization();
        } else {
            console.log('Already authorized. Attempting to use existing credentials...');
            try {
                await this.getAccessToken();
                console.log('Existing credentials are valid.');
            } catch (error) {
                console.error('Error using existing credentials:', error);
                console.log('Attempting reauthorization...');
                await this.performInitialAuthorization();
            }
        }
    }

    private loadStoredToken() {
        try {
            const token = fs.readFileSync(this.TOKEN_PATH, 'utf-8');
            const parsedToken = JSON.parse(token);
            this.refreshToken = parsedToken.refresh_token;
            this.accessToken = parsedToken.access_token;
            this.accessTokenExpiresAt = parsedToken.expiry_date;
            this.oauth2Client.setCredentials(parsedToken);
        } catch (error) {
            console.log('No stored token found. Need to authorize.');
        }
    }
    private saveToken(token: any) {
        const tokenToSave = {
            access_token: token.access_token,
            refresh_token: token.refresh_token || this.refreshToken,
            expiry_date: token.expiry_date
        };
        fs.writeFileSync(this.TOKEN_PATH, JSON.stringify(tokenToSave));
        console.log('Token stored to', this.TOKEN_PATH);
    }

    private generateAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/drive.readonly'],
            redirect_uri: process.env.GOOGLE_REDIRECT_URI
        });
    }

    private async getTokensFromCode(code: string) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        this.refreshToken = tokens.refresh_token!;
        this.saveToken(tokens);
    }

    private async performInitialAuthorization(): Promise<void> {
        const authUrl = this.generateAuthUrl();
        console.log('Authorize this app by visiting this url:', authUrl);

        const app = express();
        const authPromise = new Promise<void>((resolve, reject) => {
            app.get('/oauth2callback', async (req, res) => {
                const { code } = req.query;
                try {
                    await this.getTokensFromCode(code as string);
                    res.send('Authorization successful! You can close this window.');
                    resolve();
                } catch (error) {
                    console.error('Error during token exchange:', error);
                    res.status(500).send('Authorization failed. Please try again.');
                    reject(error);
                }
                server.close();
            });
        });

        const server = app.listen(3000, () => {
            console.log('Listening on port 3000 for OAuth2 callback');
        });

        await authPromise;
    }

    public async getAccessToken(): Promise<string> {
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
            console.log('Attempting to refresh access token...');
            
            if (!this.refreshToken) {
                throw new Error('No refresh token available. User may need to reauthorize.');
            }
    
            const tokens = await this.oauth2Client.refreshAccessToken() as any;
    
            if (!tokens || !tokens.credentials.access_token) {
                throw new Error('Failed to obtain new tokens');
            }
    
            this.accessToken = tokens.credentials.access_token;
            this.accessTokenExpiresAt = tokens.credentials.expiry_date || Date.now() + 3600 * 1000;
    
            // Only update the refresh token if a new one is provided
            if (tokens.credentials.refresh_token) {
                this.refreshToken = tokens.credentials.refresh_token;
            }
    
            this.saveToken(tokens.credentials);
    
            console.log('Access token refreshed successfully');
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw error; // Let the caller handle the error
        }
    }

    private handleRefreshError(error: any): void {
        console.error('Detailed refresh error:', error);
        
        if (error.response && error.response.data && error.response.data.error === 'invalid_grant') {
            console.log('Invalid grant error. Clearing stored token and requiring reauthorization.');
            this.clearStoredToken();
        }
        
        throw new Error('Failed to refresh access token. User may need to reauthorize.');
    }

    private clearStoredToken(): void {
        this.refreshToken = null;
        this.accessToken = null;
        this.accessTokenExpiresAt = null;
        try {
            fs.unlinkSync(this.TOKEN_PATH);
            console.log('Stored token cleared.');
        } catch (error) {
            console.error('Error clearing stored token:', error);
        }
    }

    public async getAuthorizedDriveInstance(): Promise<any> {
        try {
            await this.getAccessToken();
            if (!this.driveClient) {
                this.driveClient = google.drive({ version: 'v3', auth: this.oauth2Client });
            }
            return this.driveClient;
        } catch (error) {
            console.error('Error getting authorized drive instance:', error);
            await this.performInitialAuthorization();
            return this.getAuthorizedDriveInstance();
        }
    }

    private isAuthorized(): boolean {
        return !!this.refreshToken;
    }
}

// Create and export a single instance
export const driveAuthManager = new GoogleDriveAuthManager()