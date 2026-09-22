import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type AuthCtx = QueryCtx | MutationCtx;

/**
 * Resolve the signed-in Convex user from Clerk identity (ctx.auth).
 * Do not trust client clerkId arguments for ranked or persist writes.
 */
export async function getAuthedUser(
  ctx: AuthCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

export async function requireAuthedUser(ctx: AuthCtx, clerkId?: string): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "Not authenticated. Frontend must wrap Convex with ConvexProviderWithClerk."
    );
  }

  if (clerkId !== undefined && identity.subject !== clerkId) {
    throw new Error("Account does not belong to the signed-in user.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found. Please sign in first.");
  }

  return user;
}

export async function requireIdentity(ctx: AuthCtx, clerkId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated.");
  if (identity.subject !== clerkId) {
    throw new Error("Account does not belong to the signed-in user.");
  }
  return identity;
}
