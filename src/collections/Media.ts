import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    staticDir: "media",
    mimeTypes: ["image/*", "video/*", "application/pdf"],
  },
  admin: {
    useAsTitle: "alt",
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "sourceUrl",
      type: "text",
      unique: true,
      admin: {
        description: "Optional: original URL when imported from raw/scrape.",
      },
    },
    {
      name: "alt",
      type: "text",
      required: true,
    },
    {
      name: "caption",
      type: "textarea",
    },
    {
      name: "credit",
      type: "text",
    },
  ],
};
