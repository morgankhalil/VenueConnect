import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, venues } from "../shared/schema";

// Define session user for TypeScript
declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      name: string;
      role: string;
      venueId: number | null;
    };
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Mock authentication middleware - in a real app, this would be handled by a proper auth system
app.use(async (req, res, next) => {
  // Skip for static assets and non-API routes
  if (!req.path.startsWith('/api') || req.path.startsWith('/api/webhooks')) {
    return next();
  }
  
  try {
    // Get the first venue and its owner
    const venue = await db.query.venues.findFirst({
      with: {
        owner: true
      }
    });
    
    if (venue && venue.owner) {
      // Set the user in session
      req.session.user = {
        id: venue.owner.id,
        name: venue.owner.name || venue.owner.username || "User",
        role: venue.owner.role || "user",
        venueId: venue.id
      };
    } else {
      // Fallback to a demo user if no venue/owner exists
      req.session.user = {
        id: 1,
        name: "Demo User",
        role: "user",
        venueId: null
      };
    }
    next();
  } catch (error) {
    console.error("Error in auth middleware:", error);
    next();
  }
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
    serveStatic(app);
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
