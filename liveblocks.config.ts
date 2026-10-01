// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string
      info: {
        // Example properties, for useSelf, useUser, useOthers, etc.
        name: string
        avatar?: string
      }
    }
  }
}

export {}
