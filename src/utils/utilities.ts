// const jwt = require('jsonwebtoken');
// const jwtSecretKey = process.env.JWT_SECRET_KEY;

// exports.createToken = async (data, expTime = '24h') => {
//   try {
//     const token = await jwt.sign(data, jwtSecretKey , { expiresIn: expTime } );
//     return token;
//   } catch (e) {
//     return e;
//   }
// };


// Validate social tokens
// Helper function to validate social tokens
export async function validateSocialToken(provider: string, token: string) {
  try {
    switch (provider) {
      case 'google':
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
        )
        return response.status === 200

      case 'facebook':
        const fbResponse = await fetch(
          `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${process.env.FACEBOOK_APP_TOKEN}`
        )
        const fbData = await fbResponse.json()
        return fbData.data?.is_valid

      default:
        return false
    }
  } catch (error) {
    console.error('Token validation error:', error)
    return false
  }
}