/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as _utils from "../_utils.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as comments from "../comments.js";
import type * as fileUpload from "../fileUpload.js";
import type * as http from "../http.js";
import type * as labels from "../labels.js";
import type * as projects from "../projects.js";
import type * as stripe from "../stripe.js";
import type * as stripeActions from "../stripeActions.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  _utils: typeof _utils;
  ai: typeof ai;
  auth: typeof auth;
  comments: typeof comments;
  fileUpload: typeof fileUpload;
  http: typeof http;
  labels: typeof labels;
  projects: typeof projects;
  stripe: typeof stripe;
  stripeActions: typeof stripeActions;
  tasks: typeof tasks;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
