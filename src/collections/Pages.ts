import type { CollectionConfig } from "payload";

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "path", "updatedAt"],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "path",
      type: "text",
      required: true,
      unique: true,
      admin: {
        description: "URL pathname, e.g. /, /about/, /our-projects/",
      },
    },
    {
      name: "heroMedia",
      type: "upload",
      relationTo: "media",
    },
    {
      name: "imageUrls",
      type: "array",
      admin: {
        description: "Ordered list of image URLs discovered on this page (for later media ingestion).",
      },
      fields: [
        {
          name: "url",
          type: "text",
          required: true,
        },
      ],
    },
    {
      name: "content",
      type: "richText",
      required: true,
    },
    {
      name: "seo",
      type: "group",
      fields: [
        { name: "metaTitle", type: "text" },
        { name: "metaDescription", type: "textarea" },
      ],
    },
  ],
};
