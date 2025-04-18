import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, venues } from "../shared/schema";
import path from "path";
import { Server } from "http";
import adminRouter from './routes/admin';
import seedingRouter from './routes/seeding-routes'; // Added import for seeding routes

// Session type is defined in auth-middleware.ts

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for Replit Deployments - moved to /api/health to avoid conflicting with frontend routes
app.get('/api/health', (_, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Set up session middleware with fallback secret for development
const sessionSecret = process.env.SESSION_SECRET || 'venue-discovery-default-secret';
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware - disabled for demo purposes
app.use(async (req, res, next) => {
  // All routes are public for the demo
  return next();
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
    const errorId = crypto.randomUUID();

    console.error(`Error ${errorId}:`, err);

    res.status(status).json({ 
      message,
      errorId,
      type: err.name || 'UnknownError'
    });
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

  // Use port 5000 to match Replit workflow expectations, or use PORT env var
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();

// Added routes for seeding
app.use('/api/admin', adminRouter);
app.use('/api/admin', seedingRouter);