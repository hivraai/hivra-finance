import {Inngest} from "inngest"

export const inngest = new Inngest({
    id: "hivra-finance",
    // Add signing key for Vercel deployment
    signingKey: process.env.INNGEST_SIGNING_KEY,
})