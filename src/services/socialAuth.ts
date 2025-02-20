const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.Client_ID); // Replace with your Google Client ID

export async function verifyGoogleToken(idToken: string) {
  try {
    const tokenInfo = await client.getTokenInfo(idToken);
    return tokenInfo;
  } catch (error) {
    // console.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
}

export async function verifyFacebookToken(idToken: string) {
  try {
    const tokenInfo = await client.getTokenInfo(idToken);
    return tokenInfo;
  } catch (error) {
    // console.error('Token verification failed:', error);
    throw new Error('Invalid token');
  }
}
