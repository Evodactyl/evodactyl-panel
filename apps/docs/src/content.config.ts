import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { defineCollection, z } from 'astro:content';

export const collections = {
    docs: defineCollection({
        loader: docsLoader(),
        schema: docsSchema({
            extend: z.object({
                requiresWings: z.boolean().optional(),
                requiresRedis: z.boolean().optional(),
                deprecated: z.boolean().optional(),
                nextStep: z
                    .object({
                        label: z.string(),
                        link: z.string(),
                        description: z.string().optional(),
                    })
                    .optional(),
            }),
        }),
    }),
};
