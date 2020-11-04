import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { LogIn, LogOut, UserEdit, VerifyEmail } from "../../../routes";
import JWT from "jsonwebtoken";
import Adapter from "../../../serverDb/adapter";

const isProd = process.env.NODE_ENV === "production";
//              D   H     M   S
const maxAge = 30 * 24 * 60 * 60; // 30 days

const options = {
  adapter: Adapter(),
  // @link https://next-auth.js.org/configuration/providers
  providers: [
    Providers.Email({
      // SMTP connection string or nodemailer configuration object https://nodemailer.com/
      server: process.env.NEXTAUTH_EMAIL_SERVER,
      // Email services often only allow sending email from a valid/verified address
      from: process.env.NEXTAUTH_EMAIL_FROM,
    }),
    // When configuring oAuth providers make sure you enabling requesting
    // permission to get the users email address (required to sign in)
    Providers.Google({
      clientId: process.env.NEXTAUTH_GOOGLE_ID,
      clientSecret: process.env.NEXTAUTH_GOOGLE_SECRET,
    }),
    Providers.Facebook({
      clientId: process.env.NEXTAUTH_FACEBOOK_ID,
      clientSecret: process.env.NEXTAUTH_FACEBOOK_SECRET,
    }),
    Providers.Twitter({
      clientId: process.env.NEXTAUTH_TWITTER_ID,
      clientSecret: process.env.NEXTAUTH_TWITTER_SECRET,
    }),
    Providers.GitHub({
      clientId: process.env.NEXTAUTH_GITHUB_ID,
      clientSecret: process.env.NEXTAUTH_GITHUB_SECRET,
    }),
  ],

  // @link https://next-auth.js.org/configuration/databases
  database: process.env.NEXTAUTH_DATABASE_URL,

  // @link https://next-auth.js.org/configuration/options#session
  session: {
    // Use JSON Web Tokens for session instead of database sessions.
    // This option can be used with or without a database for users/accounts.
    // Note: `jwt` is automatically set to `true` if no database is specified.
    jwt: true,
    // Seconds - How long until an idle session expires and is no longer valid.
    maxAge,
    // Seconds - Throttle how frequently to write to database to extend a session.
    // Use it to limit write operations. Set to 0 to always update the database.
    // Note: This option is ignored if using JSON Web Tokens
    // updateAge: 24 * 60 * 60, // 24 hours
  },

  // @link https://next-auth.js.org/configuration/options#jwt
  jwt: {
    // A secret to use for key generation - you should set this explicitly
    // Defaults to NextAuth.js secret if not explicitly specified.
    secret: process.env.NEXTAUTH_JWT_SECRET,
    // Set to true to use encryption. Defaults to false (signing only).
    // encryption: process.env.NODE_ENV === "production",
    // You can define your own encode/decode functions for signing and encryption
    // if you want to override the default behaviour.
    encode: async ({ secret, token }) => {
      const { exp, ...rest } = token;
      const jwt = JWT.sign(rest, secret, {
        algorithm: "HS512",
        expiresIn: maxAge,
      });
      return jwt;
    },
    decode: async ({ secret, token }) => {
      if (!token) {
        return null;
      }

      const data = JWT.verify(token, secret, {
        algorithms: ["HS512"],
      });
      return data;
    },
  },

  // @link https://next-auth.js.org/configuration/callbacks
  callbacks: {
    /**
     * Intercept signIn request and return true if the user is allowed.
     *
     * @link https://next-auth.js.org/configuration/callbacks#sign-in-callback
     * @param  {object} user     User object
     * @param  {object} account  Provider account
     * @param  {object} profile  Provider profile
     * @return {boolean}         Return `true` (or a modified JWT) to allow sign in
     *                           Return `false` to deny access
     */
    signIn: async (/* user, account, profile */) => {
      return true;
    },

    /**
     * @link https://next-auth.js.org/configuration/callbacks#session-callback
     * @param  {object} session      Session object
     * @param  {object} user         User object    (if using database sessions)
     *                               JSON Web Token (if not using database sessions)
     * @return {object}              Session that will be returned to the client
     */
    session: async (session /* , user */) => {
      // session.customSessionProperty = 'bar'
      return Promise.resolve(session);
    },

    /**
     * @link https://next-auth.js.org/configuration/callbacks#jwt-callback
     * @param  {object}  token     Decrypted JSON Web Token
     * @param  {object}  user      User object      (only available on sign in)
     * @param  {object}  account   Provider account (only available on sign in)
     * @param  {object}  profile   Provider profile (only available on sign in)
     * @param  {boolean} isNewUser True if new user (only available on sign in)
     * @return {object}            JSON Web Token that will be saved
     */
    jwt: async (token, user, account, profile, isNewUser) => {
      // const isSignIn = (user) ? true : false
      // Add auth_time to token on signin in
      // if (isSignIn) { token.auth_time = Math.floor(Date.now() / 1000) }
      token.sub = token?.sub ?? token?.email ?? user?.email ?? profile?.email;
      token["_couchdb.roles"] = token?.["_couchdb.roles"] ?? user?.roles;
      token.username = token?.username ?? user?.username;
      return Promise.resolve(token);
    },
  },

  // You can define custom pages to override the built-in pages
  // The routes shown here are the default URLs that will be used.
  // @link https://next-auth.js.org/configuration/pages
  pages: {
    signIn: isProd ? LogIn.sv.href : LogIn.href,
    signOut: isProd ? LogOut.sv.href : LogOut.href,
    error: "/api/auth/error", // Error code passed in query string as ?error=
    verifyRequest: isProd ? VerifyEmail.sv.href : VerifyEmail.href, // (used for check email message)
    newUser: isProd ? UserEdit.sv.href : UserEdit.href, // If set, new users will be directed here on first sign in
  },

  // Additional options
  secret: process.env.NEXTAUTH_SECRET, // Recommended (but auto-generated if not specified)
  debug: !isProd, // Use this option to enable debug messages in the console
};

const Auth = (req, res) => NextAuth(req, res, options);

export default Auth;
