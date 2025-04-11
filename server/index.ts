import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, venues } from "../shared/schema";
import path from "path";
import { Server } from "http";

// Session type is defined in auth-middleware.ts

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for Replit Deployments - moved to /api/health to avoid conflicting with frontend routes
app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Set up session middleware
app.use(session({
  secret: 'venue-connect-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Simple authentication middleware
app.use(async (req, res, next) => {
  // Paths that don't require authentication
  const publicPaths = [
    '/api/auth',       // All auth-related endpoints
    '/api/health',     // Health check endpoint
    '/api/webhooks'    // Webhook endpoints
  ];
  
  // Skip auth for non-API routes (static assets, etc.)
  if (!req.path.startsWith('/api')) {
    return next();
  }
  
  // Skip auth for public paths
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // If user is already authenticated, proceed
  if (req.session && req.session.user) {
    return next();
  }
  
  // Otherwise, require authentication
  return res.status(401).json({ 
    success: false,
    message: "Authentication required"
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    app.use(express.static(path.join(import.meta.dirname, "../dist/public")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(import.meta.dirname, "../dist/public/index.html"));
    });
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000; // Changed to always use port 5000 for Replit workflow
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
