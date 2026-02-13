import path from 'node:path'

import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import { Media } from './src/collections/Media'
import { Pages } from './src/collections/Pages'
import { Posts } from './src/collections/Posts'
import { Users } from './src/collections/Users'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL,
  editor: lexicalEditor({}),
  db: sqliteAdapter({
    client: {
      // Local dev default. For Turso, set DATABASE_URL to your `libsql://...` URL
      // and provide DATABASE_AUTH_TOKEN.
      url: process.env.DATABASE_URL || 'file:./payload.db',
      authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),
  admin: {
    user: Users.slug,
  },
  collections: [Users, Media, Pages, Posts],
  typescript: {
    outputFile: path.resolve(process.cwd(), 'src/payload-types.ts'),
  },
})
