import { Router } from "express";
import type { IStorage } from "../storage";
import { 
  insertBlogCategorySchema, 
  insertBlogTagSchema, 
  insertBlogPostSchema 
} from "@shared/schema";
import { requireRole } from "../middleware/requireRole";
import { logger, logAuditEvent } from "../logger";

export function createBlogRoutes(storage: IStorage): Router {
  const router = Router();

  // ======================
  // BLOG CATEGORIES - All category routes MUST come before tags/posts dynamic routes
  // ======================

  // Get all blog categories (public - only active)
  router.get("/categories", async (req, res, next) => {
    try {
      const { isActive } = req.query;
      
      const categories = await storage.getBlogCategories({
        isActive: isActive as string | undefined,
      });
      
      res.json(categories);
    } catch (error) {
      logger.error("Failed to fetch blog categories", { error });
      next(error);
    }
  });

  // Get single blog category by slug (public)
  router.get("/categories/slug/:slug", async (req, res, next) => {
    try {
      const category = await storage.getBlogCategoryBySlug(req.params.slug);
      
      if (!category || category.isActive !== "true") {
        return res.status(404).json({ error: "Blog category not found" });
      }
      
      res.json(category);
    } catch (error) {
      logger.error("Failed to fetch blog category by slug", { error });
      next(error);
    }
  });

  // Get single blog category by ID (admin only)
  router.get("/categories/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const category = await storage.getBlogCategory(req.params.id);
      
      if (!category) {
        return res.status(404).json({ error: "Blog category not found" });
      }
      
      res.json(category);
    } catch (error) {
      logger.error("Failed to fetch blog category", { error });
      next(error);
    }
  });

  // Create blog category (admin only)
  router.post("/categories", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertBlogCategorySchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid category data", details: validation.error });
      }
      
      const category = await storage.createBlogCategory(validation.data);
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "created", "blog_category", category.id);
      
      res.status(201).json(category);
    } catch (error) {
      logger.error("Failed to create blog category", { error });
      next(error);
    }
  });

  // Update blog category (admin only)
  router.patch("/categories/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertBlogCategorySchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid category data", details: validation.error });
      }
      
      const category = await storage.updateBlogCategory(req.params.id, validation.data);
      
      if (!category) {
        return res.status(404).json({ error: "Blog category not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "updated", "blog_category", category.id);
      
      res.json(category);
    } catch (error) {
      logger.error("Failed to update blog category", { error });
      next(error);
    }
  });

  // Delete blog category (admin only)
  router.delete("/categories/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const success = await storage.deleteBlogCategory(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Blog category not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "deleted", "blog_category", req.params.id);
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete blog category", { error });
      next(error);
    }
  });

  // ======================
  // BLOG TAGS - All tag routes MUST come before posts dynamic routes
  // ======================

  // Get all blog tags (public)
  router.get("/tags", async (req, res, next) => {
    try {
      const { limit } = req.query;
      
      const tags = await storage.getBlogTags({
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(tags);
    } catch (error) {
      logger.error("Failed to fetch blog tags", { error });
      next(error);
    }
  });

  // Get single blog tag by slug (public)
  router.get("/tags/slug/:slug", async (req, res, next) => {
    try {
      const tag = await storage.getBlogTagBySlug(req.params.slug);
      
      if (!tag) {
        return res.status(404).json({ error: "Blog tag not found" });
      }
      
      res.json(tag);
    } catch (error) {
      logger.error("Failed to fetch blog tag by slug", { error });
      next(error);
    }
  });

  // Get blog posts by tag (public - only published)
  router.get("/tags/:id/posts", async (req, res, next) => {
    try {
      const { limit } = req.query;
      
      const posts = await storage.getBlogPostsByTag(req.params.id, {
        status: "published",
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(posts);
    } catch (error) {
      logger.error("Failed to fetch blog posts by tag", { error });
      next(error);
    }
  });

  // Get single blog tag by ID (admin only)
  router.get("/tags/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const tag = await storage.getBlogTag(req.params.id);
      
      if (!tag) {
        return res.status(404).json({ error: "Blog tag not found" });
      }
      
      res.json(tag);
    } catch (error) {
      logger.error("Failed to fetch blog tag", { error });
      next(error);
    }
  });

  // Create blog tag (admin only)
  router.post("/tags", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertBlogTagSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid tag data", details: validation.error });
      }
      
      const tag = await storage.createBlogTag(validation.data);
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "created", "blog_tag", tag.id);
      
      res.status(201).json(tag);
    } catch (error) {
      logger.error("Failed to create blog tag", { error });
      next(error);
    }
  });

  // Update blog tag (admin only)
  router.patch("/tags/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertBlogTagSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid tag data", details: validation.error });
      }
      
      const tag = await storage.updateBlogTag(req.params.id, validation.data);
      
      if (!tag) {
        return res.status(404).json({ error: "Blog tag not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "updated", "blog_tag", tag.id);
      
      res.json(tag);
    } catch (error) {
      logger.error("Failed to update blog tag", { error });
      next(error);
    }
  });

  // Delete blog tag (admin only)
  router.delete("/tags/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const success = await storage.deleteBlogTag(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Blog tag not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "deleted", "blog_tag", req.params.id);
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete blog tag", { error });
      next(error);
    }
  });

  // ======================
  // BLOG POSTS - All specific routes MUST come before dynamic :id/:slug routes
  // ======================

  // Get all blog posts (public - filtered by status)
  router.get("/posts", async (req, res, next) => {
    try {
      const { 
        status = "published", 
        categoryId, 
        authorId, 
        isFeatured, 
        search, 
        limit, 
        offset 
      } = req.query;
      
      const posts = await storage.getBlogPosts({
        status: status as string,
        categoryId: categoryId as string | undefined,
        authorId: authorId as string | undefined,
        isFeatured: isFeatured as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      
      res.json(posts);
    } catch (error) {
      logger.error("Failed to fetch blog posts", { error });
      next(error);
    }
  });

  // Get single blog post by slug (public - only published)
  router.get("/posts/slug/:slug", async (req, res, next) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      
      if (!post || post.status !== "published") {
        return res.status(404).json({ error: "Blog post not found" });
      }
      
      // Increment view count
      await storage.incrementBlogPostView(post.id);
      
      // Get related posts and tags
      const [relatedPosts, tags] = await Promise.all([
        storage.getRelatedPosts(post.id, 3),
        storage.getTagsForPost(post.id),
      ]);
      
      res.json({ ...post, relatedPosts, tags });
    } catch (error) {
      logger.error("Failed to fetch blog post by slug", { error });
      next(error);
    }
  });

  // Get single blog post by ID (admin only)
  router.get("/posts/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      
      // Get tags for the post
      const tags = await storage.getTagsForPost(post.id);
      
      res.json({ ...post, tags });
    } catch (error) {
      logger.error("Failed to fetch blog post", { error });
      next(error);
    }
  });

  // Create blog post (admin only)
  router.post("/posts", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertBlogPostSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid blog post data", details: validation.error });
      }
      
      const post = await storage.createBlogPost(validation.data);
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "created", "blog_post", post.id);
      
      res.status(201).json(post);
    } catch (error) {
      logger.error("Failed to create blog post", { error });
      next(error);
    }
  });

  // Update blog post (admin only)
  router.patch("/posts/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const validation = insertBlogPostSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid blog post data", details: validation.error });
      }
      
      const post = await storage.updateBlogPost(req.params.id, validation.data);
      
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "updated", "blog_post", post.id);
      
      res.json(post);
    } catch (error) {
      logger.error("Failed to update blog post", { error });
      next(error);
    }
  });

  // Delete blog post (admin only)
  router.delete("/posts/:id", requireRole("admin"), async (req, res, next) => {
    try {
      const success = await storage.deleteBlogPost(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "deleted", "blog_post", req.params.id);
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete blog post", { error });
      next(error);
    }
  });

  // Publish blog post (admin only)
  router.post("/posts/:id/publish", requireRole("admin"), async (req, res, next) => {
    try {
      const post = await storage.publishBlogPost(req.params.id);
      
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "published", "blog_post", post.id);
      
      res.json(post);
    } catch (error) {
      logger.error("Failed to publish blog post", { error });
      next(error);
    }
  });

  // Archive blog post (admin only)
  router.post("/posts/:id/archive", requireRole("admin"), async (req, res, next) => {
    try {
      const post = await storage.archiveBlogPost(req.params.id);
      
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "archived", "blog_post", post.id);
      
      res.json(post);
    } catch (error) {
      logger.error("Failed to archive blog post", { error });
      next(error);
    }
  });

  // Get related posts for a blog post (public - only published)
  router.get("/posts/:id/related", async (req, res, next) => {
    try {
      const { limit } = req.query;
      
      const relatedPosts = await storage.getRelatedPosts(
        req.params.id, 
        limit ? parseInt(limit as string) : 3
      );
      
      res.json(relatedPosts);
    } catch (error) {
      logger.error("Failed to fetch related blog posts", { error });
      next(error);
    }
  });

  // ======================
  // BLOG POST TAGS - Tag management for specific posts
  // ======================

  // Get tags for a specific blog post (public)
  router.get("/posts/:id/tags", async (req, res, next) => {
    try {
      const tags = await storage.getTagsForPost(req.params.id);
      res.json(tags);
    } catch (error) {
      logger.error("Failed to fetch blog post tags", { error });
      next(error);
    }
  });

  // Add tag to blog post (admin only)
  router.post("/posts/:postId/tags/:tagId", requireRole("admin"), async (req, res, next) => {
    try {
      const postTag = await storage.addTagToPost(req.params.postId, req.params.tagId);
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "added_tag", "blog_post", req.params.postId, {
        tagId: req.params.tagId,
      });
      
      res.status(201).json(postTag);
    } catch (error) {
      logger.error("Failed to add tag to blog post", { error });
      next(error);
    }
  });

  // Remove tag from blog post (admin only)
  router.delete("/posts/:postId/tags/:tagId", requireRole("admin"), async (req, res, next) => {
    try {
      const success = await storage.removeTagFromPost(req.params.postId, req.params.tagId);
      
      if (!success) {
        return res.status(404).json({ error: "Tag relationship not found" });
      }
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "removed_tag", "blog_post", req.params.postId, {
        tagId: req.params.tagId,
      });
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to remove tag from blog post", { error });
      next(error);
    }
  });

  // Set all tags for a blog post (admin only - replaces existing tags)
  router.put("/posts/:postId/tags", requireRole("admin"), async (req, res, next) => {
    try {
      const { tagIds } = req.body;
      
      if (!Array.isArray(tagIds) || !tagIds.every(id => typeof id === 'string')) {
        return res.status(400).json({ error: "Invalid tag IDs array" });
      }
      
      await storage.setPostTags(req.params.postId, tagIds);
      
      const user = req.dbUser as any;
      await logAuditEvent(user.id, user.organizationId, "set_tags", "blog_post", req.params.postId, {
        tagIds,
      });
      
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to set blog post tags", { error });
      next(error);
    }
  });

  return router;
}
