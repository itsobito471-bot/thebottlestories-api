// config/passport.js

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback', // Must match Google Console
        proxy: true // Important for handling http/https prefixes
      },
      async (accessToken, refreshToken, profile, done) => {
        // This is the "find or create" logic
        const newUser = {
          name: profile.displayName,
          email: profile.emails[0].value,
          // We don't save a password
        };

        try {
          // Find user by email
          let user = await User.findOne({ email: newUser.email });

          if (user) {
            // User exists
            done(null, user);
          } else {
            // User doesn't exist, create them
            user = await User.create(newUser);
            done(null, user);
          }
        } catch (err) {
          console.error(err);
          done(err, null);
        }
      }
    )
  );
};