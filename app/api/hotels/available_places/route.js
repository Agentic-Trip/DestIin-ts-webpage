import { NextResponse } from "next/server";

// ✅ Required for Vercel (prevents static build errors)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    // ✅ Read token safely
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      );
    }

    // ✅ Import server-only libs AT RUNTIME (VERY IMPORTANT)
    const jwt = await import("jsonwebtoken");
    const { User } = await import("@/lib/db/models");

    // ✅ Verify token
    const decoded = jwt.default.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded?.id) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 400 }
      );
    }

    // ✅ Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ✅ Update verification status
    user.isVerified = true;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (error) {
    console.error("Confirm email error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid or expired verification link"
      },
      { status: 400 }
    );
  }
}
