// Middleware for gas shop
// This is a public e-commerce site - no authentication required for most routes
// Admin routes can be protected separately if needed

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected routes (currently none - shop is fully public)
const protectedRoutes = ["/admin"];

export function middleware(request: NextRequest) {
  // Gas shop is fully public - allow all requests
  return NextResponse.next();
}

// Configure which routes the middleware applies to
export const config = {
  // Only run middleware on admin routes for potential future auth
  matcher: ["/admin/:path*"],
};
