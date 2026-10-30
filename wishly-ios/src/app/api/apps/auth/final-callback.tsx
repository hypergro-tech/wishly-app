// Base44's sign-in finishes at <app address>/api/apps/auth/final-callback. Its own
// hosting handles that address; the web preview has to, so it's the same return
// screen as /auth.
export { default } from '../../../auth'
