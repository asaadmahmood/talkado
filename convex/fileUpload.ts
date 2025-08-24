"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Store profile image and return URL
 */
export const storeProfileImage = action({
  args: {
    image: v.any(), // This will be an ArrayBuffer
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    try {
      // Convert ArrayBuffer to Blob and store it
      const imageBlob = new Blob([args.image], { type: "image/jpeg" });
      const storageId = await ctx.storage.store(imageBlob);

      // Get the URL for the stored file
      const imageUrl = await ctx.storage.getUrl(storageId);

      if (!imageUrl) {
        throw new Error("Failed to generate image URL");
      }

      return imageUrl;
    } catch (error) {
      console.error("Error storing image:", error);
      throw new Error("Failed to store image. Please try again.");
    }
  },
});
