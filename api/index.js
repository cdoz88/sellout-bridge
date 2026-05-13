/**
 * api/index.js - THE MAIN ENTRY POINT
 * This simply imports and mounts all our clean, modular routes.
 */

import express from 'express';
import teamRoutes from '../server/routes/team.js';
import billingRoutes from '../server/routes/billing.js';
import bridgeRoutes from '../server/routes/bridge.js';
import contentRoutes from '../server/routes/content.js';
import authRoutes from '../server/routes/auth.js';
import domainRoutes from '../server/routes/domains.js';
import postsRoutes from '../server/routes/posts.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount all modular routes
app.use('/', teamRoutes);
app.use('/', billingRoutes);
app.use('/', bridgeRoutes);
app.use('/', contentRoutes);
app.use('/', authRoutes);
app.use('/', domainRoutes);
app.use('/', postsRoutes);

export default app;